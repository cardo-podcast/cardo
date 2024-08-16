import { useEffect, useRef, useState } from "react";
import EpisodePreviewCard from "../components/EpisodePreviewCard";
import { useDB } from "../DB";
import * as icons from "../Icons"
import { useTranslation } from "react-i18next";
import EpisodeOverview from "../components/EpisodeOverview";
import { EpisodeData } from "..";
import { useSettings } from "../Settings";


function HomePage() {
  const { queue,
    subscriptionsEpisodes: { getAllSubscriptionsEpisodes },
    history: { getEpisodeState },
    dbLoaded } = useDB()
  const { t } = useTranslation()
  const [newEpisodes, setNewEpisodes] = useState<EpisodeData[]>([])
  const [{ general: { numberOfDaysInNews } }, _] = useSettings()


  const loadNewEpisodes = async () => {
    const minDate = Date.now() - (24 * 3600 * 1000 * numberOfDaysInNews)
    const episodes = await getAllSubscriptionsEpisodes(minDate)

    const filteredEpisodes: EpisodeData[] = []

    // filter completed episodes
    for (const episode of episodes) {
      const state = await getEpisodeState(episode.src)
      if (!state || state?.position < state?.total) {
        filteredEpisodes.push(episode)
      }
    }

    // sort newer -> older
    filteredEpisodes.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())

    setNewEpisodes(filteredEpisodes)
  }

  useEffect(
    () => {
      if (!dbLoaded) return

      loadNewEpisodes()
    }, [dbLoaded])

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
        numberOfDaysInNews > 0 &&

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