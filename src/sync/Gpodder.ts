import { } from '@tauri-apps/api'
import { GpodderUpdate, ProtocolFn, ServerGpodderUpdate, SubscriptionsUpdate } from '.'
import * as http from '@tauri-apps/plugin-http'

function getServerUrl(server: string) {
  const normalizedServer = /^https?:\/\//i.test(server.trim()) ? server.trim() : `https://${server.trim()}`
  return new URL(normalizedServer)
}

function buildApiUrl(server: string, apiPath: string) {
  const baseUrl = getServerUrl(server)
  const url = new URL(baseUrl.href)
  const basePath = baseUrl.pathname.replace(/\/+$/, '')
  url.pathname = `${basePath}${apiPath}`.replace(/\/{2,}/g, '/')
  return url
}

function encodeBase64Utf8(text: string) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function authHeader(user: string, password: string) {
  return 'Basic ' + encodeBase64Utf8(`${user}:${password}`)
}

export async function login(url: string, user: string, password: string): Promise<boolean> {
  if (!url.trim() || !user.trim() || !password) {
    throw new Error('Missing server, username, or password')
  }

  // just returns true if login was successful
  const loginUrl = buildApiUrl(url, `/api/2/auth/${encodeURIComponent(user)}/login.json`)

  const r = await http.fetch(loginUrl.href, {
    method: 'POST',
    headers: {
      Authorization: authHeader(user, password),
    },
  })

  return r.ok
}

export const gpodderProtocol: ProtocolFn = function (creds) {
  async function pullEpisodes(since?: number) {
    const { server, user, password } = creds

    const url = buildApiUrl(server, `/api/2/episodes/${encodeURIComponent(user)}.json`)

    if (since !== undefined) {
      url.searchParams.set('since', since.toString())
    }

    url.searchParams.set('aggregated', 'true')

    const r = await http.fetch(url.href, {
      method: 'GET',
      headers: {
        Authorization: authHeader(user, password),
        'Content-Type': 'application/json',
      },
    })

    const data: { actions: ServerGpodderUpdate[] } = await r.json()

    return data.actions.map((update: ServerGpodderUpdate) => ({
      ...update,
      timestamp: new Date(update.timestamp).getTime(), //timestamp in epoch format (server is in utc ISO format)
    }))
  }

  async function pullSubscriptions(since?: number): Promise<SubscriptionsUpdate> {
    const { server, user, password } = creds

    const url = buildApiUrl(server, `/api/2/subscriptions/${encodeURIComponent(user)}.json`)

    if (since !== undefined) {
      url.searchParams.set('since', since.toString())
    }

    const r = await http.fetch(url.href, {
      method: 'GET',
      headers: {
        Authorization: authHeader(user, password),
        'Content-Type': 'application/json',
      },
    })

    return r.json()
  }

  async function pushEpisodes(updates: GpodderUpdate[]) {
    const { server, user, password } = creds

    const url = buildApiUrl(server, `/api/2/episodes/${encodeURIComponent(user)}.json`)

    const r = await http.fetch(url.href, {
      method: 'POST',
      headers: {
        Authorization: authHeader(user, password),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        updates.map((update) => ({
          ...update,
          timestamp: new Date(update.timestamp).toISOString(),
        })),
      ),
    })

    if (!r.ok) {
      throw Error('Failed pushing episodes to gpodder server')
    }
  }

  async function pushSubscriptions(updates: SubscriptionsUpdate) {
    const { server, user, password } = creds

    const url = buildApiUrl(server, `/api/2/subscriptions/${encodeURIComponent(user)}/cardo.json`)

    const r = await http.fetch(url.href, {
      method: 'POST',
      headers: {
        Authorization: authHeader(user, password),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    if (!r.ok) {
      throw Error('Failed pushing subscriptions to gpodder server')
    }
  }

  return { login, pullEpisodes, pullSubscriptions, pushEpisodes, pushSubscriptions }
}
