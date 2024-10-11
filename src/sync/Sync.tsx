import { useDB } from '../DB/DB'
import { useSettings } from '../engines/Settings'
import { getCreds, parsePodcastDetails } from '../utils/utils'
import { useEffect, useRef, useState } from 'react'
import { Credentials, GpodderUpdate, ProtocolFn, SyncProtocol, SyncStatus } from '.'
import { SyncContext } from '../ContextProviders'
import { invoke } from '@tauri-apps/api'
import { nextcloudProtocol } from './Nextcloud'

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
      getProviderCreds(loggedIn).then((creds) => {
        provider.current = nextcloudProtocol(creds)
      })
    } else if (loggedIn === 'gpodder') {
      getProviderCreds(loggedIn).then((creds) => {
        provider.current = nextcloudProtocol(creds)
      })
    }
  }, [loggedIn])

  async function getProviderCreds(protocol: Exclude<SyncProtocol, null>): Promise<Credentials> {
    const creds: any = await getCreds(protocol)
    const syncKey = await getSyncKey()

    const { server, loginName: encryptedLoginName, appPassword: encryptedAppPassword } = creds
    const loginName: string = await invoke('decrypt', { encryptedText: encryptedLoginName, base64Key: syncKey })
    const appPassword: string = await invoke('decrypt', { encryptedText: encryptedAppPassword, base64Key: syncKey })
    return { server: server, user: loginName, password: appPassword, protocol }
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

  const sync = async (updateSubscriptions?: { add?: string[]; remove?: string[] }) => {
    if (!provider.current) return

    setError('')
    setStatus('synchronizing')

    try {
      const lastSync = (await getLastSync()) / 1000 // gpodder api uses seconds

      // #region subscriptions
      const subsServerUpdates: { add: string[]; remove: string[] } = await provider.current.pullUpdates('subscriptions', lastSync)
      const localSubscriptions = subscriptions.subscriptions.map((sub) => sub.feedUrl)

      // add new subscriptions
      for (const feedUrl of subsServerUpdates.add) {
        if (!localSubscriptions.includes(feedUrl)) {
          const podcastData = await parsePodcastDetails(feedUrl)
          subscriptions.add(podcastData)
        }
      }

      // remove subscriptions
      for (const feedUrl of subsServerUpdates.remove) {
        if (localSubscriptions.includes(feedUrl)) {
          subscriptions.remove(feedUrl)
        }
      }

      if (updateSubscriptions !== undefined) {
        await provider.current.pushUpdates('subscription_change', { add: [], remove: [], ...updateSubscriptions })
      }
      // #endregion

      // #region episodes
      const serverUpdates: { actions: GpodderUpdate[] } = await provider.current.pullUpdates('episode_action', lastSync)

      if (serverUpdates.actions.length > 0) {
        for (const update of serverUpdates.actions) {
          const timestamp = new Date(update.timestamp + '+00:00').getTime() //timestamp in epoch format (server is in utc ISO format)
          if (update.action.toUpperCase() !== 'PLAY') continue

          await history.update(update.episode, update.podcast, update.position, update.total, timestamp)
        }
      }

      const localUpdates = await history.getAll(lastSync)

      const gpodderLocalUpdates: GpodderUpdate[] = localUpdates.map((update) => ({
        ...update,
        position: update.position,
        started: update.position,
        total: update.total,
        action: 'PLAY',
        timestamp: new Date(update.timestamp).toISOString().split('.')[0],
      }))

      await provider.current.pushUpdates('episode_action', gpodderLocalUpdates)
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
