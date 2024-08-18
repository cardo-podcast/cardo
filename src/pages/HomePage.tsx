import { useEffect } from "react";
import EpisodePreviewCard from "../components/EpisodePreviewCard";
import { useDB } from "../DB";
import { useTranslation } from "react-i18next";
import EpisodeOverview from "../components/EpisodeOverview";


function HomePage() {
  const { queue,
    subscriptionsEpisodes: { newEpisodes }} = useDB()
  const { t } = useTranslation()


  return (
    <div className="flex flex-col p-2 w-full h-fit gap-3 mt-1">
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

    </div>
  )
}

export default HomePage;