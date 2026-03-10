// useful functions for episode management

import { useCallback } from 'react'
import { EpisodeData } from '..'
import { useSettings } from './Settings'
import { downloadEpisode, removeDownloadedEpisode } from '../utils/utils'
import { useQueue, useHistory, useDownloads, usePlayer } from '../ContextProviders'

export function useEpisode(episode: EpisodeData) {
  const queue = useQueue()
  const history = useHistory()
  const downloads = useDownloads()
  const [
    {
      globals: { locale },
    },
  ] = useSettings()
  const { play: playEpisode, pause, paused, playing, quit: quitPlayer } = usePlayer()

  const isPlaying = playing?.src === episode.src

  const state = history.getSync(episode.src)
  const reprState =
    state !== undefined
      ? { position: state.position, total: state.total, complete: state.position >= state.total }
      : { position: 0, total: episode.duration, complete: false }

  const inQueue = queue.includes(episode.src)

  const downloadedEntry = downloads.includes(episode.src)
  const downloadState: 'downloaded' | undefined = downloadedEntry ? 'downloaded' : undefined

  const getDateString = useCallback(() => {
    const episodeYear = episode.pubDate.getFullYear()
    const actualYear = new Date().getFullYear()

    return episode.pubDate.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: episodeYear < actualYear ? 'numeric' : undefined,
    })
  }, [episode.pubDate, locale])

  const togglePlayed = useCallback(() => {
    if (reprState.complete) {
      history.update(episode.src, episode.podcastUrl, 0, episode.duration)
    } else {
      history.update(episode.src, episode.podcastUrl, reprState.total, reprState.total)
      if (playing?.src === episode.src) {
        quitPlayer()
      }
    }
  }, [reprState.complete, reprState.total, episode.src, episode.podcastUrl, episode.duration, playing?.src, history, quitPlayer])

  const toggleQueue = useCallback(async () => {
    if (inQueue) {
      await queue.remove(episode.src)
    } else {
      await queue.push(episode)
    }
  }, [inQueue, queue, episode])

  const inProgress = useCallback(
    (mustBePlaying = false) => {
      const isStarted = (reprState.position > 0 && !reprState.complete) || isPlaying
      if (mustBePlaying) {
        return isStarted && isPlaying && !paused
      } else {
        return isStarted
      }
    },
    [isPlaying, reprState.position, reprState.complete, paused],
  )

  const toggleDownload = useCallback(() => {
    if (!downloadState) {
      downloadEpisode(episode).then((localFile) => {
        downloads.addToDownloadList(episode, localFile)
      })
    } else if (downloadedEntry) {
      removeDownloadedEpisode(downloadedEntry.localFile).then(() => {
        downloads.removeFromDownloadList(episode.src)
      })
    }
  }, [downloadState, downloadedEntry, episode, downloads])

  const play = useCallback(() => {
    if (downloadedEntry) {
      playEpisode(episode, downloadedEntry.localFile)
    } else {
      playEpisode(episode)
    }
  }, [downloadedEntry, episode, playEpisode])

  return {
    reprState,
    inQueue,
    getDateString,
    togglePlayed,
    toggleQueue,
    position: reprState.position,
    inProgress,
    isPlaying,
    toggleDownload,
    downloadState,
    play,
    pause,
  }
}
