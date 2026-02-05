import { useSettings } from '../engines/Settings'
import { getCreds, parsePodcastDetails } from '../utils/utils'
import { useEffect, useRef, useState } from 'react'
import { Credentials, GpodderUpdate, ProtocolFn, SubscriptionsUpdate, SyncProtocol, SyncStatus } from '.'
import { SyncContext, useDB, usePlayer } from '../ContextProviders'
import { invoke } from '@tauri-apps/api/core'
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
  const provider = useRef<ReturnType<ProtocolFn>>(null)
  const { playing, reload } = usePlayer()

  async function initProvider(forceReinitialize = false) {
    if (!loggedIn) {
      provider.current = null
      return null
    }

    if (provider.current && !forceReinitialize) {
      return provider.current
    }

    if (loggedIn === 'nextcloud') {
      provider.current = await nextcloudProtocol(await getProviderCreds('nextcloud'))
    } else if (loggedIn === 'gpodder') {
      provider.current = await gpodderProtocol(await getProviderCreds('gpodder'))
    }

    return provider.current
  }

  async function logIn() {
    try {
      await initProvider(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
      return
    }

    if (loggedIn && syncSettings.syncAfterAppStart) {
      sync()
    }
  }

  useEffect(() => {
    logIn()
  }, [loggedIn])

  async function getProviderCreds(protocol: Exclude<SyncProtocol, null>): Promise<Credentials> {
    const creds: any = await getCreds(protocol)
    const syncKey = await getSyncKey()

    if (!creds) {
      throw new Error('Sync credentials missing. Please connect again.')
    }
    if (!syncKey) {
      throw new Error('Sync key missing. Please reconnect sync in settings.')
    }

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

  const sync = async (updateSubscriptions?: Partial<SubscriptionsUpdate>) => {
    try {
      const syncProvider = await initProvider()
      if (!syncProvider) {
        throw new Error('Not connected to a sync provider')
      }

      setError('')
      setStatus('synchronizing')

      const lastSync = Math.floor((await getLastSync()) / 1000) // gpodder api uses seconds

      // #region subscriptions
      const subsServerUpdates: SubscriptionsUpdate = await syncProvider.pullSubscriptions(lastSync)
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
        await syncProvider.pushSubscriptions({ add: [], remove: [], ...updateSubscriptions })
      }
      // #endregion

      // #region episodes
      const serverUpdates = await syncProvider.pullEpisodes(lastSync)

      if (serverUpdates.length > 0) {
        for (const update of serverUpdates) {
          if (update.action.toUpperCase() !== 'PLAY') continue

          await history.update(update.episode, update.podcast, update.position, update.total, update.timestamp)

          if (playing?.src === update.episode) {
            reload() // force reload episode
          }
        }
      }

      const localUpdates = await history.getAll(lastSync * 1000)

      const gpodderLocalUpdates: GpodderUpdate[] = localUpdates.map((update) => ({
        ...update,
        position: update.position,
        started: update.position,
        total: update.total,
        action: 'PLAY',
        timestamp: update.timestamp,
      }))

      await syncProvider.pushEpisodes(gpodderLocalUpdates)
      // #endregion

      await setLastSync(Date.now())
      setStatus('ok')
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : String(e))
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
