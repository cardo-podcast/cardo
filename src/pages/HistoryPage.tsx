import EpisodeCard from '../components/EpisodeCard'
import SortEpisodeGrip from '../components/SortEpisodeGrip'
import { EpisodeData } from '..'
import { SortableContext } from '@dnd-kit/sortable'
import { capitalize, parsePodcastDetails } from '../utils/utils'
import { useNavigate } from 'react-router-dom'
import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDB } from '../ContextProviders'
import { event } from '@tauri-apps/api'

export default function HistoryPage() {
  const {
    history: { getAllEpisodes },
  } = useDB()
  const [history, setHistory] = useState<EpisodeData[]>([])
  const { t } = useTranslation()

  useEffect(() => {
    getAllEpisodes().then((episodes) => setHistory(episodes))
  }, [])

  return (
    <div className="flex w-full flex-col p-2">
      <div className="flex w-full items-center justify-between gap-5 border-b-[1px] border-primary-8 p-2">
        <h1 className="uppercase">{t('history')}</h1>
      </div>

      <div className="flex flex-col px-1">
        {history
          .filter((episode) => episode.pubDate)
          .map((episode) => (
            <EpisodeCard
              key={episode.src}
              episode={{
                ...episode,
              }}
              className="border-b-[1px] border-primary-8 transition-colors hover:bg-primary-8"
            />
          ))}
      </div>
    </div>
  )
}
