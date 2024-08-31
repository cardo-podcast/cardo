// useful functions for episode management

import { useCallback, useEffect, useRef, useState } from "react";
import { EpisodeData } from "..";
import { useDB } from "./DB";
import { useSettings } from "./Settings";
import { usePlayer } from "../components/AudioPlayer";
import { downloadEpisode, removeDownloadedEpisode } from "../utils";



export function useEpisode(episode: EpisodeData, isIntersecting: boolean | undefined = true) {
  const { queue, history: { getEpisodeState, updateEpisodeState }, downloads } = useDB()
  const [inQueue, setInqueue] = useState(queue.includes(episode.src))
  const [downloaded, setDownloaded] = useState(false)
  const [reprState, setReprState] = useState({ position: 0, total: episode.duration, complete: false })
  const [{ globals: { locale } },] = useSettings()
  const { play: playEpisode, playing, position: playingPosition, quit: quitPlayer } = usePlayer()
  const downloadedFile = useRef('')
  const dataLoaded = useRef(false)


  useEffect(() => {
    if (isIntersecting) { // avoid extra computing on db on large lists
      load()
    }

  }, [episode.src, playing?.src])

  useEffect(() => {
    if (isIntersecting && !dataLoaded.current){
      load() // load when entering in scope (only one time)
    }
  }, [isIntersecting])

  const load = async () => {
    dataLoaded.current = true
    
    // update reproduction state
    const state = await getEpisodeState(episode.src)

    if (state !== undefined) {
      setReprState({ position: state.position, total: state.total, complete: state.position >= state.total })
    } else {
      // render a not played episode
      setReprState({ position: 0, total: episode.duration, complete: false })
    }

    // check if file is downloaded
    setDownloaded(downloads.includes(episode.src))

  }

  const getDateString = useCallback(() => {
    // set print date
    const episodeYear = episode.pubDate.getFullYear()
    const actualYear = new Date().getFullYear()

    return episode.pubDate
      .toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: episodeYear < actualYear ? 'numeric' : undefined
      }
      )
  }, [episode.pubDate])

  const togglePlayed = () => {
    if (reprState.complete) {
      updateEpisodeState(episode.src, episode.podcastUrl, 0, episode.duration)
      setReprState({ complete: false, position: 0, total: reprState.total })
    } else {
      updateEpisodeState(episode.src, episode.podcastUrl, reprState.total, reprState.total)
      setReprState({ complete: true, position: reprState.total, total: reprState.total })
      if (playing?.src == episode.src) {
        quitPlayer()
      }
    }
  }

  const toggleQueue = async () => {
    if (inQueue) {
      await queue.remove(episode.src)
      setInqueue(false)
    } else {
      await queue.push(episode)
      setInqueue(true)
    }
  }

  const getPosition = useCallback(() => {
    return playing?.src == episode.src ? playingPosition : reprState.position
  }, [playing?.src, episode.src, reprState.position, playingPosition])

  const inProgress = useCallback(() => {
    return playing?.src == episode.src || (reprState.position > 0 && !reprState.complete)
  }, [playing?.src, episode.src, reprState.position, reprState.complete])

  const download = async () => {
    const localFile = await downloadEpisode(episode)
    setDownloaded(true)
    downloadedFile.current = localFile
    downloads.addToDownloadList(episode, localFile)
  }

  const removeDownload = async () => {
    if (downloaded) {
      await removeDownloadedEpisode(downloadedFile.current)
      await downloads.removeFromDownloadList(episode.src)
      setDownloaded(false)
    }
  }

  const toggleDownload = () => {
    if (downloaded) {
      removeDownload()
    } else {
      download()
    }
  }

  const play = () => {
    if (downloaded) {
      playEpisode(episode, downloadedFile.current)
    } else {
      playEpisode(episode)
    }
  }


  return { reprState, inQueue, getDateString, togglePlayed, toggleQueue, getPosition, inProgress, toggleDownload, downloaded, play }
}