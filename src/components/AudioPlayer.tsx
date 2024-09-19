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
  play: (episode?: EpisodeData | undefined, localSrc?: string) => void
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
  const { dbLoaded, history, misc } = useDB()
  const [position, setPosition] = useState(0);


  const loadLastPlayed = async () => {
    if (audioRef.current == null) return

    const lastPlayed = await misc.getLastPlayed()
    if (lastPlayed) {
      load(lastPlayed)
    }
  }

  useEffect(() => {
    if (dbLoaded) {
      loadLastPlayed()
    }
  }, [dbLoaded])

  const load = async (episode: EpisodeData, localSrc?: string) => {
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
    if (localSrc) {
      audioRef.current.src = convertFileSrc(localSrc)
    } else {
      audioRef.current.src = episode.src
    }
    audioRef.current.load()

    const previousState = await history.get(episode?.src)

    if (previousState !== undefined && previousState.position < previousState.total) {
      audioRef.current.currentTime = previousState.position
      setPosition(previousState.position)
    }
  }

  const play = async (episode?: EpisodeData | undefined, localSrc?: string) => {
    if (audioRef.current == null) return

    if (episode !== undefined) {
      load(episode, localSrc)
    }

    audioRef.current.play()
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

      {showMenu && <div className="fixed z-10 top-0 left-0 w-full h-full" onClick={() => setShowMenu(false)}/>}
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


function AudioPlayer({ className = '' }) {
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);  // Volume State (MAX)
  const [isMuted, setIsMuted] = useState(false); // Control mute
  const [prevVolume, setPrevVolume] = useState<number>(volume); // Store the previous volume before muting
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

  const changeVolume = (newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  }

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

  const VolumeControl = ({
    setVolume,
    isMuted,
    setIsMuted,
    volumeIcon,
    muteIcon
  }: {
    setVolume: Dispatch<SetStateAction<number>>;
    isMuted: boolean;
    setIsMuted: Dispatch<SetStateAction<boolean>>;
    volumeIcon: JSX.Element;
    muteIcon: JSX.Element;
  }) => {
    const handleVolumeToggle = () => {
      if (isMuted) {
        // Restore the volume to the previous value before mute
        setVolume(prevVolume);
        setIsMuted(false);
      } else {
        // Store the current volume before muting
        setPrevVolume(volume);
        // Set volume to 0 if not muted
        setVolume(0);
        setIsMuted(true);
      }
    };
  
    return (
      <div className="flex items-center justify-center mt-1">
        <button
          //className="flex items-center justify-center hover:text-accent-6 w-7"
          className="hover:text-accent-6"

          onClick={handleVolumeToggle}
        >
          {isMuted ? muteIcon : volumeIcon}
        </button>
      </div>
    );
  };

  // update audio volume when `volume` state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [ volume ]);

  // Update the mute state based on the volume value
  useEffect(() => {
    setIsMuted(volume === 0);
  }, [volume]);

  return (
    <div className={`w-full flex bg-primary-10 border-t-2 border-primary-8 p-2 gap-4 ${audioRef.current?.src && playing ? 'visible' : 'hidden'} ${className}`}>
      {playing?.src &&
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
          onError={(e: SyntheticEvent<HTMLImageElement>) => {
            if (e.currentTarget.src === playing.podcast?.coverUrl) {
              e.currentTarget.src = appIcon
            } else {
              e.currentTarget.src = playing.podcast?.coverUrl ?? appIcon
            }
          }}
        />
      }


      <div className='w-full flex flex-col'>
        {playing && <h1 className="mb-1 line-clamp-1">{playing.title}</h1>}

        <div className="w-full flex items-center justify-center">
          <p>{secondsToStr(position)}</p>
          <input
            type="range"
            min="0"
            max={duration}
            value={position}
            onChange={(event) => changeTime(Number(event.target.value))}
            className="w-4/5 mx-1 h-[3px] bg-primary-3 accent-accent-6 stroke-white"
          />
          <p className="cursor-pointer"
            title={t('toggle_remaining_time')}
            onClick={() => updateSettings({ playback: { displayRemainingTime: !displayRemainingTime } })}>
            {secondsToStr(displayRemainingTime ? position - duration : duration)}
          </p>
        </div>

        <div className="grid grid-cols-4 w-full">
          <div className="flex justify-center items-center">
            {/* left side menu */}
          </div>
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
          <div className="flex justify-start items-center">
            <SpeedButton audioRef={audioRef} />
          </div>
          <div className="flex justify-center items-center">
          <VolumeControl
            setVolume={setVolume}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            volumeIcon={volumeIcon}
            muteIcon={muteIcon}
          /> 
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => {
              changeVolume(Number(e.target.value));
            }
          }
            
          className="mx-2 h-[3px] bg-primary-3 accent-accent-6 stroke-white"/>
          <p>{Math.round(volume * 100)}</p>
          </div>
        </div>

        <audio ref={audioRef} onLoadedMetadata={handleLoadedMetadata} className="hidden" />
      </div>

      <div className="group w-24 h-full aspect-square shrink-0">
        {/* extra width is to keep simetry */}
        <div className="w-full justify-end flex">
          <button className="w-7 group-hover:text-red-600 text-transparent"
            onClick={quit}
          >
            {closeIcon}
          </button>
        </div>
      </div>

    </div>

  );
}

export default AudioPlayer;