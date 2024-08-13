import {  useEffect, useState } from "react"
import * as icons from "../Icons"
import { EpisodeData } from ".."
import { useLocation, useNavigate } from "react-router-dom"
import { usePlayer } from "../components/AudioPlayer"
import { useDB } from "../DB"
import { parsePodcastDetails } from "../utils"
import { useTranslation } from "react-i18next"


function EpisodePreview() {
  const [imageError, setImageError] = useState(false)
  const location = useLocation()
  const episode = location.state.episode as EpisodeData
  const {play} = usePlayer()
  const navigate = useNavigate()
  const {subscriptions: {getSubscription}} = useDB()
  const {t} = useTranslation()


  const fetchPodcastData = async(episode: EpisodeData) => {
    if (episode.podcast) return

    const subscription = await getSubscription(episode.podcastUrl)

    if (subscription !== undefined) {
      episode.podcast = subscription
    }else {
      episode.podcast = await parsePodcastDetails(episode.podcastUrl)
    }
  } 

  useEffect(() => {
    // asynchronously fetch podcast data to allow loadig podcast page clicking on cover
    fetchPodcastData(episode)
  }, [])

  return (
    <div className="p-2 w-full flex flex-col">
      <div className='flex justify-left w-full gap-3 bg-zinc-800 rounded-md mb-2 p-2'>
        {imageError ?
          icons.photo :
          <img
            className="bg-zinc-700 h-28 aspect-square rounded-md cursor-pointer"
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

        <div className="flex flex-col gap-2">
          <h1>{episode.title}</h1>
          <div className="flex gap-2">
            <button className="w-6 p-[2px] aspect-square flex justify-center items-center hover:text-amber-600 bg-zinc-700 rounded-full"
              onClick={() => play(episode)}
            >
              {icons.play}
            </button>
          </div>
        </div>
      </div>
      <div className="bg-zinc-800 rounded-md p-3 whitespace-pre-line"
            dangerouslySetInnerHTML={{__html: episode.description}}/>
    </div>
  )
}

export default EpisodePreview