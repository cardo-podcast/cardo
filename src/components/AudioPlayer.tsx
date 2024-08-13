import React, { useRef, useEffect, useState, RefObject, createContext, ReactNode, useContext, Dispatch, SetStateAction } from "react";
import { secondsToStr } from "../utils";
import * as icons from "../Icons"
import { EpisodeData } from "..";
import { useDB } from "../DB";
import { useNavigate } from "react-router-dom";


export type AudioPlayerRef = {
  audioRef: RefObject<HTMLAudioElement>
  play: (episode?: EpisodeData | undefined) => void
  playing: EpisodeData | undefined,
  position: number,
  setPosition: Dispatch<SetStateAction<number>>
  onExit: () => Promise<void>
}


const PlayerContext = createContext<AudioPlayerRef | undefined>(undefined)

export const usePlayer = () => useContext(PlayerContext) as AudioPlayerRef

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState<EpisodeData>()
  const { history: { getEpisodeState } } = useDB()
  const [position, setPosition] = useState(0);
  const {history: {updateEpisodeState}} = useDB()

  const play = async (episode?: EpisodeData | undefined) => {
    if (audioRef.current == null) return

    if (episode !== undefined) {
      setPlaying(episode)

      audioRef.current.src = episode.src
      audioRef.current.load()

      const previousState = await getEpisodeState(episode?.src)

      if (previousState !== undefined && previousState.position < previousState.total) {
        audioRef.current.currentTime = previousState.position
        setPosition(previousState.position)
      }
    }

    audioRef.current.play()
  }

    const onExit = async() => {
      // save state if closing without pause
      if (audioRef.current == null || playing == null) return
      if (!audioRef.current.paused && audioRef.current.currentTime > 0) {
        await updateEpisodeState(playing.src,
          playing.podcastUrl,
          audioRef.current.currentTime,
          playing.duration
        )
      }
    }

  return (
    <PlayerContext.Provider value={{
      audioRef,
      play,
      playing,
      position,
      setPosition,
      onExit
    }}>
      {children}
    </PlayerContext.Provider>
  )
}


function AudioPlayer({ className = '' }) {
  const [duration, setDuration] = useState(0);
  const { history: { updateEpisodeState }, queue } = useDB()
  const { audioRef, play, playing, position, setPosition } = usePlayer()
  const navigate = useNavigate()

  useEffect(() => {
    if (audioRef.current == null || playing == null) return

    if (audioRef.current.paused && audioRef.current.currentTime > 0) {
      updateEpisodeState(playing.src,
        playing.podcastUrl,
        audioRef.current.currentTime,
        playing.duration
      )
    }

  }, [audioRef.current?.paused, playing])

  useEffect(() => {
    if (!playing || !audioRef.current?.ended) return

    updateEpisodeState(playing.src,
      playing.podcastUrl,
      playing.duration,
      playing.duration
    )

    play(queue.next(playing))

  }, [audioRef.current?.ended])

  useEffect(() => {
    if (audioRef.current) {
      const intervalId = setInterval(() => {
        if (audioRef.current) {
          setPosition(audioRef.current.currentTime);
        }
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [audioRef]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause()
    }
  };

  const handleSeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = Number(event.target.value);
      audioRef.current.currentTime = newTime;
      setPosition(newTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };


  return (
    <div className={`flex bg-zinc-950 text-slate-50 p-2 gap-3 ${audioRef.current?.src ? '' : 'hidden'} ${className}`}>
      {playing &&
        <img
          className="bg-zinc-700 h-full aspect-square rounded-md cursor-pointer"
          src={playing.coverUrl}
          alt=''
          onClick={() => {
            navigate('/episode-preview', {
              state: {
                episode: playing
              }
            })
          }}
        />
      }

      <div className={`flex flex-col justify-center w-full`}>
        {playing && <p className="text-sm">{playing.title}</p>}
        <div className="flex justify-center">

          <button
            className="flex items-center focus:outline-none hover: hover:text-amber-600 w-8"
            onClick={handlePlayPause}
          >
            {audioRef.current?.paused ? icons.play : icons.pause}
          </button>

        </div>
        <div className="flex justify-evenly items-center">
          <p>{secondsToStr(position)}</p>
          <input
            type="range"
            min="0"
            max={duration}
            value={position}
            onChange={handleSeekChange}
            className="w-full mx-4 h-1 bg-zinc-300 accent-amber-600"
          />
          <p>{secondsToStr(duration)}</p>
        </div>

        <audio ref={audioRef} onLoadedMetadata={handleLoadedMetadata} className="hidden" />
      </div>
    </div>

  );
}

export default AudioPlayer;