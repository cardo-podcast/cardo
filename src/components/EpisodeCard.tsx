import { useState } from "react"
import { EpisodeData, PodcastData } from ".."
import * as icons from "../Icons"

function EpisodeCard ({episode, podcast, play}: {episode: EpisodeData, podcast: PodcastData, play: () => void}) {
  const [imageError, setImageError] = useState(!episode.coverUrl)


  return(
    <div className="flex bg-zinc-800 hover:bg-zinc-600 cursor-pointer rounded-md min-h-20 p-2 justify-between gap-4"
    onClick={() => {
    }}
    >
      <img
      className="bg-zinc-700 h-16 aspect-square rounded-md"
      alt=""
      src={imageError? podcast.coverUrl :episode.coverUrl}
      onError={() => setImageError(true)}
      />

      <div className="flex gap-2 flex-col text-right w-full items-end justify-between">
        <h2 className="">{episode.title}</h2>
        <button className="w-6 p-[2px] aspect-square flex justify-center items-center hover:text-amber-600 bg-zinc-700 rounded-full"
        onClick={play}
        >
          {icons.play}
        </button>
      </div>
    </div>
  )
}

export default EpisodeCard