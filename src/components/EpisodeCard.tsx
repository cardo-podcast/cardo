import { useEffect, useState } from "react"
import { EpisodeData, PodcastData } from ".."
import * as icons from "../Icons"
import { useNavigate } from "react-router-dom"
import { useIntersectionObserver } from "@uidotdev/usehooks"
import { secondsToStr } from "../utils"
import { useDB } from "../DB"
import ProgressBar from "./ProgressBar"

function EpisodeCard({ episode, podcast, play }: { episode: EpisodeData, podcast: PodcastData, play: () => void }) {
  const [imageSrc, setImageSrc] = useState(episode.coverUrl ?? podcast.coverUrl)
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()
  const { history: { getEpisodeState } } = useDB()
  const [reprState, setReprState] = useState({ position: 0, total: episode.duration, complete: false })
  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px",
  });

  useEffect(() => {
    if (!entry?.isIntersecting) return
    
    // set cover
    episode.coverUrl = episode.coverUrl ?? podcast.coverUrl
    setImageSrc(episode.coverUrl)
    setImageError(false)

    // update reproduction state
    getEpisodeState(episode.src).then(state => {
      if (state === undefined) return

      setReprState({ position: state.position, total: state.total, complete:  state.position === state.total})
    })
  }, [entry?.isIntersecting, episode, podcast.coverUrl, getEpisodeState])

  return (
    <div ref={ref} className={`flex ${reprState.complete? 'text-zinc-500': ''} hover:bg-zinc-800 cursor-pointer rounded-md min-h-20 p-2 justify-between gap-4`}
      onClick={() => navigate('/episode-preview', {
        state: {
          episode: episode,
          podcastUrl: podcast.feedUrl
        }
      })}
    >
      {entry?.isIntersecting &&
        <>
          <div className="h-16 aspect-square rounded-md">
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
            <div className="flex w-full gap-2 justify-end">
              {
                (reprState.position === 0 ||
                reprState.complete) ?
                secondsToStr(reprState.total):
                <ProgressBar position={reprState.position} total={reprState.total} />
              }
              <button className="w-7 p-[2px] aspect-square flex justify-center items-center hover:text-amber-600 border-2 border-zinc-600 rounded-full"
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
  )
}

export default EpisodeCard