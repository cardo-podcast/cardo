import {} from '@tauri-apps/api'
import { GpodderUpdate, ProtocolFn, ServerGpodderUpdate, SubscriptionsUpdate } from '.'
import * as http from '@tauri-apps/plugin-http'
import * as shell from '@tauri-apps/plugin-shell'

export async function login(url: string, onSucess: (user: string, password: string) => void) {
  // nextcloud flow v2 o-auth login
  // https://docs.nextcloud.com/server/latest/developer_manual/client_apis/LoginFlow/index.html#login-flow-v2

  const baseUrl = url.split('index.php')[0] // clean possible extra paths in url, cannot guess subpaths without index.php

  const r = await http.fetch(baseUrl + '/index.php/login/v2', {
    method: 'POST',
  })

  const {
    login,
    poll: { token, endpoint },
  } = (await r.json()) as { login: string; poll: { token: string; endpoint: string } }

  shell.open(login) // throw explorer with nextcloud login page

  // start polling for a sucessful response of nextcloud
  const interval = setInterval(async () => {
    const r = await http.fetch(endpoint, {
      method: 'POST',

      body: JSON.stringify({ token }),
    })

    if (!r.ok) return // poll again

    // get credentials from response
    const { loginName, appPassword } = (await r.json()) as { server: string; loginName: string; appPassword: string }

    onSucess(loginName, appPassword)
    clearInterval(interval)
  }, 1000)
  return interval
}

export const nextcloudProtocol: ProtocolFn = function (creds) {
  async function pullEpisodes(since?: number) {
    const { server, user, password } = creds

    const url =
      server + `/index.php/apps/gpoddersync/episode_action?since=${since === undefined ? '0' : since?.toString()}`

    const r: { json: () => Promise<{ actions: ServerGpodderUpdate[] }> } = await http.fetch(url, {
      method: 'GET',

      headers: {
        'OCS-APIRequest': 'true',
        Authorization: 'Basic ' + btoa(user + ':' + password),
      },
    })

    return (await r.json()).actions.map((update: ServerGpodderUpdate) => ({
      ...update,
      timestamp: new Date(update.timestamp + '+00:00').getTime(), //timestamp in epoch format (server is in utc ISO format)
    })) as GpodderUpdate[]
  }

  async function pullSubscriptions(since?: number) {
    const { server, user, password } = creds

    const url =
      server + `/index.php/apps/gpoddersync/subscriptions?since=${since === undefined ? '0' : since?.toString()}`

    const r: { json: () => Promise<SubscriptionsUpdate> } = await http.fetch(url, {
      method: 'GET',

      headers: {
        'OCS-APIRequest': 'true',
        Authorization: 'Basic ' + btoa(user + ':' + password),
      },
    })

    return r.json()
  }

  async function pushEpisodes(updates: GpodderUpdate[]) {
    const { server, user, password } = creds

    const url = server + `/index.php/apps/gpoddersync/episode_action/create`

    const r = await http.fetch(url, {
      method: 'POST',

      headers: {
        'OCS-APIRequest': 'true',
        Authorization: 'Basic ' + btoa(user + ':' + password),
      },
      body: JSON.stringify(
        updates.map((update) => ({
          ...update,
          timestamp: new Date(update.timestamp).toISOString().split('.')[0],
        })),
      ),
    })

    if (!r.ok) {
      throw Error('Failed pushing episodes to nextcloud server')
    }
  }

  async function pushSubscriptions(updates: SubscriptionsUpdate) {
    const { server, user, password } = creds

    const url = server + `/index.php/apps/gpoddersync/subscription_change/create`

    const r = await http.fetch(url, {
      method: 'POST',

      headers: {
        'OCS-APIRequest': 'true',
        Authorization: 'Basic ' + btoa(user + ':' + password),
      },
      body: JSON.stringify(updates),
    })

    if (!r.ok) {
      throw Error('Failed pushing subcriptions to nextcloud server')
    }
  }

  return { login, pullEpisodes, pullSubscriptions, pushEpisodes, pushSubscriptions }
}
