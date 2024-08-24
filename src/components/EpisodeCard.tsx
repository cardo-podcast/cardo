import { MouseEventHandler, ReactNode, useEffect, useRef, useState } from "react"
import { EpisodeData } from ".."
import * as icons from "../Icons"
import { useNavigate } from "react-router-dom"
import { useIntersectionObserver } from "@uidotdev/usehooks"
import { secondsToStr } from "../utils"
import { useDB } from "../DB"
import ProgressBar from "./ProgressBar"
import { useSettings } from "../Settings"
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from "react-i18next"
import { usePlayer } from "./AudioPlayer"
import { showMenu } from "tauri-plugin-context-menu";

export function SortEpisodeGrip({ id, children }: { id: number, children: ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div className="flex cursor-default hover:bg-primary-8 transition-colors rounded-md" style={style} {...attributes}>
      <div ref={setNodeRef} className="flex items-center" {...listeners}>
        <div className={`w-6 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}>
          {icons.grip}
        </div>
      </div>
      {children}
    </div>
  );
}




function EpisodeCard({ episode, className = '', noLazyLoad = false, onImageClick = undefined }:
  {
    episode: EpisodeData, className?: string, noLazyLoad?: boolean,
    onImageClick?: MouseEventHandler<HTMLImageElement>
  }) {
  const [imageError, setImageError] = useState(false)

  const { history: { getEpisodeState, updateEpisodeState } } = useDB()
  const [reprState, setReprState] = useState({ position: 0, total: episode.duration, complete: false })

  const navigate = useNavigate()
  const [{ globals: { locale } },] = useSettings()
  const [date, setDate] = useState('')
  const contextMenuTarget = useRef<HTMLDivElement>(null)

  const { queue } = useDB()
  const [inQueue, setInqueue] = useState(queue.includes(episode.src))

  const { t } = useTranslation();
  const { play, playing, position: playingPosition, quit: quitPlayer } = usePlayer()


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
        setReprState({ position: state.position, total: state.total, complete: state.position >= state.total })
      } else {
        // render a not played episode
        setReprState({ position: 0, total: episode.duration, complete: false })
      }

    })
  }, [entry?.isIntersecting, noLazyLoad, episode, playing?.src, locale, ])


  return (
    <div ref={contextMenuTarget} className="w-full">
      <div ref={ref} className={`flex ${reprState.complete ? 'text-primary-6' : ''} cursor-pointer min-h-20
                                p-2 justify-between gap-4 ${className}`}
        onClick={() => {
          navigate('/episode-preview', {
            state: {
              episode: episode
            }
          })
        }}
        onContextMenu={() => {
          showMenu({
            items: [
              {
                label: t(reprState.complete ? 'mark_not_played' : 'mark_played'),
                event: () => {
                  if (reprState.complete) {
                    updateEpisodeState(episode.src, episode.podcastUrl, 0, episode.duration)
                    setReprState({ complete: false, position: 0, total: reprState.total })
                  } else {
                    updateEpisodeState(episode.src, episode.podcastUrl, reprState.total, reprState.total)
                    setReprState({ complete: true, position: reprState.total, total: reprState.total })
                    if (playing?.src == episode.src) {
                      quitPlayer()
                    }
                  }
                }
              },
              {
                label: t(inQueue ? 'remove_queue' : 'add_queue'),
                event: async () => {
                  if (inQueue) {
                    await queue.remove(episode.src)
                    setInqueue(false)
                  } else {
                    await queue.push(episode)
                    setInqueue(true)
                  }
                }
              }
            ]
          });
        }}
      >

        {(entry?.isIntersecting || noLazyLoad) &&
          <>
            <div className="h-16 aspect-square rounded-md">
              {
                imageError ?
                  icons.photo :
                  <img
                    className={`rounded-md ${onImageClick !== undefined ? 'cursor-pointer' : ''}`}
                    onClick={onImageClick}
                    alt=""
                    src={episode.coverUrl}
                    title={onImageClick !== undefined ? t('open_podcast') + ' ' + episode.podcast?.podcastName : ''}
                    onError={() => setImageError(true)}
                  />
              }
            </div>

            <div className="flex flex-col text-right w-full items-end justify-between">
              <p className={`text-sm ${reprState.complete ? '0' : '-4'}`}>{date} - {episode.size} MB </p>
              <h2 className="mb-2">{episode.title}</h2>
              <div className="flex w-full gap-2 items-center justify-end">
                {
                  (reprState.position === 0 ||
                    reprState.complete) ?
                    secondsToStr(reprState.total) :
                    <ProgressBar position={playing?.src == episode.src ? playingPosition : reprState.position}
                      total={reprState.total}
                      className={{ div: 'h-1', bar: 'rounded', innerBar: 'rounded' }} />
                }
                <button className="w-7 p-[2px] aspect-square flex justify-center items-center hover:text-accent-6 border-2 border-primary-6 rounded-full"
                  onClick={e => {
                    e.stopPropagation()
                    play(episode)
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