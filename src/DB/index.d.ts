import { useDownloads } from './Downloads'
import { useEpisodeState } from './History'
import { useMisc } from './Misc'
import { useQueue } from './Queue'
import { useSubscriptions } from './Subscriptions'
import { useSubscriptionsEpisodes } from './SubscriptionsEpisodes'

export interface DB {
  dbLoaded: boolean
  subscriptions: ReturnType<typeof useSubscriptions>
  subscriptionsEpisodes: ReturnType<typeof useSubscriptionsEpisodes>
  history: ReturnType<typeof useEpisodeState>
  misc: ReturnType<typeof useMisc>
  queue: ReturnType<typeof useQueue>
  downloads: ReturnType<typeof useDownloads>
}
