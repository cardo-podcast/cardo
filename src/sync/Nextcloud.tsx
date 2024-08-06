import { http, invoke, shell } from "@tauri-apps/api"
import { useEffect, useRef, useState } from "react"
import { useDB } from "../DB"
import { getCreds, removeCreds, saveCreds } from "../utils"
import * as icons from "../Icons"



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

export function SyncButton() {
  enum Status {
    Standby = 0,
    Syncing = 1,
    Ok = 2,
    Error = 3
  }
  const [status, setStatus] = useState<Status>(Status.Standby)

  


  return (
    <button className={`w-5 hover:text-amber-400 ${status === Status.Syncing && 'animate-[spin_2s_linear_infinite_reverse]'}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-refresh">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
        <circle cx="12" cy="12" r="2" fill={status === Status.Error ? 'red' : status === Status.Ok && 'green'} stroke="none" />
        <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
      </svg>
    </button>
  )
}