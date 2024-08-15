import { useState } from "react"
import { PodcastData } from ".."
import * as icons from "../Icons"
import { useNavigate } from "react-router-dom"


function PodcastCard ({podcast, callback}: {podcast: PodcastData, callback: ()=>void}) {
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()


  return(
    <div className="flex hover:bg-zinc-800 cursor-pointer h-20 p-2 justify-between border-b-2 border-zinc-800"
    onClick={() => {
      callback()
        navigate('/preview', {
          state: {
            podcast: podcast
          }
        })
    }}
    >
      {imageError?
        icons.photo:
        <img
        className="bg-zinc-700 h-full aspect-square rounded-md"
        alt=""
        src={podcast.coverUrl}
        onError={() => setImageError(true)}
        />
      }

      <div className="flex flex-col text-right">
        <p className="text-lg">{podcast.podcastName}</p>
        <p>{podcast.artistName}</p>
      </div>
    </div>
  )
}

export default PodcastCard