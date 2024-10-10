import { http, invoke, shell } from '@tauri-apps/api'
import { useEffect, useRef } from 'react'
import { useDB } from '../DB/DB'
import { getCreds, saveCreds, toastError } from '../utils/utils'
import { useTranslation } from 'react-i18next'
import { Credentials, SyncProtocol } from '.'
import { useSync } from './Sync'

export function NextcloudSettings() {
  const urlRef = useRef<HTMLInputElement>(null)
  const interval = useRef(0)
  const { t } = useTranslation()
  const { loggedIn, setLoggedIn } = useSync()
  const { login } = useNextcloud(loggedIn, setLoggedIn)

  useEffect(() => {
    return () => clearInterval(interval.current)
  }, [])

  return (
    <div className="flex h-full w-full gap-2 p-1">
      <img className="h-24 shrink-0" src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Nextcloud_Logo.svg/141px-Nextcloud_Logo.svg.png" alt="Nextcloud logo" />
      <form
        className="flex w-full flex-col items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (urlRef.current) {
            try {
              interval.current = await login(urlRef.current.value)
            } catch (e) {
              toastError((e as Error).message)
            }
          }
        }}
      >
        <label className="flex w-full flex-col gap-1">
          {t('nextcloud_server_url')}
          <input type="url" className="rounded-md bg-primary-8 px-2 py-1 focus:outline-none" ref={urlRef} placeholder={t('nextcloud_server_url_example')} />
        </label>

        <button className="w-fit rounded-md bg-accent-6 p-1 px-4 uppercase hover:bg-accent-7">{t('connect')}</button>
      </form>
    </div>
  )
}

export function useNextcloud(loggedIn: SyncProtocol, setLoggedIn: (value: SyncProtocol) => void) {
  const {
    misc: { getSyncKey, setSyncKey },
  } = useDB()
  const creds = useRef<Credentials>()

  useEffect(() => {
    if (loggedIn === 'nextcloud') {
      getNextcloudCreds().then((c) => {
        creds.current = c
      })
    }
  }, [loggedIn])

  async function getNextcloudCreds(): Promise<Credentials> {
    const creds: any = await getCreds('nextcloud')
    const syncKey = await getSyncKey()

    const { server, loginName: encryptedLoginName, appPassword: encryptedAppPassword } = creds
    const loginName: string = await invoke('decrypt', { encryptedText: encryptedLoginName, base64Key: syncKey })
    const appPassword: string = await invoke('decrypt', { encryptedText: encryptedAppPassword, base64Key: syncKey })
    return { server: server, user: loginName, password: appPassword }
  }

  async function login(url: string) {
    // nextcloud flow v2 o-auth login
    // https://docs.nextcloud.com/server/latest/developer_manual/client_apis/LoginFlow/index.html#login-flow-v2

    const baseUrl = url.split('index.php')[0] // clean possible extra paths in url, cannot guess subpaths without index.php

    const r = await http.fetch(baseUrl + '/index.php/login/v2', {
      method: 'POST',
      responseType: http.ResponseType.JSON,
    })

    const {
      login,
      poll: { token, endpoint },
    } = r.data as { login: string; poll: { token: string; endpoint: string } }

    shell.open(login) // throw explorer with nextcloud login page

    // start polling for a sucessful response of nextcloud
    const interval = setInterval(async () => {
      const r = await http.fetch(endpoint, {
        method: 'POST',
        responseType: http.ResponseType.JSON,
        body: {
          type: 'Json',
          payload: {
            token: token,
          },
        },
      })

      if (!r.ok) return // poll again

      // get credentials from response
      const { loginName, appPassword } = r.data as { server: string; loginName: string; appPassword: string }

      /// Encrypt credentials before saving ///

      // get key from db
      let key = await getSyncKey()

      if (key === undefined) {
        const key: string = await invoke('generate_key')
        setSyncKey(key)
      }

      // encrypt user and password with keys and save credentials
      saveCreds('nextcloud', {
        server: baseUrl,
        loginName: await invoke('encrypt', { text: loginName, base64Key: key }),
        appPassword: await invoke('encrypt', { text: appPassword, base64Key: key }),
      })

      setLoggedIn('nextcloud')
      clearInterval(interval)
    }, 1000)
    return interval
  }

  async function pullUpdates(request: string, since?: number) {
    if (!creds.current) return

    const { server, user, password } = creds.current

    const url = server + `/index.php/apps/gpoddersync/${request}?since=${since === undefined ? '0' : since?.toString()}`

    const r: { data: any } = await http.fetch(url, {
      method: 'GET',
      responseType: http.ResponseType.JSON,
      headers: {
        'OCS-APIRequest': 'true',
        Authorization: 'Basic ' + btoa(user + ':' + password),
      },
    })

    return r.data
  }

  async function pushUpdates(request: string, updates: any) {
    if (!creds.current) return

    const { server, user, password } = creds.current

    const url = server + `/index.php/apps/gpoddersync/${request}/create`

    const r = await http.fetch(url, {
      method: 'POST',
      responseType: http.ResponseType.JSON,
      headers: {
        'OCS-APIRequest': 'true',
        Authorization: 'Basic ' + btoa(user + ':' + password),
      },
      body: {
        type: 'Json',
        payload: updates,
      },
    })

    if (!r.ok) {
      throw Error('Failed pushing data to nextcloud server')
    }
  }

  return { login, pushUpdates, pullUpdates }
}
