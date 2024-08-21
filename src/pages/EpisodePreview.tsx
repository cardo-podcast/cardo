import { useEffect, useState } from "react"
import * as icons from "../Icons"
import { EpisodeData } from ".."
import { useLocation, useNavigate } from "react-router-dom"
import { usePlayer } from "../components/AudioPlayer"
import { useDB } from "../DB"
import { parsePodcastDetails, secondsToStr } from "../utils"
import { useTranslation } from "react-i18next"
import ProgressBar from "../components/ProgressBar"
import { useSettings } from "../Settings"


function EpisodePreview() {
  const [imageError, setImageError] = useState(false)
  const location = useLocation()
  const episode = location.state.episode as EpisodeData
  const [position, setPosition] = useState(0)
  const { play, playing, position: playingPosition } = usePlayer()
  const navigate = useNavigate()
  const { subscriptions: { getSubscription } } = useDB()
  const { t } = useTranslation()
  const { history: { getEpisodeState } } = useDB()
  const [{ globals: { locale } },] = useSettings()


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
      episode => setPosition(episode?.position ?? 0)
    )
  }, [])

  return (
    <div className="p-2 w-full flex flex-col">
      <div className='flex justify-left w-full gap-3 mb-2 p-2 pb-3 border-b-2 border-primary-8'>
        {imageError ?
          icons.photo :
          <img
            className="bg-primary-8 h-28 aspect-square rounded-md cursor-pointer hover:p-1"
            src={episode.coverUrl}
            alt=""
            onError={() => setImageError(true)}
            title={t('open_podcast')}
            onClick={() => {
              navigate('/preview', {
                state: {
                  podcast: episode.podcast
                }
              })
            }}
          />
        }

        <div className="flex flex-col gap-2 justify-between p-1 w-full">
          <div className="flex flex-col">
            <p className='text-sm'>{getDate()} - {Math.round(episode.size / 1000000)} MB </p>
            <h1>{episode.title}</h1>
          </div>
          <div className="flex gap-2 justify-end items-center">
            {
              (position === 0 || position >= episode.duration) && playing?.src != episode.src ?
                secondsToStr(episode.duration) :
                <ProgressBar position={playing?.src == episode.src ? playingPosition : position}
                  total={episode.duration}
                  className={{ div: 'h-1', bar: 'rounded', innerBar: 'rounded' }} />
            }
            <button className="w-7 p-[2px] aspect-square flex justify-center items-center hover:text-accent-6 bg-primary-7 rounded-full"
              onClick={() => play(episode)}
            >
              {icons.play}
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