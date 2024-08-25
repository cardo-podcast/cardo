import { http, invoke, shell } from "@tauri-apps/api"
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react"
import { useDB, DB } from "../DB"
import { getCreds, parsePodcastDetails, removeCreds, saveCreds } from "../utils"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from 'react-toastify';
import { EpisodeState } from ".."
import { Checkbox } from "../components/Inputs"
import { useSettings } from "../Settings"


export function NextcloudSettings() {
  const urlRef = useRef<HTMLInputElement>(null)
  const interval = useRef(0)
  const { sync: { getSyncKey, setSyncKey, loggedInSync: loggedIn, setLoggedInSync: setLoggedIn } } = useDB()
  const { t } = useTranslation()
  const [{ sync: syncSettings }, updateSettings] = useSettings()

  useEffect(() => {
    getCreds('nextcloud').then(r => {
      setLoggedIn(r !== undefined)
    })

    return () => clearInterval(interval.current)
  }, [])

  if (loggedIn) {
    return (
      <div className="flex flex-col gap-3 p-1">
        <div className="flex gap-2 items-center">
          <p className="text-lg">{t('logged_in')}:</p>
          <button className="uppercase bg-accent-6 w-fit px-4 hover:bg-accent-7 rounded-md p-1"
            onClick={async () => {
              removeCreds('nextcloud')
              setLoggedIn(false)
            }}
          >
            {t('log_out')}
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="uppercase">{t('automatic_sync')}</h2>
          <div className="flex gap-3">
            <label className="w-fit flex gap-1">
              {t('when_opening_app')}:
              <Checkbox defaultChecked={syncSettings.syncAfterAppStart}
                onChange={(value) => updateSettings({ sync: { syncAfterAppStart: value } })} />
            </label>
            <label className="w-fit flex gap-1">
              {t('when_closing_app')}:
              <Checkbox defaultChecked={syncSettings.syncBeforeAppClose}
                onChange={(value) => updateSettings({ sync: { syncBeforeAppClose: value } })} />
            </label>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-1">
      <form className="flex flex-col gap-2 items-center" onSubmit={async (e) => {
        e.preventDefault()
        if (urlRef.current) {
          try {
            interval.current = await login(urlRef.current.value, getSyncKey, setSyncKey, () => setLoggedIn(true))
          } catch (e) {
            toast.error((e as Error).message, {
              position: "top-center",
              autoClose: 3000,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "dark",
            });
          }
        }
      }}>
        <label className="w-full flex gap-1 flex-col">
          {t('nextcloud_server_url')}
          <input
            type="text"
            className="py-1 px-2 bg-primary-8 rounded-md focus:outline-none"
            ref={urlRef}
            placeholder={t('nextcloud_server_url_example')}
          />
        </label>

        <button className="uppercase bg-accent-6 w-fit px-4 hover:bg-accent-7 rounded-md p-1">
          {t('connect')}
        </button>
      </form>
    </div>
  )
}

async function login(url: string, getSyncKey: () => Promise<string | undefined>,
  setSyncKey: (key: string) => Promise<void>, onSucess: () => void) {
  // nextcloud flow v2 o-auth login
  // https://docs.nextcloud.com/server/latest/developer_manual/client_apis/LoginFlow/index.html#login-flow-v2

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }

  const baseUrl = new URL(url).origin
  const r = await http.fetch(baseUrl + '/index.php/login/v2', {
    method: 'POST',
    responseType: http.ResponseType.JSON
  })

  const { login, poll: { token, endpoint } } = r.data as { login: string, poll: { token: string, endpoint: string } }

  shell.open(login) // throw explorer with nextcloud login page

  // start polling for a sucessful response of nextcloud
  const interval = setInterval(async () => {
    const r = await http.fetch(endpoint, {
      method: 'POST',
      responseType: http.ResponseType.JSON,
      body: {
        type: 'Json',
        payload: {
          token: token
        }
      }
    })

    if (!r.ok) return // poll again

    // get credentials from response
    const { loginName, appPassword } = r.data as { server: string, loginName: string, appPassword: string }

    /// Encrypt credentials before saving ///

    // get key from db
    let key = await getSyncKey()

    if (key === undefined) {
      const key: string = await invoke('generate_key')
      setSyncKey(key)
    }

    // encrypt user and password with keys and save credentials
    saveCreds('nextcloud',
      {
        server: baseUrl,
        loginName: await invoke('encrypt', { text: loginName, base64Key: key }),
        appPassword: await invoke('encrypt', { text: appPassword, base64Key: key })
      }
    )

    onSucess()
    clearInterval(interval)
  }, 1000)
  return interval
}

interface GpodderUpdate {
  podcast: string,
  episode: string,
  position: number,
  total: number,
  timestamp: string
  action: 'DOWNLOAD' | 'PLAY' | 'DELETE' | 'NEW'
}

async function getNextcloudCreds(syncKey: string): Promise<{ server: string, loginName: string, appPassword: string }> {
  const creds: any = await getCreds('nextcloud')

  const { server, loginName: encryptedLoginName, appPassword: encryptedAppPassword } = creds
  const loginName: string = await invoke('decrypt', { encryptedText: encryptedLoginName, base64Key: syncKey })
  const appPassword: string = await invoke('decrypt', { encryptedText: encryptedAppPassword, base64Key: syncKey })
  return { server: server, loginName: loginName, appPassword: appPassword }
}


async function pullUpdates(server: string, request: string, loginName: string, appPassword: string, since?: number) {
  const url = server + `/index.php/apps/gpoddersync/${request}?since=${(since === undefined) ? '0' : since?.toString()}`

  const r: { data: any } = await http.fetch(url, {
    method: 'GET',
    responseType: http.ResponseType.JSON,
    headers: {
      'OCS-APIRequest': 'true',
      'Authorization': 'Basic ' + btoa(loginName + ':' + appPassword)
    }
  })

  return r.data
}

async function pushUpdates(server: string, request: string, loginName: string, appPassword: string, updates: any) {
  const url = server + `/index.php/apps/gpoddersync/${request}/create`

  const r = await http.fetch(url, {
    method: 'POST',
    responseType: http.ResponseType.JSON,
    headers: {
      'OCS-APIRequest': 'true',
      'Authorization': 'Basic ' + btoa(loginName + ':' + appPassword)
    },
    body: {
      type: 'Json',
      payload: updates
    }
  })

  if (!r.ok) {
    throw Error('Failed pushing data to nextcloud server')
  }
}


type updateEpisodeStateType = (episodeUrl: string, podcastUrl: string, position: number, total: number, timestamp?: number,) => Promise<void>

async function sync(syncKey: string, updateEpisodeState: updateEpisodeStateType,
  getLastSync: () => Promise<number>,
  getEpisodesStates: (timestamp?: number) => Promise<EpisodeState[]>,
  subscriptions: DB['subscriptions'],
  updateSubscriptions?: { add?: string[], remove?: string[] }
) {

  if (syncKey === '') return

  const { server, loginName, appPassword } = await getNextcloudCreds(syncKey)
  const lastSync = await getLastSync() / 1000 // nextcloud server uses seconds


  // #region subscriptions
  const subsServerUpdates: { add: string[], remove: string[] } = await pullUpdates(server, 'subscriptions', loginName, appPassword, lastSync)
  const localSubscriptions = subscriptions.subscriptions.map(sub => sub.feedUrl)


  // add new subscriptions
  for (const feedUrl of subsServerUpdates.add) {
    if (!localSubscriptions.includes(feedUrl)) {
      const podcastData = await parsePodcastDetails(feedUrl)
      subscriptions.addSubscription(podcastData)
    }
  }


  // remove subscriptions
  for (const feedUrl of subsServerUpdates.remove) {
    if (localSubscriptions.includes(feedUrl)) {
      subscriptions.deleteSubscription(feedUrl)
    }
  }

  if (updateSubscriptions !== undefined) {
    await pushUpdates(server, 'subscription_change', loginName, appPassword, { add: [], remove: [], ...updateSubscriptions })
  }


  subscriptions.reloadSubscriptions()
  // #endregion


  const serverUpdates: { actions: GpodderUpdate[] } = await pullUpdates(server, 'episode_action', loginName, appPassword, lastSync)

  if (serverUpdates.actions.length > 0) {
    for (const update of serverUpdates.actions) {
      const timestamp = new Date(update.timestamp + '+00:00').getTime() //timestamp in epoch format (server is in utc ISO format)
      if (update.action !== 'PLAY') continue

      await updateEpisodeState(
        update.episode,
        update.podcast,
        update.position,
        update.total,
        timestamp
      )
    }
  }


  const localUpdates = await getEpisodesStates(lastSync)

  const gpodderLocalUpdates: GpodderUpdate[] = localUpdates.map(update => {
    return {
      ...update,
      position: update.position,
      started: update.position,
      total: update.total,
      action: 'PLAY',
      timestamp: (new Date(update.timestamp)).toISOString().split('.')[0]
    }
  })

  await pushUpdates(server, 'episode_action', loginName, appPassword, gpodderLocalUpdates)
}

enum SyncStatus {
  Standby,
  Synchronizing,
  Ok,
  Error
}


export function initSync() {
  const [status, setStatus] = useState<SyncStatus>(SyncStatus.Standby)
  const [error, setError] = useState('')
  const { dbLoaded, sync: { getSyncKey, setLastSync, getLastSync, loggedInSync: loggedIn, setLoggedInSync: setLoggedIn },
    history: { updateEpisodeState, getEpisodesStates }, subscriptions } = useDB()
  const navigate = useNavigate()
  const [{ sync: syncSettings }, _] = useSettings()
  const { t } = useTranslation()


  const load = async () => {
    const creds = await getCreds('nextcloud')
    setLoggedIn(creds !== undefined)
  }

  useEffect(() => {
    dbLoaded && load()
  }, [dbLoaded])

  useEffect(() => {
    if (loggedIn && syncSettings.syncAfterAppStart) {
      performSync()
    }
  }, [loggedIn])


  const performSync = async (updateSubscriptions?: { add?: string[], remove?: string[] }) => {


    if (!loggedIn) {
      toast.info(t('not_logged_sync'), {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });
      navigate('/settings')
      return
    }

    if (status === SyncStatus.Synchronizing) return

    setError('')
    setStatus(SyncStatus.Synchronizing)

    try {
      const key = await getSyncKey()
      if (!key) {
        throw 'Error obtaining cipher key, please log-in again on Nextcloud'
      }

      await sync(key, updateEpisodeState, getLastSync, getEpisodesStates, subscriptions, updateSubscriptions)

      await setLastSync(Date.now())
      setStatus(SyncStatus.Ok)
    } catch (e) {
      console.error(e)
      setError(e as string)
      setStatus(SyncStatus.Error)
    }
  }

  return { status, error, performSync }
}


export function SyncButton() {
  const { t } = useTranslation()
  const {status, error, performSync} = useSync()


  return (
    <button className={`w-6 hover:text-accent-4 outline-none ${status === SyncStatus.Synchronizing && 'animate-[spin_2s_linear_infinite_reverse]'}`}
      onClick={() => performSync()} title={error == '' ? t('sync') : error}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-refresh">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
        <circle cx="12" cy="12" r="2" fill={status === SyncStatus.Error ? 'red' : status === SyncStatus.Ok ? 'green' : 'none'} stroke="none" />
        <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
      </svg>
    </button>
  )
}


const SyncContext = createContext<ReturnType<typeof initSync> | undefined>(undefined)

export const useSync = () => useContext(SyncContext) as ReturnType<typeof initSync>

export function SyncProvider({ children }: { children: ReactNode }) {
  const sync = initSync()

  return (
    <SyncContext.Provider value={sync}>
      {children}
    </SyncContext.Provider>
  )
}