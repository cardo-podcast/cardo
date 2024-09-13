import EpisodePreviewCard from "../components/EpisodePreviewCard";
import { useDB } from "../DB/DB";
import { useTranslation } from "react-i18next";
import EpisodeOverview from "../components/EpisodeOverview";
import appIcon from '../../src-tauri/icons/icon.png'
import { useSettings } from "../engines/Settings";
import { useEffect, useState } from "react";
import { NewEpisodeData } from "..";


function HomePage() {
  const { queue } = useDB()
  const { t } = useTranslation()
  const [newEpisodes, setNewEpisodes] = useState<NewEpisodeData[]>([])
  const {subscriptionsEpisodes, subscriptions} = useDB()
  const [{ general: { numberOfDaysInNews } }, _] = useSettings()

  const loadNewEpisodes = async () => {
    const minDate = Date.now() - (24 * 3600 * 1000 * numberOfDaysInNews)
    const episodes = await subscriptionsEpisodes.loadNew(minDate)

    episodes.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())

    setNewEpisodes(episodes)
  }

  useEffect(() => {
    // extract episodes newer than setting
    loadNewEpisodes()
  }, [numberOfDaysInNews, subscriptionsEpisodes.updatingFeeds, subscriptions.subscriptions])

  return (
    <div className="flex flex-col p-2 w-full h-fit gap-3 mt-1">
      {
        queue.queue.length > 0 &&

        <div>
        <h1 className="mb-1 uppercase">{t('queue')}</h1>
        <EpisodeOverview>
          {
            queue.queue.map(episode => (
              <EpisodePreviewCard key={episode.id} episode={episode} />
            ))
          }
        </EpisodeOverview>
      </div>

      }

      {
        newEpisodes.length > 0 &&

        <div>
          <h1 className="mb-1 uppercase">{t('news')}</h1>
          <EpisodeOverview>
            {
              newEpisodes.map(episode => (
                <EpisodePreviewCard key={episode.id} episode={episode} />
              ))
            }
          </EpisodeOverview>
        </div>
      }

      {
        // welcome message
        queue.queue.length === 0 && newEpisodes.length === 0 &&
        <div className="flex flex-col items-center gap-4 p-2 px-4">
                    <img
            className="w-36"
            src={appIcon}
          />
          <h1 className="text-center text-lg text-primary-3">{t('welcome_message')}</h1>
        </div>
      }

    </div>
  )
}

export default HomePage;