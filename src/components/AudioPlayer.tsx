import { useRef, useEffect, useState, RefObject, createContext, ReactNode, useContext, Dispatch, SetStateAction, useCallback, SyntheticEvent } from "react";
import { secondsToStr } from "../utils/utils";
import { play as playIcon, pause as pauseIcon, forward as forwardIcon, backwards as backwardsIcon, close as closeIcon, speedometer, volume as volumeIcon, mute as muteIcon } from "../Icons"
import { EpisodeData } from "..";
import { useDB } from "../DB/DB";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../engines/Settings";
import { useTranslation } from "react-i18next";
import { globalShortcut } from "@tauri-apps/api";
import appIcon from '../../src-tauri/icons/icon.png'
import { convertFileSrc } from "@tauri-apps/api/tauri";
import round from "lodash/round";



export type AudioPlayerRef = {
  audioRef: RefObject<HTMLAudioElement>
  play: (episode?: EpisodeData | undefined, localSrc?: string) => void,
  pause: () => void,
  paused: boolean,
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
  const { history, misc, downloads } = useDB()
  const [position, setPosition] = useState(0);


  const loadLastPlayed = async () => {
    if (audioRef.current == null) return

    const lastPlayed = await misc.getLastPlayed()
    if (lastPlayed) {
      load(lastPlayed)
    }
  }

  useEffect(() => {
    if (downloads.loaded) {
      loadLastPlayed()
    }
  }, [downloads.loaded])

  const load = async (episode: EpisodeData) => {
    if (audioRef.current == null) return

    // update state if other episode was being played
    if (playing && !audioRef.current.paused && audioRef.current.currentTime > 0) {
      history.update(playing.src,
        playing.podcastUrl,
        audioRef.current.currentTime,
        audioRef.current.duration
      )
    }

    setPlaying(episode)
    const localFile = downloads.includes(episode.src)
    if (localFile) {
      audioRef.current.src = convertFileSrc(localFile.localFile)
    } else {
      audioRef.current.src = episode.src
    }
    console.log('SRC: ', audioRef.current.src)
    audioRef.current.load()

    const previousState = await history.get(episode?.src)

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

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }

  const quit = () => {
    if (audioRef.current == null) return

    audioRef.current.src = ''
    setPlaying(undefined)
    misc.setLastPlaying() // revoke last playing
  }

  const onExit = useCallback(async () => {
    // save state if closing without pause
    if (audioRef.current == null || playing == null) return

    // save the opened episode to load it when opening app again
    await misc.setLastPlaying(playing)

    if (!audioRef.current.paused && audioRef.current.currentTime > 0) {
      await history.update(playing.src,
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
      pause,
      paused: audioRef.current?.paused ?? false,
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




function SpeedButton({ audioRef }: { audioRef: RefObject<HTMLAudioElement> }) {
  const [showMenu, setShowMenu] = useState(false)
  const [{ playback: settings }, updateSettings] = useSettings()
  const [playbackRate, setPlaybackRate] = useState(settings.playbackRate)
  const { t } = useTranslation()


  useEffect(() => {
    if (audioRef.current) {
      // load settings value first time
      audioRef.current.playbackRate = settings.playbackRate
    }
  }, [audioRef.current?.src])

  useEffect(() => {
    if (audioRef.current) {

      audioRef.current.playbackRate = playbackRate
      settings.playbackRate = playbackRate
      updateSettings({ playback: settings })
    }
  }, [playbackRate])

  return (
    <div className="relative">
      <button className="flex flex-col items-center focus:outline-none hover: hover:text-accent-6 w-7"
        onClick={() => setShowMenu(!showMenu)}
      >
        {speedometer}
        <p className="text-[10px] text-center -mt-[6px]">{playbackRate.toFixed(2)}</p>
      </button>

      {showMenu && <div className="fixed z-10 top-0 left-0 w-full h-full" onClick={() => setShowMenu(false)} />}
      <div className={`${showMenu ? 'flex' : 'hidden'} flex-col absolute z-20 gap-1 items-center justify-center bottom-10 left-1/2 -translate-x-1/2 rounded-md bg-primary-9 border-2 border-primary-7 p-2 w-32`}>
        <div className="flex items-center gap-2">
          <button className="flex items-center text-xl mb-1 hover:text-accent-6"
            onClick={() => {
              if (audioRef.current) {
                setPlaybackRate(prev => round(prev - settings.rateChangeStep, 2))
              }
            }}
          >
            ‒
          </button>

          <span>{playbackRate.toFixed(2)}</span>

          <button className="flex items-center text-xl mb-1 hover:text-accent-6"
            onClick={() => {
              if (audioRef.current) {
                setPlaybackRate(prev => round(prev + settings.rateChangeStep, 2))
              }
            }}
          >
            +
          </button>
        </div>

        <div className="grid grid-flow-row grid-cols-3 gap-2 text-xs shrink-0">
          {
            settings.playbackRatePresets.map(preset => (
              <button key={preset} className={`bg-primary-7 hover:bg-primary-6 disabled:bg-primary-8 rounded-md p-1 w-8`}
                disabled={(playbackRate === preset)}
                title={t('right_click_remove_preset')}
                onContextMenu={() => {
                  const deleteIndex = settings.playbackRatePresets.indexOf(preset)
                  settings.playbackRatePresets.splice(deleteIndex, 1)
                  updateSettings({ playback: { playbackRatePresets: settings.playbackRatePresets } })
                }}
                onClick={() => {
                  setPlaybackRate(preset)
                }}
              >
                {preset.toFixed(2)}
              </button>
            ))
          }

          <button className="bg-primary-7 hover:bg-primary-6 disabled:hidden rounded-md p-1"
            disabled={settings.playbackRatePresets.includes(playbackRate)}
            title={t('add')}
            onClick={() => {
              settings.playbackRatePresets.push(playbackRate)
              settings.playbackRatePresets.sort((a, b) => a - b)
              updateSettings({ playback: { playbackRatePresets: settings.playbackRatePresets } })
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}


function VolumeControl({ audioRef }: { audioRef: RefObject<HTMLAudioElement> }) {
  const [{ playback: playbackSettings }, updateSettings] = useSettings()

  const [volume, setVolume] = useState(playbackSettings.volume); // volume is restored
  const [isMuted, setIsMuted] = useState(false); // Control mute

  const changeVolume = (newVolume: number) => {
    setVolume(newVolume);
  }

  useEffect(() => {
    // update volume in settings
    updateSettings({ playback: { volume } })

    // update audio volume when `volume` state changes
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted]);

  // Update the mute state based on the volume value
  useEffect(() => {
    setIsMuted(volume === 0);
  }, [volume]);

  return (
    <div className="flex items-center">
      <button
        className="hover:text-accent-6 flex"
        onClick={() => setIsMuted(!isMuted)}
      >
        <span className="w-5 h-5">{isMuted ? muteIcon : volumeIcon}</span>
      </button>

      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={isMuted ? 0 : volume}
        onChange={(e) => {
          changeVolume(Number(e.target.value));
        }}
        title={`${Math.round(volume * 100)} %`}
        className="ml-2 h-[3px] bg-primary-3 accent-accent-6 stroke-white w-24" />

    </div>
  );
};


function AudioPlayer({ className = '' }) {
  const [duration, setDuration] = useState(0);
  const { history, queue } = useDB()
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
  }, [])
  // #endregion

  useEffect(() => {
    if (audioRef.current == null || playing == null) return

    if (audioRef.current.paused && audioRef.current.currentTime > 0) {
      history.update(playing.src,
        playing.podcastUrl,
        audioRef.current.currentTime,
        audioRef.current.duration
      )
    }

  }, [audioRef.current?.paused, playing])

  useEffect(() => {
    if (!playing || !audioRef.current?.ended) return

    history.update(playing.src,
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
  }, []);

  const handlePlayPause = () => {
    if (audioRef.current) {
      audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause()
    }
  };

  const playNextInQueue = () => {
    if (audioRef.current && playing) {
      if (queue.includes(playing.src)) {
        const next = queue.next(playing)
        play(next)
        return next
      }
    }
  };


  const changeTime = (newTime: number, relative = false) => {
    if (audioRef.current) {

      if (relative) {
        newTime += audioRef.current.currentTime
      }


      newTime = Math.max(newTime, 0)

      if (newTime >= audioRef.current.duration) {
        playNextInQueue() ?? quit()
      } else {
        audioRef.current.currentTime = newTime
        setPosition(newTime)
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  return (
    <>
      <audio ref={audioRef} onLoadedMetadata={handleLoadedMetadata} className="hidden" />

      {
        playing &&

        <div className={`w-full flex gap-3 bg-primary-10 border-t-2 border-primary-8 p-2 ${className}`}>
          {/* COVER ON LEFT SIDE*/}
          <img
            className="w-24 z-10 aspect-square m-auto rounded-md cursor-pointer hover:p-1 transition-all"
            src={playing.coverUrl}
            alt=''
            onClick={() => {
              navigate('/episode-preview', {
                state: {
                  episode: playing
                }
              })
            }}
            onError={(e: SyntheticEvent<HTMLImageElement>) => {
              if (e.currentTarget.src === playing.podcast?.coverUrl) {
                e.currentTarget.src = appIcon
              } else {
                e.currentTarget.src = playing.podcast?.coverUrl ?? appIcon
              }
            }}
          />

          <div className="flex flex-col w-full">
            {/* TITLE ON THE TOP NEXT TO COVER */}
            <div className="group mb-1 inline-flex w-full justify-between">
              <h1 className="line-clamp-1">{playing.title}</h1>
              <button className="w-7 group-hover:text-red-600 text-transparent"
                onClick={quit}
              >
                {closeIcon}
              </button>
            </div>

            {/* TIME BAR AND CONTROLS */}
            <div className='absolute w-full bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center'>

              {/* TIME BAR */}
              <div className="w-2/3 flex items-center justify-center">
                <p className="select-none">{secondsToStr(position)}</p>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={position}
                  onChange={(event) => changeTime(Number(event.target.value))}
                  className="w-full mx-1 h-[3px] bg-primary-3 accent-accent-6 stroke-white"
                />
                <p className="select-none cursor-pointer"
                  title={t('toggle_remaining_time')}
                  onClick={() => updateSettings({ playback: { displayRemainingTime: !displayRemainingTime } })}>
                  {secondsToStr(displayRemainingTime ? position - duration : duration)}
                </p>
              </div>

              {/* CONTROLS */}
              <div className="grid grid-cols-3 w-full px-4">
                <div className="flex justify-center items-center">
                  {/* left side menu */}
                </div>

                {/* PLAYER BUTTONS ON THE MIDDLE */}
                <div className="flex justify-center gap-3 items-center">
                  <button
                    className="flex flex-col items-center focus:outline-none hover: hover:text-accent-6 w-7"
                    onClick={() => {
                      changeTime(-1 * stepBackwards, true)
                    }}
                  >
                    {backwardsIcon}
                    <p className="text-[10px] text-center -mt-[6px]">{stepBackwards}</p>
                  </button>

                  <button
                    className="flex items-center focus:outline-none hover: hover:text-accent-6 w-9 mb-2"
                    onClick={handlePlayPause}
                  >
                    <span className="w-9">{audioRef.current?.paused ? playIcon : pauseIcon}</span>
                  </button>

                  <button
                    className="flex flex-col items-center focus:outline-none hover: hover:text-accent-6 w-7"
                    onClick={() => {
                      changeTime(stepForward, true)
                    }}
                  >
                    {forwardIcon}
                    <p className="text-[10px] text-center -mt-[6px]">{stepForward}</p>
                  </button>

                </div>
                <div className="flex justify-between items-center gap-4">
                  <SpeedButton audioRef={audioRef} />
                  <VolumeControl audioRef={audioRef} />
                </div>
              </div>
            </div>
          </div>
        </div>

      }
    </>
  )
}

export default AudioPlayer;