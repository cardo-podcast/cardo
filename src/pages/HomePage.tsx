import EpisodePreviewCard from '../components/EpisodePreviewCard'
import { useTranslation } from 'react-i18next'
import EpisodeOverview from '../components/EpisodeOverview'
import appIcon from '../../src-tauri/icons/icon.png'
import { useDB } from '../ContextProviders'

function HomePage() {
  const {
    queue,
    subscriptions: { latestEpisodes },
  } = useDB()
  const { t } = useTranslation()

  return (
    <div className="mt-1 flex h-fit w-full flex-col gap-3 p-2">
      {queue.queue.length > 0 && (
        <div>
          <h1 className="mb-1 uppercase">{t('queue')}</h1>
          <EpisodeOverview>
            {queue.queue.map((episode) => (
              <EpisodePreviewCard key={episode.id} episode={episode} />
            ))}
          </EpisodeOverview>
        </div>
      )}

      {latestEpisodes.length > 0 && (
        <div>
          <h1 className="mb-1 uppercase">{t('news')}</h1>
          <EpisodeOverview>
            {latestEpisodes.map((episode) => (
              <EpisodePreviewCard key={episode.id} episode={episode} />
            ))}
          </EpisodeOverview>
        </div>
      )}

      {
        // welcome message
        queue.queue.length === 0 && latestEpisodes.length === 0 && (
          <div className="flex flex-col items-center gap-4 p-2 px-4">
            <img className="w-36" alt="" src={appIcon} />
            <h1 className="text-center text-lg text-primary-3">{t('welcome_message')}</h1>
          </div>
        )
      }
    </div>
  )
}

export default HomePage
