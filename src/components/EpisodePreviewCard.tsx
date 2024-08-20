/*Compact variation of EpisodeCard */

import { useEffect, useState } from "react";
import { EpisodeData, NewEpisodeData } from "..";
import * as icons from "../Icons"
import { useNavigate } from "react-router-dom";
import ProgressBar from "./ProgressBar";
import { useDB } from "../DB";
import { usePlayer } from "./AudioPlayer";
import { useSettings } from "../Settings";
import { useTranslation } from "react-i18next";



export default function EpisodePreviewCard({ episode }: { episode: EpisodeData | NewEpisodeData }) {
  const [imageError, setImageError] = useState(false)
  const navigate = useNavigate()
  const [position, setPosition] = useState(0)
  const { history: { getEpisodeState } } = useDB()
  const { play, playing, position: playingPosition } = usePlayer()
  const [{ globals: { locale } },] = useSettings()
  const {t} = useTranslation()

  useEffect(() => {
    getEpisodeState(episode.src).then(
      episode => setPosition(episode?.position ?? 0)
    )
  }, [])



  return (
    <div className="flex flex-col w-24 flex-shrink-0 rounded-md hover:p-1 cursor-pointer transition-all duration-100 amber-600">
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
        <ProgressBar position={playing?.src == episode.src ? playingPosition : position}
          total={episode.duration}
          showTime={false}
          className={{ div: "h-[5px]" }} />
        <button className="absolute bottom-2 right-2 bg-accent-5 w-8 p-[3px] aspect-square flex justify-center items-center hover:p-0 border-2 border-accent-6 rounded-full"
          onClick={e => {
            e.stopPropagation()
            play(episode)
          }}
        >
          {icons.play}
        </button>
      </div>
      <div className="relative">
        <h1 className="text-sm line-clamp-2" title={episode.title}>{episode.title}</h1>
        <div className="flex items-center gap-2 ">
          {
            (episode as NewEpisodeData).new &&
            <span className="h-2 w-2 rounded-full bg-accent-5" title={t('new')}/>
          }
          <h2 className="0 text-sm">
            {
              episode.pubDate.toLocaleDateString(locale, {
                day: 'numeric',
                month: 'short',
                year: episode.pubDate.getFullYear() < (new Date().getFullYear()) ? 'numeric' : undefined
              })
            }
          </h2>
        </div>
      </div>
    </div>
  )
}