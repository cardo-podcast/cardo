import { SyntheticEvent, useEffect, useState } from "react"
import * as icons from "../Icons"
import { EpisodeData } from ".."
import { useLocation, useNavigate } from "react-router-dom"
import { usePlayer } from "../components/AudioPlayer"
import { useDB } from "../DB"
import { parsePodcastDetails, secondsToStr } from "../utils"
import { useTranslation } from "react-i18next"
import ProgressBar from "../components/ProgressBar"
import { useSettings } from "../Settings"
import appIcon from '../../src-tauri/icons/icon.png'


function EpisodePreview() {
  const location = useLocation()
  const episode = location.state.episode as EpisodeData
  const [position, setPosition] = useState(0)
  const [ended, setEnded] = useState(false)
  const { play, playing, position: playingPosition, quit: quitPlayer } = usePlayer()
  const navigate = useNavigate()
  const { subscriptions: { getSubscription }, history: { getEpisodeState, updateEpisodeState }, queue } = useDB()
  const { t } = useTranslation()
  const [{ globals: { locale } },] = useSettings()
  const [inQueue, setInqueue] = useState(queue.includes(episode.src))


  const getDate = () => {
    const episodeYear = episode.pubDate.getFullYear()
    const actualYear = new Date().getFullYear()

    return episode.pubDate
      .toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: episodeYear < actualYear ? 'numeric' : undefined
      }
      )
  }


  const fetchPodcastData = async (episode: EpisodeData) => {
    if (episode.podcast) return

    const subscription = await getSubscription(episode.podcastUrl)

    if (subscription !== undefined) {
      episode.podcast = subscription
    } else {
      episode.podcast = await parsePodcastDetails(episode.podcastUrl)
    }
  }

  useEffect(() => {
    // asynchronously fetch podcast data to allow loadig podcast page clicking on cover
    fetchPodcastData(episode)

    // set actual position if episode was played before
    getEpisodeState(episode.src).then(
      epState => {
        if (epState) {
          setPosition(epState.position)
          episode.duration = epState.total
        }
      }
    )
  }, [])

  useEffect(() => {
    setEnded(position >= episode.duration)
  }, [position])

  return (
    <div className="p-2 w-full flex flex-col">
      <div className=' flex justify-left w-full gap-3 mb-2 p-2 pb-3 border-b-2 border-primary-8'>
        <img
          className="h-28 aspect-square rounded-md cursor-pointer hover:p-1 transition-all"
          src={episode.coverUrl}
          alt=""
          onError={(e: SyntheticEvent<HTMLImageElement>) => {
            if (e.currentTarget.src === episode.podcast?.coverUrl) {
              e.currentTarget.src = appIcon
            } else {
              e.currentTarget.src = episode.podcast?.coverUrl ?? appIcon
            }
          }}
          title={t('open_podcast')}
          onClick={() => {
            navigate('/preview', {
              state: {
                podcast: episode.podcast
              }
            })
          }}
        />

        <div className="flex flex-col gap-2 justify-between p-1 w-full">
          <div className="flex flex-col">
            <p className='text-sm'>{getDate()} - {episode.size} MB </p>
            <h1>{episode.title}</h1>
          </div>
          <div className="flex gap-2 justify-end items-center">
            {
              (position === 0 || ended) && playing?.src != episode.src ?
                secondsToStr(episode.duration) :
                <ProgressBar position={playing?.src == episode.src ? playingPosition : position}
                  total={episode.duration}
                  className={{ div: 'h-1', bar: 'rounded', innerBar: 'rounded' }} />
            }
            <button className="w-7 p-1 aspect-square shrink-0 flex justify-center items-center hover:text-accent-6 hover:p-[2px] bg-primary-7 rounded-full"
              onClick={() => play(episode)}
            >
              {icons.play}
            </button>

            <button className={`w-5 hover:text-accent-6 ${ended && 'text-primary-7'}`}
              title={ended ? t('mark_not_played') : t('mark_played')}
              onClick={() => {
                if (ended) {
                  setPosition(0)
                  updateEpisodeState(episode.src, episode.podcastUrl, 0, episode.duration)

                } else {
                  setPosition(episode.duration)
                  updateEpisodeState(episode.src, episode.podcastUrl, episode.duration, episode.duration)
                  if (playing?.src == episode.src) {
                    quitPlayer()
                  }
                }
              }}
            >
              {icons.check}
            </button>

            <button className={`w-7 hover:text-accent-6 ${inQueue && 'text-primary-7'}`}
              title={inQueue ? t('remove_queue') : t('add_queue')}
              onClick={() => {
                if (inQueue) {
                  queue.remove(episode.src)
                  setInqueue(false)
                } else {
                  queue.push(episode)
                  setInqueue(true)
                }
              }}
            >
              {icons.queue}
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