import EpisodeCard from '../components/EpisodeCard'
import { EpisodeData } from '..'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDB } from '../ContextProviders'
import { EPISODE_CARD_HEIGHT, PRELOADED_EPISODES } from '../Global'

export default function HistoryPage() {
  const {
    history: { getAllEpisodes },
  } = useDB()
  const [history, setHistory] = useState<EpisodeData[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const [visibleItems, setVisibleItems] = useState(0)
  const { t } = useTranslation()

  useEffect(() => {
    getAllEpisodes().then((episodes) => {
      setHistory(episodes)
    })
  }, [])

  useEffect(() => {
    if (!scrollRef.current) return
    const elementsOnWindow = Math.floor(scrollRef.current.clientHeight / EPISODE_CARD_HEIGHT) + 1
    setVisibleItems(Math.max(visibleItems, elementsOnWindow))
  }, [scrollRef.current?.clientHeight])

  return (
    <div
      ref={scrollRef}
      className="flex w-full flex-col overflow-y-auto p-2"
      onScroll={() => {
        if (!scrollRef.current) return
        const scrolledWindows = scrollRef.current.scrollTop / scrollRef.current.clientHeight + 1
        const elementsOnWindow = Math.floor(scrollRef.current.clientHeight / EPISODE_CARD_HEIGHT) + 1

        setVisibleItems(Math.max(visibleItems, Math.round(scrolledWindows * elementsOnWindow) + PRELOADED_EPISODES))
      }}
    >
      <div className="flex w-full items-center justify-between gap-5 border-b-[1px] border-primary-8 p-2">
        <h1 className="uppercase">{t('history')}</h1>
      </div>

      <div className="flex flex-col px-1">
        {history.slice(0, visibleItems).map((episode) => (
          <EpisodeCard
            key={episode.id}
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
