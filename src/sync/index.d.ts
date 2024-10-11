import { set } from "lodash"


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
  server: string,
  user: string,
  password: string
}

export type SyncProtocol = 'nextcloud' | 'gpodder' | false

export interface SyncContextType {
  status: SyncStatus
  error: string
  sync: (updateSubscriptions?: { add?: string[]; remove?: string[] }) => Promise<void>
  loggedIn: SyncProtocol
  setLoggedIn: (value: SyncProtocol) => void
}