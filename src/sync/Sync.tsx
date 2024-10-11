import { useDB } from '../DB/DB'
import { useSettings } from '../engines/Settings'
import { getCreds, parsePodcastDetails } from '../utils/utils'
import { useEffect, useState } from 'react'
import { GpodderUpdate, SyncProtocol, SyncStatus } from '.'
import { useNextcloud } from './Nextcloud'
import { SyncContext } from '../ContextProviders'

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>('standby')
  const [error, setError] = useState('')
  const {
    dbLoaded,
    misc: { setLastSync, getLastSync },
    history,
    subscriptions,
  } = useDB()
  const [loggedIn, setLoggedIn] = useState<SyncProtocol>(false)
  const [{ sync: syncSettings }] = useSettings()
  const provider = useNextcloud(loggedIn, setLoggedIn) // TODO this could be gpodder

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
    setError('')
    setStatus('synchronizing')

    try {
      const lastSync = (await getLastSync()) / 1000 // gpodder api uses seconds

      // #region subscriptions
      const subsServerUpdates: { add: string[]; remove: string[] } = await provider.pullUpdates('subscriptions', lastSync)
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
        await provider.pushUpdates('subscription_change', { add: [], remove: [], ...updateSubscriptions })
      }
      // #endregion

      // #region episodes
      const serverUpdates: { actions: GpodderUpdate[] } = await provider.pullUpdates('episode_action', lastSync)

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

      await provider.pushUpdates('episode_action', gpodderLocalUpdates)
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
