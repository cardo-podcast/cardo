import EpisodePreviewCard from "../components/EpisodePreviewCard";
import { useDB } from "../DB";
import { useTranslation } from "react-i18next";
import EpisodeOverview from "../components/EpisodeOverview";
import appIcon from '../../src-tauri/icons/icon.png'


function HomePage() {
  const { dbLoaded, queue,
    subscriptionsEpisodes: { newEpisodes }} = useDB()
  const { t } = useTranslation()

  if (!dbLoaded) return

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