import { useTranslation } from 'react-i18next'
import { useDB } from '../DB/DB'
import { Checkbox } from '../components/Inputs'
import { useSettings } from '../engines/Settings'
import { getCreds, parsePodcastDetails, removeCreds } from '../utils/utils'
import { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { GpodderUpdate, SyncProtocol, SyncStatus } from '.'
import { NextcloudSettings, useNextcloud } from './Nextcloud'

export function SyncSettings() {
  const [{ sync: syncSettings }, updateSettings] = useSettings()
  const { loggedIn, setLoggedIn } = useSync()

  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 p-1">
      {loggedIn && (
        <div className="flex items-center gap-2">
          <img className="h-24 shrink-0" src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Nextcloud_Logo.svg/141px-Nextcloud_Logo.svg.png" alt="Nextcloud logo" /> {/* TODO use proper image for gpodder */}
          <div className="flex flex-col gap-2">
            <p className="text-lg">{t('logged_in')}</p>
            <button
              className="w-fit rounded-md bg-accent-6 p-1 px-4 uppercase hover:bg-accent-7"
              onClick={async () => {
                removeCreds(loggedIn)
                setLoggedIn(false)
              }}
            >
              {t('log_out')}
            </button>
          </div>
        </div>
      )}

      {!loggedIn && <NextcloudSettings />}

      {/* SYNC BEHAVIOUR SETTINGS */}
      <div className="flex flex-col gap-1">
        <h2 className="uppercase">{t('automatic_sync')}</h2>
        <div className="flex gap-3">
          <label className="flex w-fit gap-1">
            {t('when_opening_app')}:
            <Checkbox defaultChecked={syncSettings.syncAfterAppStart} onChange={(value) => updateSettings({ sync: { syncAfterAppStart: value } })} />
          </label>
          <label className="flex w-fit gap-1">
            {t('when_closing_app')}:
            <Checkbox defaultChecked={syncSettings.syncBeforeAppClose} onChange={(value) => updateSettings({ sync: { syncBeforeAppClose: value } })} />
          </label>
        </div>
      </div>
    </div>
  )
}

export function SyncButton() {
  const { t } = useTranslation()
  const { status, error, sync, loggedIn } = useSync()
  const navigate = useNavigate()

  function handleClick() {
    if (!loggedIn) {
      toast.info(t('not_logged_sync'), {
        position: 'top-center',
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'dark',
      })
      navigate('/settings')
      return
    }

    status != 'synchronizing' && sync()
  }

  return (
    <button className={`w-6 outline-none hover:text-accent-4 ${status === 'synchronizing' && 'animate-[spin_2s_linear_infinite_reverse]'}`} onClick={handleClick} title={error == '' ? t('sync') : error}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-refresh">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
        <circle cx="12" cy="12" r="2" fill={status === 'error' ? 'red' : status === 'ok' ? 'green' : 'none'} stroke="none" />
        <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
      </svg>
    </button>
  )
}

export function initSync() {
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

  return { status, error, sync, loggedIn, setLoggedIn }
}

const SyncContext = createContext<ReturnType<typeof initSync> | undefined>(undefined)

export const useSync = () => useContext(SyncContext) as ReturnType<typeof initSync>

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const sync = initSync()

  return <SyncContext.Provider value={sync}>{children}</SyncContext.Provider>
}
