/*Compact variation of EpisodeCard */

import { EpisodeData, NewEpisodeData } from '..'
import * as icons from '../Icons'
import { useNavigate } from 'react-router-dom'
import ProgressBar from './ProgressBar'
import { useTranslation } from 'react-i18next'
import { Menu } from '@tauri-apps/api/menu'
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
      className="amber-600 flex w-24 shrink-0 cursor-pointer flex-col rounded-md transition-all duration-100"
      onContextMenu={async() => {
        const menu = await Menu.new({
          items: [
            {
              text: t(reprState.complete ? 'mark_not_played' : 'mark_played'),
              action: togglePlayed,
            },
            {
              text: t(inQueue ? 'remove_queue' : 'add_queue'),
              action: toggleQueue,
            },
            {
              text: t(downloadState === 'downloaded' ? 'remove_download' : 'download'),
              action: toggleDownload,
            },
          ],
        })
        
        menu.popup()
      }}
    >
      <div className="bg-primary-8 relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-md">
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
          className="border-accent-8 bg-accent-7 absolute right-2 bottom-2 flex aspect-square w-7 items-center justify-center rounded-full border-2 p-[3px] pl-[4px] transition-all hover:p-px"
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
          {(episode as NewEpisodeData).new && <span className="bg-accent-5 h-2 w-2 rounded-full" title={t('new')} />}
          <h2 className="0 text-sm">{getDateString()}</h2>
        </div>
      </div>
    </div>
  )
}
