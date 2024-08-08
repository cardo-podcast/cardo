import { useEffect, useRef, useState } from "react"
import { EpisodeData, PodcastData } from ".."
import * as icons from "../Icons"
import { useNavigate } from "react-router-dom"
import { useIntersectionObserver } from "@uidotdev/usehooks"
import { secondsToStr } from "../utils"
import { useDB } from "../DB"
import ProgressBar from "./ProgressBar"
import { useSettings } from "../Settings"
import { ContextMenu } from "./ContextMenu"
import { SwitchState } from "./Inputs"





function EpisodeCard({ episode, podcast, play }: { episode: EpisodeData, podcast: PodcastData, play: () => void }) {
  const [imageSrc, setImageSrc] = useState(episode.coverUrl ?? podcast.coverUrl)
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()
  const { history: { getEpisodeState, updateEpisodeState } } = useDB()
  const { globals: { locale } } = useSettings()
  const [reprState, setReprState] = useState({ position: 0, total: episode.duration, complete: false })
  const [date, setDate] = useState('')
  const contextMenuTarget = useRef<HTMLDivElement>(null)
  const [filtered, setFiltered] = useState(false)
  const podcastSettings = useSettings().getPodcastSettings(podcast.feedUrl)
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

    // set print date
    const episodeYear = episode.pubDate.getFullYear()
    const actualYear = new Date().getFullYear()

    setDate(episode.pubDate
      .toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: episodeYear < actualYear ? 'numeric' : undefined
      }
      )
    )

    // update reproduction state
    getEpisodeState(episode.src).then(state => {
      if (state !== undefined) {
        setReprState({ position: state.position, total: state.total, complete: state.position === state.total })
      } else {
        // render a not played episode
        setReprState({ position: 0, total: episode.duration, complete: false })
      }

    })
  }, [entry?.isIntersecting, episode, podcast.coverUrl, getEpisodeState, locale])

  useEffect(() => {
    const xor = (setting: SwitchState, state: boolean) => {
      console.log(episode.title, setting, state)
      return (setting === SwitchState.True && !state) ||
              (setting === SwitchState.False && state)
    }

    setFiltered(xor(podcastSettings.filter.played, reprState.complete))

  }, [reprState, podcastSettings.filter.played])


  if (filtered) return <></>


  return (
    <div ref={contextMenuTarget}>
      <div ref={ref} className={`flex ${reprState.complete ? 'text-zinc-500' : ''} hover:bg-zinc-800 cursor-default rounded-md min-h-20 p-2 justify-between gap-4`}
        onClick={() => {
          navigate('/episode-preview', {
            state: {
              episode: episode,
              podcastUrl: podcast.feedUrl
            }
          })
        }}
      >

        <ContextMenu target={contextMenuTarget}>
          <div className="bg-zinc-700 max-w-60 text-zinc-300 p-2 rounded-md">
            <p className="mb-2 truncate text-xs text-zinc-400">{episode.title}</p>
            <button className="w-full text-left text-sm hover:text-zinc-50"
              onClick={() => {
                console.log('HEY')
                if (reprState.complete) {
                  updateEpisodeState(episode.src, podcast.feedUrl,
                    0, episode.duration)
                    setReprState({complete: false, position:0, total:episode.duration})
                } else {
                  updateEpisodeState(episode.src, podcast.feedUrl,
                    episode.duration, episode.duration)
                    setReprState({complete: true, position:episode.duration, total:episode.duration})
                }
              }
              }>
              Mark as {reprState.complete ? 'not played' : 'played'}
            </button>
          </div>
        </ContextMenu>

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

            <div className="flex flex-col text-right w-full items-end justify-between">
              <p className="text-sm w-full text-left">{date} - {Math.round(episode.size / 1000000)} MB </p>
              <h2 className="mb-2">{episode.title}</h2>
              <div className="flex w-full gap-2 justify-end">
                {
                  (reprState.position === 0 ||
                    reprState.complete) ?
                    secondsToStr(reprState.total) :
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
    </div>
  )
}

export default EpisodeCard