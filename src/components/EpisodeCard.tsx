import { MouseEventHandler, ReactNode, useEffect, useRef, useState } from "react"
import { EpisodeData } from ".."
import * as icons from "../Icons"
import { useNavigate } from "react-router-dom"
import { useIntersectionObserver } from "@uidotdev/usehooks"
import { secondsToStr } from "../utils"
import { useDB } from "../DB"
import ProgressBar from "./ProgressBar"
import { FilterCriterion, useSettings } from "../Settings"
import { ContextMenu } from "./ContextMenu"
import { SwitchState } from "./Inputs"
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import { useTranslation } from "react-i18next"

export function SortEpisodeGrip({id, children}: {id: number, children: ReactNode}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({id: id});
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <div className="flex cursor-default hover:bg-zinc-800 rounded-md" style={style} {...attributes}>
      <div ref={setNodeRef} className="flex items-center" {...listeners}>
        <div className={`w-6 ${isDragging? 'cursor-grabbing': 'cursor-grab'}`}>
          {icons.grip}
        </div>
      </div>
      {children}
    </div>
  );
}




function EpisodeCard({ episode, play, className='', noLazyLoad=false, filter=undefined, onImageClick=undefined}:
    { episode: EpisodeData, play: () => void , className?: string,
      noLazyLoad?: boolean, filter?: FilterCriterion | undefined, onImageClick?: MouseEventHandler<HTMLImageElement>}) {
  const [imageError, setImageError] = useState(false)

  const { history: { getEpisodeState, updateEpisodeState } } = useDB()
  const [reprState, setReprState] = useState({ position: 0, total: episode.duration, complete: false })

  const navigate = useNavigate()
  const [{ globals: { locale } },] = useSettings()
  const [date, setDate] = useState('')
  const contextMenuTarget = useRef<HTMLDivElement>(null)

  const {queue} = useDB()
  const [inQueue, setInqueue] = useState(queue.includes(episode.src))

  const { t } = useTranslation();

  
  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px",
  });


  useEffect(() => {
    if (!entry?.isIntersecting && !noLazyLoad) return

    // set print date
    const episodeYear = episode.pubDate.getFullYear()
    const actualYear = new Date().getFullYear()

    setDate(episode.pubDate
      .toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: episodeYear < actualYear ? 'numeric' : undefined
      }
      )
    )

    // update reproduction state
    getEpisodeState(episode.src).then(state => {
      if (state !== undefined) {
        setReprState({ position: state.position, total: state.total, complete: state.position === state.total })
      } else {
        // render a not played episode
        setReprState({ position: 0, total: episode.duration, complete: false })
      }

    })
  }, [entry?.isIntersecting, noLazyLoad, episode, getEpisodeState, locale])


  const xor = (setting: SwitchState, state: boolean) => {
    return (setting === SwitchState.True && !state) ||
            (setting === SwitchState.False && state)
  }


  if (entry?.isIntersecting && filter && xor(filter.played, reprState.complete)) return <></>


  return (
    <div ref={contextMenuTarget} className="w-full">
      <div ref={ref} className={`flex ${reprState.complete ? 'text-zinc-500' : ''} cursor-default min-h-20
                                p-2 justify-between gap-4 ${className}`}
        onClick={() => {
          navigate('/episode-preview', {
            state: {
              episode: episode,
              podcastUrl: episode.podcastUrl
            }
          })
        }}
      >
        <ContextMenu target={contextMenuTarget}>
          <div className="bg-zinc-700 max-w-60 text-zinc-300 p-2 rounded-md uppercase">
            <p className="mb-2 truncate text-xs text-zinc-400">{episode.title}</p>
            <button className="w-full text-left text-sm hover:text-zinc-50"
              onClick={() => {
                if (reprState.complete) {
                  updateEpisodeState(episode.src, episode.podcastUrl,
                    0, episode.duration)
                    setReprState({complete: false, position:0, total:episode.duration})
                } else {
                  updateEpisodeState(episode.src, episode.podcastUrl,
                    episode.duration, episode.duration)
                    setReprState({complete: true, position:episode.duration, total:episode.duration})
                }
              }
              }>
              {t(reprState.complete ? 'mark_not_played' : 'mark_played')}
            </button>
            <button className="w-full text-left text-sm hover:text-zinc-50"
            onClick={async()=>{
              if (inQueue) {
                await queue.remove(episode.src)
                setInqueue(false)
              } else {
                await queue.push(episode)
                setInqueue(true)
              }
            }}
            >
              {t(inQueue ? 'remove_queue' : 'add_queue')}
            </button>
          </div>
        </ContextMenu>

        {(entry?.isIntersecting || noLazyLoad) &&
          <>
            <div className="h-16 aspect-square rounded-md">
              {
                imageError ?
                  icons.photo :
                  <img
                    className={`rounded-md ${onImageClick !== undefined ? 'cursor-pointer': ''}`}
                    onClick={onImageClick}
                    alt=""
                    src={episode.coverUrl}
                    onError={() => setImageError(true)}
                  />
              }
            </div>

            <div className="flex flex-col text-right w-full items-end justify-between">
              <p className={`text-sm w-full ${reprState.complete ? 'text-zinc-500' : 'text-zinc-400'}`}>{date} - {Math.round(episode.size / 1000000)} MB </p>
              <h2 className="mb-2">{episode.title}</h2>
              <div className="flex w-full gap-2 justify-end">
                {
                  (reprState.position === 0 ||
                    reprState.complete) ?
                    secondsToStr(reprState.total) :
                    <ProgressBar position={reprState.position} total={reprState.total} />
                }
                <button className="w-7 p-[2px] aspect-square flex justify-center items-center hover:text-amber-600 border-2 border-zinc-600 rounded-full"
                  onClick={e => {
                    e.stopPropagation()
                    play()
                  }}
                >
                  {icons.play}
                </button>
              </div>
            </div>
          </>
        }
      </div>
    </div>
  )
}

export default EpisodeCard