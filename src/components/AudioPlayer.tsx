import { useRef, useEffect, useState, RefObject, createContext, ReactNode, useContext, Dispatch, SetStateAction, useCallback } from "react";
import { secondsToStr } from "../utils";
import { play as playIcon, pause as pauseIcon, forward as forwardIcon, backwards as backwardsIcon } from "../Icons"
import { EpisodeData } from "..";
import { useDB } from "../DB";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../Settings";



export type AudioPlayerRef = {
  audioRef: RefObject<HTMLAudioElement>
  play: (episode?: EpisodeData | undefined) => void
  playing: EpisodeData | undefined,
  position: number,
  setPosition: Dispatch<SetStateAction<number>>
  onExit: () => Promise<void>
  quit: () => void
}


const PlayerContext = createContext<AudioPlayerRef | undefined>(undefined)

export const usePlayer = () => useContext(PlayerContext) as AudioPlayerRef

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState<EpisodeData>()
  const { dbLoaded, history: { getEpisodeState, getLastPlayed, setLastPlaying } } = useDB()
  const [position, setPosition] = useState(0);
  const { history: { updateEpisodeState } } = useDB()


  const loadLastPlayed = async () => {
    if (audioRef.current == null) return

    const lastPlayed = await getLastPlayed()
    if (lastPlayed) {
      load(lastPlayed)
    }
  }

  useEffect(() => {
    if (dbLoaded) {
      loadLastPlayed()
    }
  }, [dbLoaded])

  const load = async (episode: EpisodeData) => {
    if (audioRef.current == null) return

    setPlaying(episode)
    audioRef.current.src = episode.src
    audioRef.current.load()

    const previousState = await getEpisodeState(episode?.src)

    if (previousState !== undefined && previousState.position < previousState.total) {
      audioRef.current.currentTime = previousState.position
      setPosition(previousState.position)
    }
  }

  const play = async (episode?: EpisodeData | undefined) => {
    if (audioRef.current == null) return

    if (episode !== undefined) {
      load(episode)
    }

    audioRef.current.play()
  }

  const quit = () => {
    if (audioRef.current == null) return

    audioRef.current.src = ''
    setPlaying(undefined)
    setLastPlaying() // revoke last playing
  }

  const onExit = useCallback(async () => {
    // save state if closing without pause
    if (audioRef.current == null || playing == null) return

    // save the opened episode to load it when opening app again
    await setLastPlaying(playing)

    if (!audioRef.current.paused && audioRef.current.currentTime > 0) {
      await updateEpisodeState(playing.src,
        playing.podcastUrl,
        audioRef.current.currentTime,
        playing.duration
      )
    }
  }, [playing])

  return (
    <PlayerContext.Provider value={{
      audioRef,
      play,
      playing,
      position,
      setPosition,
      onExit,
      quit
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
  const [{ playback: { stepForward, stepBackwards } },] = useSettings()

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

  const changeTime = (newTime: number, relative = false) => {
    if (audioRef.current) {

      if (relative) {
        newTime += audioRef.current.currentTime
      }


      newTime = Math.max(Math.min(audioRef.current.duration, newTime), 0)

      audioRef.current.currentTime = newTime
      setPosition(newTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };


  return (
    <div className={`w-full flex bg-primary-10 border-t-2 border-primary-8 p-2 gap-4 ${audioRef.current?.src && playing ? 'visible' : 'hidden'} ${className}`}>
      {playing &&
        <img
          className="w-24 aspect-square m-auto rounded-md cursor-pointer hover:p-1 transition-all"
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


      <div className={`flex flex-col w-full`}>
        {playing && <h1 className="mb-1 truncate">{playing.title}</h1>}

        <div className="w-7/12 flex flex-col absolute left-0 right-0 mx-auto mt-7 items-center justify-center">
          <div className="flex items-center w-full">
            <p>{secondsToStr(position)}</p>
            <input
              type="range"
              min="0"
              max={duration}
              value={position}
              onChange={(event) => changeTime(Number(event.target.value))}
              className="w-full mx-1 h-[3px] bg-primary-3 accent-accent-6"
            />
            <p>{secondsToStr(duration)}</p>
          </div>

          <div className="flex justify-center gap-3 items-center">

            <button
              className="flex flex-col items-center focus:outline-none hover: hover:text-accent-6 w-7"
              onClick={() => {
                changeTime(-1 * stepBackwards, true)
              }}
            >
              {backwardsIcon}
              <p className="text-xs text-center -mt-[7px]">{stepBackwards}</p>
            </button>

            <button
              className="flex items-center focus:outline-none hover: hover:text-accent-6 w-9 mb-2"
              onClick={handlePlayPause}
            >
              {audioRef.current?.paused ? playIcon : pauseIcon}
            </button>

            <button
              className="flex flex-col items-center focus:outline-none hover: hover:text-accent-6 w-7"
              onClick={() => {
                changeTime(stepForward, true)
              }}
            >
              {forwardIcon}
              <p className="text-xs text-center -mt-[7px]">{stepForward}</p>
            </button>
          </div>
        </div>


        <audio ref={audioRef} onLoadedMetadata={handleLoadedMetadata} className="hidden" />
      </div>
    </div>

  );
}

export default AudioPlayer;