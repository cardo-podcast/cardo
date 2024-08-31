import { MouseEventHandler, ReactNode, SyntheticEvent, useEffect, useRef, useState } from "react"
import { EpisodeData } from ".."
import * as icons from "../Icons"
import { useNavigate } from "react-router-dom"
import { useIntersectionObserver } from "@uidotdev/usehooks"
import { secondsToStr } from "../utils"
import ProgressBar from "./ProgressBar"
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from "react-i18next"
import { showMenu } from "tauri-plugin-context-menu";
import appIcon from '../../src-tauri/icons/icon.png'
import { useEpisode } from "../engines/Episode"


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

  const navigate = useNavigate()
  const [date, setDate] = useState('')
  const contextMenuTarget = useRef<HTMLDivElement>(null)
  const { t } = useTranslation();
  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px",
  });

  const { reprState, inQueue, getDateString, togglePlayed, toggleQueue, getPosition, inProgress, play, toggleDownload, downloaded } = useEpisode(episode, entry?.isIntersecting)


  useEffect(() => {
    if (!entry?.isIntersecting && !noLazyLoad) return

    setDate(getDateString())

  }, [entry?.isIntersecting, noLazyLoad, getDateString])


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
                event: togglePlayed,
              },
              {
                label: t(inQueue ? 'remove_queue' : 'add_queue'),
                event: toggleQueue
              },
              {
                label: t(downloaded ? 'remove_download' : 'download'),
                event: toggleDownload
              },
              
            ]
          });
        }}
      >

        {(entry?.isIntersecting || noLazyLoad) &&
          <>
            <div className="h-16 aspect-square rounded-md">
              <img
                className={`rounded-md ${onImageClick !== undefined ? 'cursor-pointer' : ''}`}
                onClick={onImageClick}
                alt=""
                src={episode.coverUrl}
                title={onImageClick !== undefined ? t('open_podcast') + ' ' + episode.podcast?.podcastName : ''}
                onError={(e: SyntheticEvent<HTMLImageElement>) => {
                  if (e.currentTarget.src === episode.podcast?.coverUrl) {
                    e.currentTarget.src = appIcon
                  } else {
                    e.currentTarget.src = episode.podcast?.coverUrl ?? appIcon
                  }
                }}
              />
            </div>

            <div className="flex flex-col text-right w-full items-end justify-between">
              <p className={`text-sm ${reprState.complete ? '0' : '-4'}`}>{date} - {episode.size} MB </p>
              <h2 className="mb-2" title={episode.description}>{episode.title}</h2>
              <div className="flex w-full gap-2 items-center justify-end">
                {
                  inProgress() ?
                    <ProgressBar position={getPosition()}
                      total={reprState.total}
                      className={{ div: 'h-1', bar: 'rounded', innerBar: 'rounded' }} />
                    : secondsToStr(reprState.total)
                }
                <button className="w-7 p-1 aspect-square shrink-0 flex justify-center items-center hover:text-accent-6 hover:p-[2px] border-2 border-primary-6 rounded-full"
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