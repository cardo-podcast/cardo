import appIcon from '../../src-tauri/icons/icon.png'
import { SyntheticEvent } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { showMenu } from "tauri-plugin-context-menu";
import { PodcastData } from '..';
import { useDB } from '../engines/DB';


export default function SubscriptionCard({podcast, mini=false}: {podcast: PodcastData, mini?: boolean}){
  const navigate = useNavigate()
  const { t } = useTranslation();
  const { subscriptions: {deleteSubscription, reloadSubscriptions} } = useDB()

  return(
    <div className={`p-1 rounded-md flex gap-2 ${mini? 'justify-center': 'justify-between hover:pl-2'} cursor-pointer hover:bg-primary-8 transition-all`}
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
            event: async() => {
              await deleteSubscription(podcast.feedUrl)
              reloadSubscriptions()
            },
          }
        ]
        })}}
  >
    <img
      className={`h-10 aspect-square rounded-md ${mini? 'hover:p-0.5': ''}`}
      title={podcast.podcastName}
      src={podcast.coverUrl}
      alt=''
      onError={(e: SyntheticEvent<HTMLImageElement>) => e.currentTarget.src = appIcon}
    />
    {!mini && <p className=" h-10 text-sm w-full truncate">{podcast.podcastName}</p>}
  </div>
  )
}