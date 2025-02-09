export type SyncStatus = 'standby' | 'synchronizing' | 'ok' | 'error'

export interface GpodderUpdate {
  podcast: string
  episode: string
  position: number
  total: number
  timestamp: number
  action: 'DOWNLOAD' | 'PLAY' | 'DELETE' | 'NEW'
}

export interface ServerGpodderUpdate extends GpodderUpdate {
  timestamp: string
}

export type SubscriptionsUpdate = { add: string[]; remove: string[] }

export interface Credentials {
  server: string
  user: string
  password: string
}

export type SyncProtocol = 'nextcloud' | 'gpodder' | null

export interface SyncContextType {
  status: SyncStatus
  error: string
  sync: (updateSubscriptions?: { add?: string[]; remove?: string[] }) => Promise<void>
  loggedIn: SyncProtocol
  setLoggedIn: (value: SyncProtocol) => void
}

export type ProtocolFn = (creds: Credentials) => {
  pullEpisodes(since?: number): Promise<GpodderUpdate[]>
  pullSubscriptions(since?: number): Promise<SubscriptionsUpdate>

  pushEpisodes(updates: GpodderUpdate[]): Promise<void>
  pushSubscriptions(updates: SubscriptionsUpdate): Promise<void>
}
