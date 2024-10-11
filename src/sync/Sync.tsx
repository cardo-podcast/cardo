import { useDB } from '../DB/DB'
import { useSettings } from '../engines/Settings'
import { getCreds, parsePodcastDetails } from '../utils/utils'
import { useEffect, useRef, useState } from 'react'
import { Credentials, GpodderUpdate, ProtocolFn, SubscriptionsUpdate, SyncProtocol, SyncStatus } from '.'
import { SyncContext } from '../ContextProviders'
import { invoke } from '@tauri-apps/api'
import { nextcloudProtocol } from './Nextcloud'
import { gpodderProtocol } from './Gpodder'

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>('standby')
  const [error, setError] = useState('')
  const {
    dbLoaded,
    misc: { setLastSync, getLastSync, getSyncKey },
    history,
    subscriptions,
  } = useDB()
  const [loggedIn, setLoggedIn] = useState<SyncProtocol>(null)
  const [{ sync: syncSettings }] = useSettings()
  const provider = useRef<ReturnType<ProtocolFn>>()

  useEffect(() => {
    if (loggedIn === 'nextcloud') {
      getProviderCreds('nextcloud').then((creds) => {
        provider.current = nextcloudProtocol(creds)
      })
    } else if (loggedIn === 'gpodder') {
      getProviderCreds('gpodder').then((creds) => {
        provider.current = gpodderProtocol(creds)
      })
    }
  }, [loggedIn])

  async function getProviderCreds(protocol: Exclude<SyncProtocol, null>): Promise<Credentials> {
    const creds: any = await getCreds(protocol)
    const syncKey = await getSyncKey()

    const { server, loginName: encryptedLoginName, appPassword: encryptedAppPassword } = creds
    const loginName: string = await invoke('decrypt', { encryptedText: encryptedLoginName, base64Key: syncKey })
    const appPassword: string = await invoke('decrypt', { encryptedText: encryptedAppPassword, base64Key: syncKey })
    return { server: server, user: loginName, password: appPassword }
  }

  const load = async () => {
    if (await getCreds('nextcloud')) {
      setLoggedIn('nextcloud')
    } else if (await getCreds('gpodder')) {
      setLoggedIn('gpodder')
    }
  }

  useEffect(() => {
    dbLoaded && load()
  }, [dbLoaded])

  useEffect(() => {
    if (loggedIn && syncSettings.syncAfterAppStart) {
      sync()
    }
  }, [loggedIn])

  const sync = async (updateSubscriptions?: Partial<SubscriptionsUpdate>) => {
    if (!provider.current) return

    setError('')
    setStatus('synchronizing')

    try {
      const lastSync = Math.floor((await getLastSync()) / 1000) -600// gpodder api uses seconds


      // #region subscriptions
      const subsServerUpdates: SubscriptionsUpdate = await provider.current.pullSubscriptions(lastSync)
      const localSubscriptions = subscriptions.subscriptions.map((sub) => sub.feedUrl)

      // add new subscriptions
      for (const feedUrl of subsServerUpdates.add) {
        if (!localSubscriptions.includes(feedUrl)) {
          try {
            const podcastData = await parsePodcastDetails(feedUrl)
            subscriptions.add(podcastData)
          } catch (e) {
            console.error('Failed fetching podcast: ', feedUrl)
          }
        }
      }

      // remove subscriptions
      for (const feedUrl of subsServerUpdates.remove) {
        if (localSubscriptions.includes(feedUrl)) {
          subscriptions.remove(feedUrl)
        }
      }

      if (updateSubscriptions !== undefined) {
        await provider.current.pushSubscriptions({ add: [], remove: [], ...updateSubscriptions })
      }
      // #endregion

      // #region episodes
      const serverUpdates = await provider.current.pullEpisodes(lastSync)

      if (serverUpdates.length > 0) {
        for (const update of serverUpdates) {
          if (update.action.toUpperCase() !== 'PLAY') continue

          await history.update(update.episode, update.podcast, update.position, update.total, update.timestamp)
        }
      }

      const localUpdates = await history.getAll(lastSync * 1000)

      console.log(localUpdates)

      const gpodderLocalUpdates: GpodderUpdate[] = localUpdates.map((update) => ({
        ...update,
        position: update.position,
        started: update.position,
        total: update.total,
        action: 'PLAY',
        timestamp: update.timestamp,
      }))


      await provider.current.pushEpisodes(gpodderLocalUpdates)
      // #endregion

      await setLastSync(Date.now())
      setStatus('ok')
    } catch (e) {
      console.error(e)
      setError(e as string)
      setStatus('error')
    }
  }

  return (
    <SyncContext.Provider
      value={{
        status,
        error,
        sync,
        loggedIn,
        setLoggedIn,
      }}
    >
      {children}
    </SyncContext.Provider>
  )
}
