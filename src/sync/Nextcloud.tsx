import { http, invoke, shell } from "@tauri-apps/api"
import { useEffect, useRef, useState } from "react"
import { DBContextProps, useDB } from "../DB"
import { getCreds, removeCreds, saveCreds } from "../utils"



export function NextcloudSettings() {
  const urlRef = useRef<HTMLInputElement>(null)
  const interval = useRef(0)
  const { misc: { getSyncKey, setSyncKey } } = useDB()
  const [error, setError] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    getCreds('nextcloud').then(r => {
      setLoggedIn(r !== undefined)
    })

    return () => clearInterval(interval.current)
  }, [])

  if (loggedIn) {
    return (
      <div className="flex flex-col gap-1 items-center">
        <h1 className="text-lg">Your are loged in</h1>
        <button className="bg-amber-600 w-fit px-4 hover:bg-amber-700 rounded-md p-1"
          onClick={async () => {
            removeCreds('nextcloud')
            setLoggedIn(false)
          }}
        >
          LOG OUT
        </button>
      </div>
    )
  }

  return (
    <form className="flex flex-col gap-1 items-center" onSubmit={async (e) => {
      e.preventDefault()
      if (urlRef.current) {
        try {
          interval.current = await login(urlRef.current.value, getSyncKey, setSyncKey, () => setLoggedIn(true))
          setError('')
        } catch (e) {
          setError('Error: ' + (e as Error).message)
        }
      }
    }}>
      <input
        type="text"
        className="py-1 px-2 bg-zinc-600 w-full rounded-md focus:outline-none"
        ref={urlRef}
        placeholder="NEXTCLOUD SERVER URL"
      />
      <button className="bg-amber-600 w-fit px-4 hover:bg-amber-700 rounded-md p-1">
        CONNECT
      </button>
      {error !== '' && <p className="text-red-700 font-bold">{error}</p>}
    </form>
  )
}

async function login(url: string, getSyncKey: () => Promise<string | undefined>,
  setSyncKey: (key: string) => Promise<void>, onSucess: () => void) {
  // nextcloud flow v2 o-auth login
  // https://docs.nextcloud.com/server/latest/developer_manual/client_apis/LoginFlow/index.html#login-flow-v2

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
  action: 'DOWNLOAD' |'PLAY' | 'DELETE' | 'NEW'
}

async function getNextcloudCreds(syncKey: string): Promise<{server: string, loginName: string, appPassword: string}> {
  const creds: any = await getCreds('nextcloud')

  const {server, loginName: encryptedLoginName, appPassword: encryptedAppPassword} = creds
  const loginName: string = await invoke('decrypt', {encryptedText: encryptedLoginName, base64Key: syncKey})
  const appPassword: string = await invoke('decrypt', {encryptedText: encryptedAppPassword, base64Key: syncKey})
  return {server: server, loginName: loginName, appPassword: appPassword}
}


async function pullUpdates(server: string, loginName: string, appPassword: string, since?: number): Promise<GpodderUpdate[]> {
  const url = server + `/index.php/apps/gpoddersync/episode_action?since=${(since === undefined) ? '0' : since?.toString()}`

  const r = await http.fetch(url, {
    method: 'GET',
    responseType: http.ResponseType.JSON,
    headers: {
      'OCS-APIRequest': 'true',
      'Authorization': 'Basic ' + btoa(loginName + ':' + appPassword)
    }
  })

  return (r.data as any).actions as GpodderUpdate[]
}

async function pushUpdates(server: string, loginName: string, appPassword: string, updates: GpodderUpdate[]) {
  const url = server + `/index.php/apps/gpoddersync/episode_action/create`

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

async function sync(syncKey: string, db: DBContextProps): Promise<void> {

  if (syncKey === '') return

  const {server, loginName, appPassword} = await getNextcloudCreds(syncKey)
  const lastSync = await db.misc.getLastSync()
  
  const serverUpdates = await pullUpdates(server, loginName, appPassword, lastSync / 1000 ) // nextcloud server uses seconds
  
  if (serverUpdates.length > 0){
    for (const update of serverUpdates) {
      const timestamp = new Date(update.timestamp + '+00:00').getTime() //timestamp in epoch format (server is in utc ISO format)
      
      if (update.action !== 'PLAY') continue
  
      await db.history.updateEpisodeState(
        update.episode,
        update.podcast,
        update.position,
        update.total,
        timestamp
      )
    }
  }


  const localUpdates = await db.history.getEpisodesStates(lastSync)

  const gpodderLocalUpdates: GpodderUpdate[] = localUpdates.map( update => {
    return {
      ...update,
      position: update.position,
      started: update.position,
      total: update.total,
      action: 'PLAY',
      timestamp: (new Date(update.timestamp)).toISOString().split('.')[0]
    }
  })

  await pushUpdates(server, loginName, appPassword, gpodderLocalUpdates)
}

enum SyncStatus {
  Standby,
  Synchronizing,
  Ok,
  Error
}

export function SyncButton() {
  const [status, setStatus] = useState<SyncStatus>(SyncStatus.Standby)
  const [error, setError] = useState('')
  const db = useDB()


  const performSync = async() => {
    if (status === SyncStatus.Synchronizing) return

    setError('')
    setStatus(SyncStatus.Synchronizing)

    try{
      await sync(await db.misc.getSyncKey() || '', db)
      await db.misc.setLastSync(Date.now())
      setStatus(SyncStatus.Ok)
    }catch (e) {
      setError(e as string)
      setStatus(SyncStatus.Error)
    }
  }


  return (
    <button className={`w-5 hover:text-amber-400 outline-none ${status === SyncStatus.Synchronizing && 'animate-[spin_2s_linear_infinite_reverse]'}`}
    onClick={performSync} title={error}
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