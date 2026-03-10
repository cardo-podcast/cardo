import { useDownloadsStore } from './Downloads'
import { useEpisodeStateStore } from './EpisodeState'
import { useMiscStore } from './Misc'
import { useQueueStore } from './Queue'
import { useSubscriptionsStore } from './Subscriptions'
import { useSubscriptionsEpisodesStore } from './SubscriptionsEpisodes'

export interface DB {
  subscriptions: ReturnType<typeof useSubscriptionsStore>
  subscriptionsEpisodes: ReturnType<typeof useSubscriptionsEpisodesStore>
  history: ReturnType<typeof useEpisodeStateStore>
  misc: ReturnType<typeof useMiscStore>
  queue: ReturnType<typeof useQueueStore>
  downloads: ReturnType<typeof useDownloadsStore>
}
