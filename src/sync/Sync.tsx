import { useTranslation } from 'react-i18next'
import { useDB } from '../DB/DB'
import { Checkbox } from '../components/Inputs'
import { useSettings } from '../engines/Settings'
import { getCreds, removeCreds } from '../utils/utils'
import { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { SyncStatus } from '.'
import { NextcloudSettings, sync } from './Nextcloud'

export function SyncSettings() {
  const {
    misc: { loggedInSync, setLoggedInSync },
  } = useDB()
  const [{ sync: syncSettings }, updateSettings] = useSettings()

  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 p-1">
      {loggedInSync && (
        <div className="flex items-center gap-2">
          <img className="h-24 shrink-0" src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Nextcloud_Logo.svg/141px-Nextcloud_Logo.svg.png" alt="Nextcloud logo" /> {/* TODO use proper image for gpodder */}
          <div className="flex flex-col gap-2">
            <p className="text-lg">{t('logged_in')}</p>
            <button
              className="w-fit rounded-md bg-accent-6 p-1 px-4 uppercase hover:bg-accent-7"
              onClick={async () => {
                removeCreds(loggedInSync)
                setLoggedInSync(false)
              }}
            >
              {t('log_out')}
            </button>
          </div>
        </div>
      )}

      {
        !loggedInSync &&

        <NextcloudSettings/>
      }

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
  const { status, error, performSync } = useSync()

  return (
    <button className={`w-6 outline-none hover:text-accent-4 ${status === 'synchronizing' && 'animate-[spin_2s_linear_infinite_reverse]'}`} onClick={() => performSync()} title={error == '' ? t('sync') : error}>
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
    misc: { getSyncKey, setLastSync, getLastSync, loggedInSync, setLoggedInSync },
    history,
    subscriptions,
  } = useDB()
  const [{ sync: syncSettings }, _] = useSettings()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const load = async () => {
    if (await getCreds('nextcloud')) {
      setLoggedInSync('nextcloud')
    } else if (await getCreds('gpodder')) {
      setLoggedInSync('gpodder')
    }
  }

  useEffect(() => {
    dbLoaded && load()
  }, [dbLoaded])

  useEffect(() => {
    if (loggedInSync && syncSettings.syncAfterAppStart) {
      performSync()
    }
  }, [loggedInSync])

  const performSync = async (updateSubscriptions?: { add?: string[]; remove?: string[] }) => {
    if (!loggedInSync) {
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

    if (status === 'synchronizing') return

    setError('')
    setStatus('synchronizing')

    try {
      const key = await getSyncKey()
      if (!key) {
        throw 'Error obtaining cipher key, please log-in again on Nextcloud'
      }

      await sync(key, history.update, getLastSync, history.getAll, subscriptions, updateSubscriptions) // TODO

      await setLastSync(Date.now())
      setStatus('ok')
    } catch (e) {
      console.error(e)
      setError(e as string)
      setStatus('error')
    }
  }

  return { status, error, performSync }
}

const SyncContext = createContext<ReturnType<typeof initSync> | undefined>(undefined)

export const useSync = () => useContext(SyncContext) as ReturnType<typeof initSync>

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const sync = initSync()

  return <SyncContext.Provider value={sync}>{children}</SyncContext.Provider>
}
