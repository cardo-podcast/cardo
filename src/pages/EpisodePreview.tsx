import { useState } from "react"
import * as icons from "../Icons"
import { EpisodeData } from ".."
import { useLocation } from "react-router-dom"



function EpisodePreview({ play }: { play: (episode?: EpisodeData) => void}) {
  const [imageError, setImageError] = useState(false)
  const location = useLocation()
  const episode = location.state.episode as EpisodeData

  return (
    <div className="p-2 w-full flex flex-col">
      <div className='flex justify-left w-full gap-3 bg-zinc-800 rounded-md mb-2 p-2'>
        {imageError ?
          icons.photo :
          <img
            className="bg-zinc-700 h-28 aspect-square rounded-md"
            src={episode.coverUrl}
            alt=""
            onError={() => setImageError(true)}
          />
        }

        <div className="flex flex-col gap-2">
          <h1>{episode.title}</h1>
          <div className="flex gap-2">
            <button className="w-6 p-[2px] aspect-square flex justify-center items-center hover:text-amber-600 bg-zinc-700 rounded-full"
              onClick={() => play !== undefined && play(episode)}
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