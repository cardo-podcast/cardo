import { SyntheticEvent, useEffect, useState } from "react"
import * as icons from "../Icons"
import { EpisodeData } from ".."
import { useLocation, useNavigate } from "react-router-dom"
import { useDB } from "../engines/DB"
import { parsePodcastDetails, secondsToStr } from "../utils"
import { useTranslation } from "react-i18next"
import ProgressBar from "../components/ProgressBar"
import appIcon from '../../src-tauri/icons/icon.png'
import { useEpisode } from "../engines/Episode"


function EpisodePreview() {
  const location = useLocation()
  const episode = location.state.episode as EpisodeData
  const navigate = useNavigate()
  const { subscriptions: { getSubscription } } = useDB()
  const { t } = useTranslation()
  const [podcastFetched, setPodcastFetched] = useState(false)
  const { reprState, inQueue, getDateString, togglePlayed, toggleQueue, getPosition, inProgress, toggleDownload, downloadState, play } = useEpisode(episode)


  const fetchPodcastData = async (episode: EpisodeData) => {
    if (episode.podcast?.description) { // suposing that if we have the description we will have everything
      setPodcastFetched(true)
      return
    } // complete podcast data has been passed with episode

    const subscription = await getSubscription(episode.podcastUrl)

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


  return (
    <div className="p-2 w-full flex flex-col">
      <div className=' flex justify-left w-full gap-3 mb-2 p-2 pb-3 border-b-2 border-primary-8'>
        <img
          className={`h-28 aspect-square rounded-md transition-all ${podcastFetched ? 'hover:p-1 cursor-pointer' : ''}`}
          src={episode.coverUrl}
          alt=""
          onError={(e: SyntheticEvent<HTMLImageElement>) => {
            if (e.currentTarget.src === episode.podcast?.coverUrl) {
              e.currentTarget.src = appIcon
            } else {
              e.currentTarget.src = episode.podcast?.coverUrl ?? appIcon
            }
          }}
          title={podcastFetched ? t('open_podcast') : ''}
          onClick={() => {
            podcastFetched && // buton didn't work if podcast isn't loaded yet
              navigate('/preview', {
                state: {
                  podcast: episode.podcast
                }
              })
          }}
        />

        <div className="flex flex-col gap-2 justify-between p-1 w-full">
          <div className="flex flex-col">
            <p className='text-sm'>{getDateString()} - {episode.size} MB </p>
            <h1>{episode.title}</h1>
          </div>
          <div className="flex gap-2 justify-end items-center">
            {
              inProgress() ?
                <ProgressBar position={getPosition()}
                  total={episode.duration}
                  className={{ div: 'h-1', bar: 'rounded', innerBar: 'rounded' }} />
                : secondsToStr(episode.duration)
            }
            <button className="w-7 p-1 aspect-square shrink-0 flex justify-center items-center hover:text-accent-6 hover:p-[2px] bg-primary-7 rounded-full"
              onClick={play}
            >
              {icons.play}
            </button>

            <button className={`w-5 hover:text-accent-6 ${reprState.complete && 'text-primary-7'}`}
              title={reprState.complete ? t('mark_not_played') : t('mark_played')}
              onClick={togglePlayed}
            >
              {icons.check}
            </button>

            <button className={`w-7 hover:text-accent-6 ${inQueue && 'text-primary-7'}`}
              title={inQueue ? t('remove_queue') : t('add_queue')}
              onClick={toggleQueue}
            >
              {icons.queue}
            </button>
            <button className={`w-7 hover:text-accent-6 ${downloadState == 'downloaded' && 'text-primary-7'}`}
              onClick={toggleDownload}
            >
              {icons.download}
            </button>
          </div>
        </div>
      </div>
      <div className="rounded-md p-3 whitespace-pre-line"
        dangerouslySetInnerHTML={{ __html: episode.description }} />
    </div>
  )
}

export default EpisodePreview