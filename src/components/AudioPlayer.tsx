import { useRef, useEffect, useState, RefObject, createContext, ReactNode, useContext, Dispatch, SetStateAction, useCallback } from "react";
import { secondsToStr } from "../utils";
import { play as playIcon, pause as pauseIcon, forward as forwardIcon, backwards as backwardsIcon } from "../Icons"
import { EpisodeData } from "..";
import { useDB } from "../DB";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../Settings";
import { useTranslation } from "react-i18next";
import { globalShortcut } from "@tauri-apps/api";



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
        audioRef.current.duration
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
  const { audioRef, play, playing, position, setPosition, quit } = usePlayer()
  const navigate = useNavigate()
  const [{ playback: { stepForward, stepBackwards, displayRemainingTime } }, updateSettings] = useSettings()
  const { t } = useTranslation()

  // #region MEDIA_KEYS
  useEffect(() => {
    if (!globalShortcut.isRegistered('MediaPlayPause')) {
      globalShortcut.register('MediaPlayPause', handlePlayPause)
    }

    if (!globalShortcut.isRegistered('MediaNextTrack')) {
      globalShortcut.register('MediaNextTrack', () => playNextInQueue)
    }

    // MediaPreviousTrack
  })
  // #endregion

  useEffect(() => {
    if (audioRef.current == null || playing == null) return

    if (audioRef.current.paused && audioRef.current.currentTime > 0) {
      updateEpisodeState(playing.src,
        playing.podcastUrl,
        audioRef.current.currentTime,
        audioRef.current.duration
      )
    }

  }, [audioRef.current?.paused, playing])

  useEffect(() => {
    if (!playing || !audioRef.current?.ended) return

    updateEpisodeState(playing.src,
      playing.podcastUrl,
      audioRef.current.duration,
      audioRef.current.duration
    )

    playNextInQueue() ?? quit()

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

  const playNextInQueue = () => {
    if (audioRef.current && playing) {
      if (queue.includes(playing.src)) {
        return play(queue.next(playing))
      }
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


      <div className={`w-full flex flex-col`}>
        {playing && <h1 className="mb-1 truncate">{playing.title}</h1>}

          <div className="w-full flex items-center justify-center">
            <p>{secondsToStr(position)}</p>
            <input
              type="range"
              min="0"
              max={duration}
              value={position}
              onChange={(event) => changeTime(Number(event.target.value))}
              className="w-4/5 mx-1 h-[3px] bg-primary-3 accent-accent-6"
            />
            <p className="cursor-pointer"
              title={t('toggle_remaining_time')}
              onClick={() => updateSettings({ playback: { displayRemainingTime: !displayRemainingTime } })}>
              {secondsToStr(displayRemainingTime ? position - duration : duration)}
            </p>
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


        <audio ref={audioRef} onLoadedMetadata={handleLoadedMetadata} className="hidden" />
      </div>
      
      <div className="w-24 aspect-square shrink-0">
        {/* space to keep simetry */}
      </div>

    </div>

  );
}

export default AudioPlayer;