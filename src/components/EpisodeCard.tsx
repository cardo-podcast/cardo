import { useEffect, useRef, useState } from "react"
import { EpisodeData } from ".."
import * as icons from "../Icons"
import { useNavigate } from "react-router-dom"
import { useIntersectionObserver } from "@uidotdev/usehooks"
import { secondsToStr } from "../utils"
import { useDB } from "../DB"
import ProgressBar from "./ProgressBar"
import { useSettings } from "../Settings"
import { ContextMenu } from "./ContextMenu"
import { SwitchState } from "./Inputs"





function EpisodeCard({ episode, play }: { episode: EpisodeData, play: () => void }) {
  const [imageError, setImageError] = useState(false)

  const { history: { getEpisodeState, updateEpisodeState } } = useDB()
  const [reprState, setReprState] = useState({ position: 0, total: episode.duration, complete: false })

  const navigate = useNavigate()
  const { globals: { locale } } = useSettings()
  const [date, setDate] = useState('')
  const contextMenuTarget = useRef<HTMLDivElement>(null)

  const [filtered, setFiltered] = useState(false)
  const podcastSettings = useSettings().getPodcastSettings(episode.podcastUrl)

  const {queue} = useDB()
  const [inQueue, setInqueue] = useState(queue.queue.map(ep => ep.src).includes(episode.src))

  
  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px",
  });

  useEffect(() => {
    if (!entry?.isIntersecting) return

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
  }, [entry?.isIntersecting, episode, getEpisodeState, locale])

  useEffect(() => {
    const xor = (setting: SwitchState, state: boolean) => {
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
              podcastUrl: episode.podcastUrl
            }
          })
        }}
      >

        <ContextMenu target={contextMenuTarget}>
          <div className="bg-zinc-700 max-w-60 text-zinc-300 p-2 rounded-md">
            <p className="mb-2 truncate text-xs text-zinc-400">{episode.title}</p>
            <button className="w-full text-left text-sm hover:text-zinc-50"
              onClick={() => {
                if (reprState.complete) {
                  updateEpisodeState(episode.src, episode.podcastUrl,
                    0, episode.duration)
                    setReprState({complete: false, position:0, total:episode.duration})
                } else {
                  updateEpisodeState(episode.src, episode.podcastUrl,
                    episode.duration, episode.duration)
                    setReprState({complete: true, position:episode.duration, total:episode.duration})
                }
              }
              }>
              Mark as {reprState.complete ? 'not played' : 'played'}
            </button>
            <button className="w-full text-left text-sm hover:text-zinc-50"
            onClick={async()=>{
              if (inQueue) {
                await queue.remove(episode.src)
                setInqueue(false)
              } else {
                await queue.add(episode)
                setInqueue(true)
              }
            }}
            >
              {inQueue ? 'Remove from Queue' : 'Add to queue'}
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
                    src={episode.coverUrl}
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