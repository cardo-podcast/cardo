import appIcon from '../../src-tauri/icons/icon.png'
import { SyntheticEvent } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { showMenu } from "tauri-plugin-context-menu";
import { PodcastData } from '..';
import { useDB } from '../DB/DB';
import { sync } from '../Icons'


export default function SubscriptionCard({ podcast, mini = false }: { podcast: PodcastData, mini?: boolean }) {
  const navigate = useNavigate()
  const { t } = useTranslation();
  const { subscriptions, subscriptionsEpisodes: { updatingFeeds } } = useDB()

  return (
    <div className={`p-1 rounded-md flex gap-2 ${mini ? 'justify-center' : 'justify-between hover:pl-2'} cursor-pointer hover:bg-primary-8 transition-all`}
      onClick={() => navigate('/preview', {
        state: {
          podcast
        }
      })}
      onContextMenu={() => {
        showMenu({
          items: [
            {
              label: t('remove_from_subscriptions'),
              event: async () => {
                await subscriptions.remove(podcast.feedUrl)
              },
            }
          ]
        })
      }}
    >
      <div className='relative h-10 aspect-square'>
        <img
          className={`h-10 aspect-square rounded-md ${mini ? 'hover:p-0.5' : ''}`}
          title={podcast.podcastName}
          src={podcast.coverUrl}
          alt=''
          onError={(e: SyntheticEvent<HTMLImageElement>) => e.currentTarget.src = appIcon}
        />
        {
          updatingFeeds !== null && updatingFeeds == podcast.id &&

          <div className='absolute flex z-10 w-10 bg-black bg-opacity-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 '>
            <span className='stroke-2 w-10 animate-[spin_1.5s_linear_reverse_infinite]'>
              {sync}
            </span>
          </div>
        }
      </div>
      {!mini && <p className=" h-10 text-sm w-full truncate">{podcast.podcastName}</p>}
    </div>
  )
}