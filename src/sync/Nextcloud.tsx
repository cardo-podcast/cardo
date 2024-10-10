import { http, invoke, shell } from '@tauri-apps/api'
import { useEffect, useRef } from 'react'
import { useDB, DB } from '../DB/DB'
import { getCreds, parsePodcastDetails, saveCreds, toastError } from '../utils/utils'
import { useTranslation } from 'react-i18next'
import { EpisodeState } from '..'
import { GpodderUpdate } from '.'

export function NextcloudSettings() {
  const urlRef = useRef<HTMLInputElement>(null)
  const interval = useRef(0)
  const {
    misc: { getSyncKey, setSyncKey, setLoggedInSync: setLoggedIn },
  } = useDB()
  const { t } = useTranslation()

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
              interval.current = await login(urlRef.current.value, getSyncKey, setSyncKey, () => setLoggedIn('nextcloud'))
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

async function login(url: string, getSyncKey: () => Promise<string | undefined>, setSyncKey: (key: string) => Promise<void>, onSucess: () => void) {
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

    onSucess()
    clearInterval(interval)
  }, 1000)
  return interval
}

async function getNextcloudCreds(syncKey: string): Promise<{ server: string; loginName: string; appPassword: string }> {
  const creds: any = await getCreds('nextcloud')

  const { server, loginName: encryptedLoginName, appPassword: encryptedAppPassword } = creds
  const loginName: string = await invoke('decrypt', { encryptedText: encryptedLoginName, base64Key: syncKey })
  const appPassword: string = await invoke('decrypt', { encryptedText: encryptedAppPassword, base64Key: syncKey })
  return { server: server, loginName: loginName, appPassword: appPassword }
}

async function pullUpdates(server: string, request: string, loginName: string, appPassword: string, since?: number) {
  const url = server + `/index.php/apps/gpoddersync/${request}?since=${since === undefined ? '0' : since?.toString()}`

  const r: { data: any } = await http.fetch(url, {
    method: 'GET',
    responseType: http.ResponseType.JSON,
    headers: {
      'OCS-APIRequest': 'true',
      Authorization: 'Basic ' + btoa(loginName + ':' + appPassword),
    },
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
      Authorization: 'Basic ' + btoa(loginName + ':' + appPassword),
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

type updateEpisodeStateType = (episodeUrl: string, podcastUrl: string, position: number, total: number, timestamp?: number) => Promise<void>

export async function sync(syncKey: string, updateEpisodeState: updateEpisodeStateType, getLastSync: () => Promise<number>, getEpisodesStates: (timestamp?: number) => Promise<EpisodeState[]>, subscriptions: DB['subscriptions'], updateSubscriptions?: { add?: string[]; remove?: string[] }) {
  if (syncKey === '') return

  const { server, loginName, appPassword } = await getNextcloudCreds(syncKey)
  const lastSync = (await getLastSync()) / 1000 // nextcloud server uses seconds

  // #region subscriptions
  const subsServerUpdates: { add: string[]; remove: string[] } = await pullUpdates(server, 'subscriptions', loginName, appPassword, lastSync)
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
    await pushUpdates(server, 'subscription_change', loginName, appPassword, { add: [], remove: [], ...updateSubscriptions })
  }

  // #endregion

  const serverUpdates: { actions: GpodderUpdate[] } = await pullUpdates(server, 'episode_action', loginName, appPassword, lastSync)

  if (serverUpdates.actions.length > 0) {
    for (const update of serverUpdates.actions) {
      const timestamp = new Date(update.timestamp + '+00:00').getTime() //timestamp in epoch format (server is in utc ISO format)
      if (update.action !== 'PLAY') continue

      await updateEpisodeState(update.episode, update.podcast, update.position, update.total, timestamp)
    }
  }

  const localUpdates = await getEpisodesStates(lastSync)

  const gpodderLocalUpdates: GpodderUpdate[] = localUpdates.map((update) => {
    return {
      ...update,
      position: update.position,
      started: update.position,
      total: update.total,
      action: 'PLAY',
      timestamp: new Date(update.timestamp).toISOString().split('.')[0],
    }
  })

  await pushUpdates(server, 'episode_action', loginName, appPassword, gpodderLocalUpdates)
}
