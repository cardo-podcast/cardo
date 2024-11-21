import { createContext, useContext } from 'react'
import { SyncContextType } from './sync'
import { DB } from './DB'
import { AudioPlayerRef } from './components/AudioPlayer'

export const SyncContext = createContext<SyncContextType | null>(null)
export const useSync = () => useContext(SyncContext) as SyncContextType

export const DBContext = createContext<DB | undefined>(undefined)
export const useDB = () => useContext(DBContext) as DB

export const PlayerContext = createContext<AudioPlayerRef | undefined>(undefined)
export const usePlayer = () => useContext(PlayerContext) as AudioPlayerRef