import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { showMenu } from 'tauri-plugin-context-menu'
import { PodcastData } from '..'
import { sync } from '../Icons'
import { useDB } from '../ContextProviders'
import { PodcastCover } from './Cover'

export default function SubscriptionCard({ podcast, mini = false }: { podcast: PodcastData; mini?: boolean }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    subscriptions,
    subscriptionsEpisodes: { fetchingFeeds },
  } = useDB()

  return (
    <div
      className={`flex gap-2 rounded-md p-1 ${mini ? 'justify-center' : 'justify-between hover:pl-2'} cursor-pointer transition-all hover:bg-primary-8`}
      onClick={() =>
        navigate('/preview', {
          state: {
            podcast,
          },
        })
      }
      onContextMenu={() => {
        showMenu({
          items: [
            {
              label: t('remove_from_subscriptions'),
              event: async () => {
                await subscriptions.remove(podcast.feedUrl)
              },
            },
          ],
        })
      }}
    >
      <div className="relative aspect-square h-10">
        <PodcastCover
          className={`aspect-square h-10 rounded-md ${mini ? 'hover:scale-95' : ''}`}
          title={podcast.podcastName}
          podcast={podcast}
        />
        {fetchingFeeds.includes(podcast.id!) && (
          <div className="absolute left-1/2 top-1/2 z-10 flex w-10 -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-20">
            <span className="w-10 animate-[spin_1.5s_linear_reverse_infinite] stroke-2">{sync}</span>
          </div>
        )}
      </div>
      {!mini && <p className="h-10 w-full truncate text-sm">{podcast.podcastName}</p>}
    </div>
  )
}
