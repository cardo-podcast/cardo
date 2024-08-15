import { useRef } from "react";
import EpisodePreviewCard from "../components/EpisodePreviewCard";
import { useDB } from "../DB";
import * as icons from "../Icons"
import { useTranslation } from "react-i18next";


function HomePage() {
  const { queue } = useDB()
  const scrollRef = useRef<HTMLDivElement>(null)
  const {t} = useTranslation()

  const manageScroll = (value: number) => {
    if (!scrollRef.current) return

    scrollRef.current.scrollLeft += value
  }

  return (
    <div className="flex flex-col p-2 w-full h-fit relative">
      <h1 className="mb-2 uppercase">{t('queue')}</h1>

        <button
          className="fixed z-10 top-[115px] bg-amber-500 w-12 rounded-r-full h-28 opacity-0 hover:opacity-100 transition-opacity duration-200"
          onClick={() => manageScroll(-200)}
        >
          {icons.arrowLeft}
        </button>
        <button
          className="fixed z-10 top-[115px] bg-amber-500 w-12 rounded-l-full h-28 opacity-0 hover:opacity-100 transition-opacity duration-200 right-0"
          onClick={() => manageScroll(200)}
        >
          {icons.arrowRight}
        </button>

      <div ref={scrollRef} className="flex gap-1 overflow-x-auto pr-72 scroll-smooth">
        {
          queue.queue.map(episode => (
            <EpisodePreviewCard key={episode.id} episode={episode} />
          ))
        }
      </div>

    </div>
  )
}

export default HomePage;