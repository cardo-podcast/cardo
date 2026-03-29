import { useRef, useEffect, useState, RefObject, ReactNode, useCallback, SyntheticEvent } from 'react'
import { secondsToStr } from '../utils/utils'
import {
  play as playIcon,
  pause as pauseIcon,
  forward as forwardIcon,
  backwards as backwardsIcon,
  close as closeIcon,
  speedometer,
  volume as volumeIcon,
  mute as muteIcon,
} from '../Icons'
import { EpisodeData } from '..'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../engines/Settings'
import { useTranslation } from 'react-i18next'
import appIcon from '../../src-tauri/icons/icon.png'
import { convertFileSrc } from '@tauri-apps/api/core'
import round from 'lodash/round'
import { RangeInput } from './Inputs'
import { PlayerContext, PlayerPositionContext, useHistory, useQueue, useDownloads, useMisc, usePlayer, usePlayerPosition } from '../ContextProviders'
import { EpisodeCover, proxyUrl } from './Cover'
import * as globalShortcut from "@tauri-apps/plugin-global-shortcut"

function PositionProvider({ audioRef, children }: { audioRef: RefObject<HTMLAudioElement | null>; children: ReactNode }) {
  const [position, setPosition] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) { return }
    const onTimeUpdate = () => setPosition(audio.currentTime)
    audio.addEventListener('timeupdate', onTimeUpdate)
    return () => audio.removeEventListener('timeupdate', onTimeUpdate)
  }, [])

  return (
    <PlayerPositionContext.Provider value={position}>
      {children}
    </PlayerPositionContext.Provider>
  )
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState<EpisodeData>()
  const history = useHistory()
  const misc = useMisc()
  const downloads = useDownloads()
  const [paused, setPaused] = useState(true)

  // Set up event listeners to keep <audio> element in sync with Cardo.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    const onPlay = () => setPaused(false)
    const onPause = () => setPaused(true)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [])

  useEffect(() => {
    if (playing) {
      const artworkSrc = playing.coverUrl || playing.podcast?.coverUrlLarge || playing.podcast?.coverUrl
      let artwork: MediaImage[] = []
      if (artworkSrc) {
        try {
          new URL(artworkSrc)
          artwork = [{ src: artworkSrc }]
        } catch {
          console.warn('Invalid cover art URL:', artworkSrc)
        }
      }
      navigator.mediaSession.metadata = new MediaMetadata({
        title: playing.title,
        artist: playing.podcast?.podcastName,
        artwork,
      })
    } else {
      navigator.mediaSession.metadata = null
    }
  }, [playing])

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
        paused,
        playing,
        onExit,
        quit,
      }}
    >
      <PositionProvider audioRef={audioRef}>
        {children}
      </PositionProvider>
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
      updateSettings({ playback: { playbackRate } })
    }
  }, [playbackRate])

  return (
    <div className="relative">
      <button
        className="hover: flex w-7 flex-col items-center hover:text-accent-6 focus:outline-none"
        onClick={() => setShowMenu(!showMenu)}
      >
        {speedometer}
        <p className="-mt-[6px] text-center text-[10px]">{playbackRate.toFixed(2)}</p>
      </button>

      {showMenu && <div className="fixed bottom-0 left-0 z-10 h-screen w-full" onClick={() => setShowMenu(false)} />}
      <div
        className={`${showMenu ? 'flex' : 'hidden'} absolute bottom-10 left-1/2 z-20 w-32 -translate-x-1/2 flex-col items-center justify-center gap-1 rounded-md border-2 border-primary-7 bg-primary-9 p-2`}
      >
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
              onContextMenu={(e) => {
                e.preventDefault()
                let removed = false
                updateSettings({ playback: { playbackRatePresets: settings.playbackRatePresets.filter((p) => {
                  if (!removed && p === preset) { removed = true; return false }
                  return true
                }) } })
              }}
              onClick={(e) => {
                if (e.button !== 0) return
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
              updateSettings({ playback: { playbackRatePresets: [...settings.playbackRatePresets, playbackRate].sort((a, b) => a - b) } })
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

      <RangeInput
        min={0}
        max={1}
        value={isMuted ? 0 : volume}
        step={0.01}
        units="%"
        onChange={changeVolume}
        className="ml-2 w-24"
      />
    </div>
  )
}

function AudioPlayer({ className = '' }) {
  const [duration, setDuration] = useState(0)
  const history = useHistory()
  const queue = useQueue()
  const downloads = useDownloads()
  const { audioRef, play, pause, paused, playing, quit } = usePlayer()
  const position = usePlayerPosition()
  const navigate = useNavigate()
  const [
    {
      playback: { stepForward, stepBackwards, displayRemainingTime, removeFromQueueAtEnd, removeFromDownloadsAtEnd },
    },
    updateSettings,
  ] = useSettings()
  const { t } = useTranslation()
  const mediaHandlers = useRef<Record<string, () => void>>({})

  // #region MEDIA_KEYS
  useEffect(() => {
    const keys = ['MediaPlayPause', 'MediaTrackNext', 'MediaTrackPrevious']

    async function registerShortcuts() {
      for (const key of keys) {
        if (!(await globalShortcut.isRegistered(key))) {
          await globalShortcut.register(key, (event) => {
            if (event.state === 'Pressed') {
              mediaHandlers.current[event.shortcut]?.()
            }
          })
        }
      }
    }

    registerShortcuts()

    return () => {
      keys.forEach((key) => globalShortcut.unregister(key))
    }
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
      if (audioRef.current.paused) {
        play()
      } else {
        pause()
      }
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

  // Register callbacks on mediaHandlers.current
  useEffect(() => {
    mediaHandlers.current = {
      MediaPlayPause: handlePlayPause,
      MediaTrackNext: playNextInQueue,
      MediaTrackPrevious: () => changeTime(0),
    }
  })

  const changeTime = (newTime: number, relative = false) => {
    if (audioRef.current) {
      if (relative) {
        newTime += audioRef.current.currentTime
      }

      newTime = Math.max(newTime, 0)
      newTime = Math.min(newTime, audioRef.current.duration - 0.01)

      audioRef.current.currentTime = newTime
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  return (
    <>
      <audio
        ref={audioRef}
        className="hidden"
        onLoadedMetadata={handleLoadedMetadata}
      />

      {playing && (
        <div className={`flex w-full gap-3 bg-primary-10 p-2 ${className}`}>
          {/* COVER ON LEFT SIDE*/}

          <div className="z-10 m-auto flex aspect-square w-24 cursor-pointer items-center justify-center rounded-md bg-primary-9 transition-transform hover:scale-95">
            <EpisodeCover
              className="rounded-md"
              episode={playing}
              onClick={() => {
                navigate('/episode-preview', {
                  state: {
                    episode: playing,
                  },
                })
              }}
              onError={(e: SyntheticEvent<HTMLImageElement>) => {
                const proxiedCoverUrl = proxyUrl(playing.podcast?.coverUrl)
                if (e.currentTarget.src === proxiedCoverUrl) {
                  e.currentTarget.src = appIcon
                } else {
                  e.currentTarget.src = proxiedCoverUrl ?? appIcon
                }
              }}
            />
          </div>

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
                <RangeInput
                  min={0}
                  max={duration}
                  value={position}
                  onChange={(value) => changeTime(value)}
                  className="mx-4 w-full"
                />
                <p
                  className="cursor-pointer select-none"
                  title={t('toggle_remaining_time')}
                  onClick={() => updateSettings({ playback: { displayRemainingTime: !displayRemainingTime } })}
                >
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

                  <button
                    className="hover: mb-2 flex w-9 items-center hover:text-accent-6 focus:outline-none"
                    onClick={handlePlayPause}
                  >
                    <span className="w-9">{paused ? playIcon : pauseIcon}</span>
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
