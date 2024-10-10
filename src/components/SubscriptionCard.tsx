import appIcon from '../../src-tauri/icons/icon.png'
import { SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { showMenu } from 'tauri-plugin-context-menu'
import { PodcastData } from '..'
import { useDB } from '../DB/DB'
import { sync } from '../Icons'

export default function SubscriptionCard({ podcast, mini = false }: { podcast: PodcastData; mini?: boolean }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    subscriptions,
    subscriptionsEpisodes: { updatingFeeds },
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
        <img className={`aspect-square h-10 rounded-md ${mini ? 'hover:p-0.5' : ''}`} title={podcast.podcastName} src={podcast.coverUrl} alt="" onError={(e: SyntheticEvent<HTMLImageElement>) => (e.currentTarget.src = appIcon)} />
        {updatingFeeds !== null && updatingFeeds == podcast.id && (
          <div className="absolute left-1/2 top-1/2 z-10 flex w-10 -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-20">
            <span className="w-10 animate-[spin_1.5s_linear_reverse_infinite] stroke-2">{sync}</span>
          </div>
        )}
      </div>
      {!mini && <p className="h-10 w-full truncate text-sm">{podcast.podcastName}</p>}
    </div>
  )
}
