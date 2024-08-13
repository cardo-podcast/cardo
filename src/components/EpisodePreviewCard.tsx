/*Compact variation of EpisodeCard */

import { useEffect, useState } from "react";
import { EpisodeData } from "..";
import * as icons from "../Icons"
import { useNavigate } from "react-router-dom";
import ProgressBar from "./ProgressBar";
import { useDB } from "../DB";
import { usePlayer } from "./AudioPlayer";



export default function EpisodePreviewCard({ episode }: { episode: EpisodeData }) {
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()
  const [position, setPosition] = useState(0)
  const { history: {getEpisodeState} } = useDB()
  const { play, playing, position: playingPosition } = usePlayer()

  useEffect(() => {
    getEpisodeState(episode.src).then(
      episode => setPosition(episode?.position ?? 0)
    )
  }, [])


  return (
    <div className="flex flex-col w-32 flex-shrink-0 rounded-md hover:p-1 cursor-default">
      <div className='flex flex-col rounded-md overflow-hidden relative'>
      {
        imageError ?
          icons.photo :
          <img
            className='w-full'
            onClick={() => {
              navigate('/episode-preview', {
                state: {
                  episode: episode,
                }
              })
            }}
            alt=""
            src={episode.coverUrl}
            onError={() => setImageError(true)}
          />
      }
      <ProgressBar position={playing?.src == episode.src? playingPosition: position}
                  total={episode.duration}
                  showTime={false}
                  className={{div: "h-[5px]"}}/>
      <button className="absolute bottom-2 right-2 bg-amber-500 w-8 p-[2px] aspect-square flex justify-center items-center hover:text-amber-600 border-2 border-amber-600 rounded-full"
                  onClick={e => {
                    e.stopPropagation()
                    play(episode)
                  }}
                >
                  {icons.play}
                </button>
      </div>
      <h1 className="text-sm line-clamp-2">{episode.title}</h1>
    </div>
  )
}