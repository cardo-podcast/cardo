

export type SyncStatus = 'standby' | 'synchronizing' | 'ok' | 'error'

export interface GpodderUpdate {
  podcast: string
  episode: string
  position: number
  total: number
  timestamp: string
  action: 'DOWNLOAD' | 'PLAY' | 'DELETE' | 'NEW'
}

export interface Credentials {
  protocol: SyncProtocol
  server: string,
  user: string,
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
  pullUpdates(request: string, since?: number): Promise<any>
  pushUpdates(request: string, updates: any): Promise<void>
}