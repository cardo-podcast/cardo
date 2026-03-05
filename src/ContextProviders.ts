import { createContext, useContext } from 'react'
import { SyncContextType } from './sync'
import { DB } from './DB'
import { AudioPlayerRef } from '.'

export const SyncContext = createContext<SyncContextType | null>(null)
export const useSync = () => useContext(SyncContext) as SyncContextType

export const SubscriptionsContext = createContext<DB['subscriptions'] | undefined>(undefined)
export const useSubscriptions = () => useContext(SubscriptionsContext) as DB['subscriptions']

export const SubscriptionsEpisodesContext = createContext<DB['subscriptionsEpisodes'] | undefined>(undefined)
export const useSubscriptionsEpisodes = () => useContext(SubscriptionsEpisodesContext) as DB['subscriptionsEpisodes']

export const QueueContext = createContext<DB['queue'] | undefined>(undefined)
export const useQueue = () => useContext(QueueContext) as DB['queue']

export const DownloadsContext = createContext<DB['downloads'] | undefined>(undefined)
export const useDownloads = () => useContext(DownloadsContext) as DB['downloads']

export const HistoryContext = createContext<DB['history'] | undefined>(undefined)
export const useHistory = () => useContext(HistoryContext) as DB['history']

export const MiscContext = createContext<DB['misc'] | undefined>(undefined)
export const useMisc = () => useContext(MiscContext) as DB['misc']

export const PlayerContext = createContext<AudioPlayerRef | undefined>(undefined)
export const usePlayer = () => useContext(PlayerContext) as AudioPlayerRef

export const PlayerPositionContext = createContext<number>(0)
export const usePlayerPosition = () => useContext(PlayerPositionContext)
