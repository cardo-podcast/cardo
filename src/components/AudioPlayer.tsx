import { useRef, useEffect, useState, RefObject, createContext, ReactNode, useContext, Dispatch, SetStateAction, useCallback, SyntheticEvent } from 'react'
import { secondsToStr } from '../utils/utils'
import { play as playIcon, pause as pauseIcon, forward as forwardIcon, backwards as backwardsIcon, close as closeIcon, speedometer, volume as volumeIcon, mute as muteIcon } from '../Icons'
import { EpisodeData } from '..'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../engines/Settings'
import { useTranslation } from 'react-i18next'
import { globalShortcut } from '@tauri-apps/api'
import appIcon from '../../src-tauri/icons/icon.png'
import { convertFileSrc } from '@tauri-apps/api/tauri'
import round from 'lodash/round'
import { RangeInput } from './Inputs'
import { useDB } from '../ContextProviders'

export type AudioPlayerRef = {
  audioRef: RefObject<HTMLAudioElement>
  play: (episode?: EpisodeData | undefined, localSrc?: string) => void
  reload: () => void
  pause: () => void
  paused: boolean
  playing: EpisodeData | undefined
  position: number
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
  const [position, setPosition] = useState(0)

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
      history.update(playing.src, playing.podcastUrl, audioRef.current.currentTime, audioRef.current.duration)
    }

    setPlaying(episode)
    const localFile = downloads.includes(episode.src)
    if (localFile) {
      audioRef.current.src = convertFileSrc(localFile.localFile)
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
      await history.update(playing.src, playing.podcastUrl, audioRef.current.currentTime, audioRef.current.duration)
    }
  }, [playing])

  return (
    <PlayerContext.Provider
      value={{
        audioRef,
        play,
        reload: () => playing && load(playing),
        pause,
        paused: audioRef.current?.paused ?? false,
        playing,
        position,
        setPosition,
        onExit,
        quit,
      }}
    >
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
      <button className="hover: flex w-7 flex-col items-center hover:text-accent-6 focus:outline-none" onClick={() => setShowMenu(!showMenu)}>
        {speedometer}
        <p className="-mt-[6px] text-center text-[10px]">{playbackRate.toFixed(2)}</p>
      </button>

      {showMenu && <div className="fixed bottom-0 left-0 z-10 h-screen w-full" onClick={() => setShowMenu(false)} />}
      <div className={`${showMenu ? 'flex' : 'hidden'} absolute bottom-10 left-1/2 z-20 w-32 -translate-x-1/2 flex-col items-center justify-center gap-1 rounded-md border-2 border-primary-7 bg-primary-9 p-2`}>
        <div className="flex items-center gap-2">
          <button
            className="mb-1 flex items-center text-xl hover:text-accent-6"
            onClick={() => {
              if (audioRef.current) {
                setPlaybackRate((prev) => round(prev - settings.rateChangeStep, 2))
              }
            }}
          >
            ‒
          </button>

          <span>{playbackRate.toFixed(2)}</span>

          <button
            className="mb-1 flex items-center text-xl hover:text-accent-6"
            onClick={() => {
              if (audioRef.current) {
                setPlaybackRate((prev) => round(prev + settings.rateChangeStep, 2))
              }
            }}
          >
            +
          </button>
        </div>

        <div className="grid shrink-0 grid-flow-row grid-cols-3 gap-2 text-xs">
          {settings.playbackRatePresets.map((preset) => (
            <button
              key={preset}
              className={`w-8 rounded-md bg-primary-7 p-1 hover:bg-primary-6 disabled:bg-primary-8`}
              disabled={playbackRate === preset}
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
          ))}

          <button
            className="rounded-md bg-primary-7 p-1 hover:bg-primary-6 disabled:hidden"
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

  const [volume, setVolume] = useState(playbackSettings.volume) // volume is restored
  const [isMuted, setIsMuted] = useState(false) // Control mute

  const changeVolume = (newVolume: number) => {
    setVolume(newVolume)
  }

  useEffect(() => {
    // update volume in settings
    updateSettings({ playback: { volume } })

    // update audio volume when `volume` state changes
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // Update the mute state based on the volume value
  useEffect(() => {
    setIsMuted(volume === 0)
  }, [volume])

  return (
    <div className="flex items-center">
      <button className="flex hover:text-accent-6" onClick={() => setIsMuted(!isMuted)}>
        <span className="h-5 w-5">{isMuted ? muteIcon : volumeIcon}</span>
      </button>

      <RangeInput min={0} max={1} value={isMuted ? 0 : volume} step={0.01} units="%" onChange={changeVolume} className="ml-2 w-24" />
    </div>
  )
}

function AudioPlayer({ className = '' }) {
  const [duration, setDuration] = useState(0)
  const { history, queue, downloads } = useDB()
  const { audioRef, play, playing, position, setPosition, quit } = usePlayer()
  const navigate = useNavigate()
  const [
    {
      playback: { stepForward, stepBackwards, displayRemainingTime, removeFromQueueAtEnd, removeFromDownloadsAtEnd },
    },
    updateSettings,
  ] = useSettings()
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
      history.update(playing.src, playing.podcastUrl, audioRef.current.currentTime, audioRef.current.duration)
    }
  }, [audioRef.current?.paused, playing])

  useEffect(() => {
    if (!playing || !audioRef.current?.ended) return

    history.update(playing.src, playing.podcastUrl, audioRef.current.duration, audioRef.current.duration)

    playNextInQueue() ?? quit()
  }, [audioRef.current?.ended])

  const handlePlayPause = () => {
    if (audioRef.current) {
      audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause()
    }
  }

  const playNextInQueue = () => {
    if (audioRef.current && playing) {

      removeFromQueueAtEnd && queue.remove(playing.src)
      removeFromDownloadsAtEnd && downloads.removeFromDownloadList(playing.src)

      if (queue.includes(playing.src)) {
        const next = queue.next(playing)
        play(next)
        return next
      }
    }
  }

  const changeTime = (newTime: number, relative = false) => {
    if (audioRef.current) {
      if (relative) {
        newTime += audioRef.current.currentTime
      }

      newTime = Math.max(newTime, 0)
      newTime = Math.min(newTime, audioRef.current.duration - 0.01)

      audioRef.current.currentTime = newTime
      setPosition(newTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  return (
    <>
      <audio ref={audioRef} className="hidden" onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={(e: SyntheticEvent<HTMLAudioElement>) => setPosition(e.currentTarget.currentTime)} />

      {playing && (
        <div className={`flex w-full gap-3 bg-primary-10 p-2 ${className}`}>
          {/* COVER ON LEFT SIDE*/}
          <img
            className="z-10 m-auto aspect-square w-24 cursor-pointer rounded-md transition-all hover:p-1"
            src={playing.coverUrl}
            alt=""
            onClick={() => {
              navigate('/episode-preview', {
                state: {
                  episode: playing,
                },
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

          <div className="flex w-full flex-col">
            {/* TITLE ON THE TOP NEXT TO COVER */}
            <div className="group mb-1 inline-flex w-full justify-between">
              <h1 className="line-clamp-1">{playing.title}</h1>
              <button className="w-7 text-transparent group-hover:text-red-600" onClick={quit}>
                {closeIcon}
              </button>
            </div>

            {/* TIME BAR AND CONTROLS */}
            <div className="absolute bottom-2 left-1/2 flex w-full -translate-x-1/2 flex-col items-center">
              {/* TIME BAR */}
              <div className="flex w-2/3 items-center justify-center">
                <p className="select-none">{secondsToStr(position)}</p>
                <RangeInput min={0} max={duration} value={position} onChange={(value) => changeTime(value)} className="mx-4 w-full" />
                <p className="cursor-pointer select-none" title={t('toggle_remaining_time')} onClick={() => updateSettings({ playback: { displayRemainingTime: !displayRemainingTime } })}>
                  {secondsToStr(displayRemainingTime ? position - duration : duration)}
                </p>
              </div>

              {/* CONTROLS */}
              <div className="grid w-full grid-cols-3 px-4">
                <div className="flex items-center justify-center">{/* left side menu */}</div>

                {/* PLAYER BUTTONS ON THE MIDDLE */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    className="hover: flex w-7 flex-col items-center hover:text-accent-6 focus:outline-none"
                    onClick={() => {
                      changeTime(-1 * stepBackwards, true)
                    }}
                  >
                    {backwardsIcon}
                    <p className="-mt-[6px] text-center text-[10px]">{stepBackwards}</p>
                  </button>

                  <button className="hover: mb-2 flex w-9 items-center hover:text-accent-6 focus:outline-none" onClick={handlePlayPause}>
                    <span className="w-9">{audioRef.current?.paused ? playIcon : pauseIcon}</span>
                  </button>

                  <button
                    className="hover: flex w-7 flex-col items-center hover:text-accent-6 focus:outline-none"
                    onClick={() => {
                      changeTime(stepForward, true)
                    }}
                  >
                    {forwardIcon}
                    <p className="-mt-[6px] text-center text-[10px]">{stepForward}</p>
                  </button>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <SpeedButton audioRef={audioRef} />
                  <VolumeControl audioRef={audioRef} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AudioPlayer
