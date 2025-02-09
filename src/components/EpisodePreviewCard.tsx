/*Compact variation of EpisodeCard */

import { SyntheticEvent } from 'react'
import { EpisodeData, NewEpisodeData } from '..'
import * as icons from '../Icons'
import { useNavigate } from 'react-router-dom'
import ProgressBar from './ProgressBar'
import { useTranslation } from 'react-i18next'
import { showMenu } from 'tauri-plugin-context-menu'
import appIcon from '../../src-tauri/icons/icon.png'
import { useEpisode } from '../engines/Episode'
import { EpisodeCover } from './Cover'

export default function EpisodePreviewCard({ episode }: { episode: EpisodeData | NewEpisodeData }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    reprState,
    inQueue,
    getDateString,
    togglePlayed,
    toggleQueue,
    position,
    play,
    toggleDownload,
    downloadState,
    inProgress,
    pause,
  } = useEpisode(episode)

  return (
    <div
      className="amber-600 flex w-24 flex-shrink-0 cursor-pointer flex-col rounded-md transition-all duration-100 hover:p-[3px]"
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
              label: t(downloadState === 'downloaded' ? 'remove_download' : 'download'),
              event: toggleDownload,
            },
          ],
        })
      }}
    >
      <div className="relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-md bg-primary-8">
        <EpisodeCover
          episode={episode}
          title={episode.podcast?.podcastName}
          className="w-full bg-purple-950"
          onClick={() => {
            navigate('/episode-preview', {
              state: {
                episode: episode,
              },
            })
          }}
        />
        <ProgressBar
          position={position}
          total={episode.duration}
          showTime={false}
          className={{ div: 'h-2 shrink-0' }}
        />

        <button
          className="absolute bottom-2 right-2 flex aspect-square w-7 items-center justify-center rounded-full border-2 border-accent-8 bg-accent-7 p-[3px] pl-[4px] transition-all hover:p-[1px]"
          onClick={(e) => {
            e.stopPropagation()
            inProgress(true) ? pause() : play()
          }}
        >
          <span className="w-5 text-white">{inProgress(true) ? icons.pause : icons.play}</span>
        </button>
      </div>
      <div className="relative">
        <h1 className="line-clamp-2 text-sm" title={episode.title}>
          {episode.title}
        </h1>
        <div className="flex items-center gap-2">
          {(episode as NewEpisodeData).new && <span className="h-2 w-2 rounded-full bg-accent-5" title={t('new')} />}
          <h2 className="0 text-sm">{getDateString()}</h2>
        </div>
      </div>
    </div>
  )
}
