

export type SyncStatus = 'standby' | 'synchronizing' | 'ok' | 'error'

export interface GpodderUpdate {
  podcast: string
  episode: string
  position: number
  total: number
  timestamp: string
  action: 'DOWNLOAD' | 'PLAY' | 'DELETE' | 'NEW'
}