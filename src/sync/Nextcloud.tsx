import { http, shell } from "@tauri-apps/api"
import { useEffect, useRef } from "react"




export function NextcloudSettings() {
  const urlRef = useRef<HTMLInputElement>(null)
  const interval = useRef(0)

  useEffect(() => {
    return () => clearInterval(interval.current)
  }, [])

  return (
    <div>
      <form className="flex flex-col" onSubmit={async (e) => {
        e.preventDefault()
        if (urlRef.current) {
          interval.current = await login(urlRef.current.value)
        }
      }}>
        <label>
          NEXTCLOUD SERVER URL: 
          <input
            type="text"
            className="py-1 px-2 bg-zinc-600 w-full rounded-md focus:outline-none"
            ref={urlRef}
            placeholder="URL"
          />
        </label>
        <button className="bg-zinc-700 hover:bg-zinc-600 rounded-md p-1">
          CONNECT
        </button>
      </form>
    </div>
  )
}

async function login(url: string) {
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
    const {loginName, appPassword} = r.data as {server: string, loginName: string, appPassword: string}

    //Do something with creds

    clearInterval(interval)
  }, 1000)
  return interval
}