import { useEffect, useState } from "react"
import { EpisodeData, PodcastData } from ".."
import * as icons from "../Icons"
import { useNavigate } from "react-router-dom"
import { useIntersectionObserver } from "@uidotdev/usehooks"
import { secondsToStr } from "../utils"
import { useDB } from "../DB"

function EpisodeCard({ episode, podcast, play }: { episode: EpisodeData, podcast: PodcastData, play: () => void }) {
  const [imageSrc, setImageSrc] = useState(episode.coverUrl ?? podcast.coverUrl)
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()
  const {history: {getEpisodeState}} = useDB()
  const [episodeState, setEpisodeState] = useState(0)
  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px",
  });

  useEffect(() => {
    // set cover
    episode.coverUrl = episode.coverUrl ?? podcast.coverUrl
    setImageSrc(episode.coverUrl)
    setImageError(false)

    // update reproduction state
    getEpisodeState(episode.src).then(state => {
      if (state === undefined) return
      
      setEpisodeState(Math.floor(state.position / state.total * 100))
    })
  }, [episode, podcast.coverUrl, getEpisodeState])

  return (
    <div ref={ref} className="flex bg-zinc-800 hover:bg-zinc-600 cursor-pointer rounded-md min-h-20 p-2 justify-between gap-4"
      onClick={() => navigate('/episode-preview', {
        state: {
          episode: episode,
          podcastUrl: podcast.feedUrl
        }
      })}
    >
      {entry?.isIntersecting &&
        <>
          <div className="bg-zinc-700 h-16 aspect-square rounded-md">
            {
              imageError ?
                icons.photo :
                <img
                  className="rounded-md"
                  alt=""
                  src={imageSrc}
                  onError={() => setImageError(true)}
                />
            }
          </div>

          <div className="flex gap-2 flex-col text-right w-full items-end justify-between">
            <h2 className="">{episode.title}</h2>
            {episode.duration && <h3>{secondsToStr(episode.duration)}: {episodeState}%</h3>}
            <button className="w-6 p-[2px] aspect-square flex justify-center items-center hover:text-amber-600 bg-zinc-700 rounded-full"
              onClick={e => {
                e.stopPropagation()
                play()
              }}
            >
              {icons.play}
            </button>
          </div>
        </>
      }
    </div>
  )
}

export default EpisodeCard