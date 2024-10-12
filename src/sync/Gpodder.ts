import { http } from '@tauri-apps/api'
import { GpodderUpdate, ProtocolFn, ServerGpodderUpdate, SubscriptionsUpdate } from '.'

export async function login(url: string, user: string, password: string): Promise<boolean> {
  // just eturns true if login was successful
  const loginUrl = new URL(url)
  loginUrl.pathname = `api/2/auth/${user}/login.json`

  const r = await http.fetch(loginUrl.href, {
    method: 'POST',
    responseType: http.ResponseType.JSON,
    headers: {
      Authorization: 'Basic ' + btoa(user + ':' + password),
    },
  })

  return r.ok
}

export const gpodderProtocol: ProtocolFn = function (creds) {
  async function pullEpisodes(since?: number) {
    const { server, user, password } = creds

    const url = new URL(server)
    url.pathname = `api/2/episodes/${user}.json`

    if (since !== undefined) {
      url.searchParams.set('since', since.toString())
    }

    url.searchParams.set('aggregated', 'true')

    const r: { data: { actions: ServerGpodderUpdate[] } } = await http.fetch(url.href, {
      method: 'GET',
      responseType: http.ResponseType.JSON,
      headers: {
        Authorization: 'Basic ' + btoa(user + ':' + password),
        'Content-Type': 'application/json',
      },
    })

    return r.data.actions.map((update: ServerGpodderUpdate) => ({
      ...update,
      timestamp: new Date(update.timestamp).getTime(), //timestamp in epoch format (server is in utc ISO format)
    }))
  }

  async function pullSubscriptions(since?: number) {
    const { server, user, password } = creds

    const url = new URL(server)
    url.pathname = `api/2/subscriptions/${user}/all.json`

    if (since !== undefined) {
      url.searchParams.set('since', since.toString())
    }

    const r: { data: SubscriptionsUpdate } = await http.fetch(url.href, {
      method: 'GET',
      responseType: http.ResponseType.JSON,
      headers: {
        Authorization: 'Basic ' + btoa(user + ':' + password),
        'Content-Type': 'application/json',
      },
    })

    return r.data
  }

  async function pushEpisodes(updates: GpodderUpdate[]) {
    const { server, user, password } = creds

    const url = new URL(server)
    url.pathname = `api/2/episodes/${user}.json`

    const r = await http.fetch(url.href, {
      method: 'POST',
      responseType: http.ResponseType.JSON,
      headers: {
        Authorization: 'Basic ' + btoa(user + ':' + password),
        'Content-Type': 'application/json',
      },
      body: {
        type: 'Json',
        payload: updates.map((update) => ({
          ...update,
          timestamp: new Date(update.timestamp).toISOString(),
        })),
      },
    })

    if (!r.ok) {
      throw Error('Failed pushing episodes to gpodder server')
    }
  }

  async function pushSubscriptions(updates: SubscriptionsUpdate) {
    const { server, user, password } = creds

    const url = new URL(server)
    url.pathname = `api/2/subscriptions/${user}/cardo.json`

    const r = await http.fetch(url.href, {
      method: 'POST',
      responseType: http.ResponseType.JSON,
      headers: {
        Authorization: 'Basic ' + btoa(user + ':' + password),
        'Content-Type': 'application/json',
      },
      body: {
        type: 'Json',
        payload: updates,
      },
    })

    if (!r.ok) {
      throw Error('Failed pushing subscriptions to gpodder server')
    }
  }

  return { login, pullEpisodes, pullSubscriptions, pushEpisodes, pushSubscriptions }
}
