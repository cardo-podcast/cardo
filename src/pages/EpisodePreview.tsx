import { useEffect, useState } from 'react'
import * as icons from '../Icons'
import { EpisodeData } from '..'
import { useLocation, useNavigate } from 'react-router-dom'
import { parsePodcastDetails, secondsToStr } from '../utils/utils'
import { useTranslation } from 'react-i18next'
import ProgressBar from '../components/ProgressBar'
import { useEpisode } from '../engines/Episode'
import { sanitizeHTML } from '../utils/sanitize'
import { showMenu } from 'tauri-plugin-context-menu'
import { toast } from 'react-toastify'
import { useDB } from '../ContextProviders'
import { EpisodeCover } from '../components/Cover'

function EpisodePreview() {
  const location = useLocation()
  const episode = location.state.episode as EpisodeData
  const navigate = useNavigate()
  const { subscriptions } = useDB()
  const { t } = useTranslation()
  const [podcastFetched, setPodcastFetched] = useState(false)
  const {
    reprState,
    inQueue,
    getDateString,
    togglePlayed,
    toggleQueue,
    position,
    inProgress,
    toggleDownload,
    downloadState,
    play,
    pause,
  } = useEpisode(episode)

  const fetchPodcastData = async (episode: EpisodeData) => {
    if (episode.podcast?.description) {
      // suposing that if we have the description we will have everything
      setPodcastFetched(true)
      return
    } // complete podcast data has been passed with episode

    const subscription = await subscriptions.get(episode.podcastUrl)

    if (subscription !== undefined) {
      episode.podcast = subscription
    } else {
      episode.podcast = await parsePodcastDetails(episode.podcastUrl)
    }

    setPodcastFetched(true)
  }

  useEffect(() => {
    // asynchronously fetch podcast data to allow loadig podcast page clicking on cover
    fetchPodcastData(episode)
  }, [])

  function copyEpisodeSrc() {
    navigator.clipboard.writeText(episode.src)
    toast.info(t('episode_url_copied'), {
      position: 'top-center',
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: 'dark',
    })
  }

  return (
    <div className="flex w-full flex-col p-2">
      <div className="justify-left mb-2 flex w-full gap-3 border-b-2 border-primary-8 p-2 pb-3">
        <div
          className={`flex aspect-square h-28 items-center justify-center rounded-md bg-primary-8 transition-all ${podcastFetched ? 'cursor-pointer hover:scale-95' : ''}`}
        >
          <EpisodeCover
            className="rounded-md"
            episode={episode}
            title={podcastFetched ? t('open_podcast') + ' ' + episode.podcast?.podcastName : ''}
            onClick={() => {
              podcastFetched && // buton didn't work if podcast isn't loaded yet
                navigate('/preview', {
                  state: {
                    podcast: episode.podcast,
                  },
                })
            }}
            onContextMenu={() => {
              if (!podcastFetched) return

              showMenu({
                items: [
                  {
                    label: t('copy_episode_url'),
                    event: copyEpisodeSrc,
                  },
                ],
              })
            }}
          />
        </div>

        <div className="flex w-full flex-col justify-between gap-2 p-1">
          <div className="flex flex-col">
            <p className="text-sm">
              {getDateString()} - {episode.size} MB{' '}
            </p>
            <h1>{episode.title}</h1>
          </div>
          <div className="flex items-center justify-end gap-2">
            {inProgress() ? (
              <ProgressBar
                position={position}
                total={episode.duration}
                className={{ div: 'h-1', bar: 'rounded', innerBar: 'rounded' }}
              />
            ) : (
              secondsToStr(episode.duration)
            )}
            <button
              className="flex aspect-square w-7 shrink-0 items-center justify-center rounded-full bg-primary-7 p-1 hover:p-[2px] hover:text-accent-6"
              onClick={() => (inProgress(true) ? pause() : play())}
            >
              <span className="w-5">{inProgress(true) ? icons.pause : icons.play}</span>
            </button>

            <button
              className={`w-5 hover:text-accent-6 ${reprState.complete && 'text-primary-7'}`}
              title={reprState.complete ? t('mark_not_played') : t('mark_played')}
              onClick={togglePlayed}
            >
              {icons.check}
            </button>

            <button
              className={`w-7 hover:text-accent-6 ${inQueue && 'text-primary-7'}`}
              title={inQueue ? t('remove_queue') : t('add_queue')}
              onClick={toggleQueue}
            >
              {icons.queue}
            </button>
            <button
              className={`w-7 hover:text-accent-6 ${downloadState == 'downloaded' && 'text-primary-7'}`}
              onClick={toggleDownload}
            >
              {icons.download}
            </button>
          </div>
        </div>
      </div>
      <div
        className="whitespace-pre-line rounded-md p-3"
        dangerouslySetInnerHTML={{ __html: sanitizeHTML(episode.description) }}
      />
    </div>
  )
}

export default EpisodePreview
