import { useState } from "react"
import { PodcastData } from ".."
import * as icons from "../Icons"
import { useNavigate } from "react-router-dom"


function PodcastCard ({result, endSearch}: {result: PodcastData, endSearch: ()=>void}) {
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()


  return(
    <div className="flex bg-zinc-800 hover:bg-zinc-600 cursor-pointer rounded-md h-20 p-2 justify-between gap-4"
    onClick={() => {
        endSearch()
        navigate('/preview', {
          state: {
            podcast: result
          }
        })
    }}
    >
      {imageError?
        icons.photo:
        <img
        className="bg-zinc-700 h-full aspect-square rounded-md"
        src={result.coverUrl}
        onError={() => setImageError(true)}
        />
      }

      <div className="flex flex-col text-right">
        <p className="text-lg">{result.podcastName}</p>
        <p>{result.artistName}</p>
      </div>
    </div>
  )
}

export default PodcastCard