import { MouseEventHandler, SyntheticEvent, useRef } from 'react'
import { EpisodeData } from '..'
import * as icons from '../Icons'
import { useNavigate } from 'react-router-dom'
import { secondsToStr } from '../utils/utils'
import ProgressBar from './ProgressBar'
import { useTranslation } from 'react-i18next'
import { showMenu } from 'tauri-plugin-context-menu'
import appIcon from '../../src-tauri/icons/icon.png'
import { useEpisode } from '../engines/Episode'

function EpisodeCard({ episode, className = '', onImageClick = undefined, onClick = undefined }: { episode: EpisodeData; className?: string; onImageClick?: MouseEventHandler<HTMLImageElement>; onClick?: () => void }) {
  const navigate = useNavigate()
  const contextMenuTarget = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  const { reprState, inQueue, getDateString, togglePlayed, toggleQueue, getPosition, inProgress, play, pause, toggleDownload, downloadState } = useEpisode(episode)

  return (
    <div
      ref={contextMenuTarget}
      className={`flex w-full ${reprState.complete ? 'text-primary-6' : ''} min-h-20 cursor-pointer justify-between gap-4 p-2 ${className}`}
      onClick={() => {
        onClick && onClick()
        navigate('/episode-preview', {
          state: {
            episode: episode,
          },
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
              event: toggleQueue,
            },
            {
              label: t(downloadState == 'downloaded' ? 'remove_download' : 'download'),
              event: toggleDownload,
            },
          ],
        })
      }}
    >
      <>
        <div className="aspect-square h-16 rounded-md bg-primary-8">
          <img
            className={`rounded-md ${onImageClick !== undefined ? 'cursor-pointer hover:p-0.5' : ''}`}
            onClick={onImageClick}
            alt=""
            loading="lazy"
            decoding="async"
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

        <div className="flex w-full flex-col items-end justify-between text-right">
          <p className={`text-sm ${reprState.complete ? '0' : '-4'}`}>
            {getDateString()} - {episode.size} MB{' '}
          </p>
          <h2 className="mb-2" title={episode.description}>
            {episode.title}
          </h2>
          <div className="flex w-full items-center justify-end gap-2">
            {inProgress() ? <ProgressBar position={getPosition()} total={reprState.total} className={{ div: 'h-1', bar: 'rounded', innerBar: 'rounded' }} /> : secondsToStr(reprState.total)}
            <button
              className="flex aspect-square w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary-6 p-1 hover:p-[2px] hover:text-accent-6"
              onClick={(e) => {
                e.stopPropagation()
                inProgress(true) ? pause() : play()
              }}
            >
              <span className="w-5">{inProgress(true) ? icons.pause : icons.play}</span>
            </button>
          </div>
        </div>
      </>
    </div>
  )
}

export default EpisodeCard
