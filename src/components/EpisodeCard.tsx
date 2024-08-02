import { useState } from "react"
import { EpisodeData, PodcastData } from ".."

function EpisodeCard ({episode, podcast}: {episode: EpisodeData, podcast: PodcastData}) {
  const [imageError, setImageError] = useState(!episode.coverUrl)


  return(
    <div className="flex bg-zinc-800 hover:bg-zinc-600 cursor-pointer rounded-md h-20 p-2 justify-between gap-4"
    onClick={() => {
    }}
    >
      <img
      className="bg-zinc-700 h-full aspect-square rounded-md"
      src={imageError? podcast.coverUrl :episode.coverUrl}
      onError={() => {setImageError(true); console.log(episode.title)}}
      onInvalid={()=>console.log(episode.title)}
      />

      <div className="flex flex-col text-right">
        <h1>{episode.title}</h1>
      </div>
    </div>
  )
}

export default EpisodeCard