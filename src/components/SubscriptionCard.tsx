import appIcon from '../../src-tauri/icons/icon.png'
import { SyntheticEvent } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { showMenu } from "tauri-plugin-context-menu";
import { PodcastData } from '..';
import { useDB } from '../engines/DB';


export default function SubscriptionCard({podcast}: {podcast: PodcastData}){
  const navigate = useNavigate()
  const { t } = useTranslation();
  const { subscriptions: {deleteSubscription, reloadSubscriptions} } = useDB()

  return(
    <div className="p-1 rounded-md flex gap-2 justify-between cursor-pointer hover:bg-primary-8 hover:pl-2 transition-all"
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
      className="h-10 bg-primary-7 aspect-square rounded-md"
      src={podcast.coverUrl}
      alt=''
      onError={(e: SyntheticEvent<HTMLImageElement>) => e.currentTarget.src = appIcon}
    />
    <p className=" h-10 text-sm w-full truncate">{podcast.podcastName}</p>
  </div>
  )
}