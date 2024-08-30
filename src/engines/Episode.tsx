// useful functions for episode management

import { useCallback, useEffect, useState } from "react";
import { EpisodeData } from "..";
import { useDB } from "./DB";
import { useSettings } from "./Settings";
import { usePlayer } from "../components/AudioPlayer";



export function useEpisode(episode: EpisodeData) {
  const { queue, history: { getEpisodeState, updateEpisodeState } } = useDB()
  const [inQueue, setInqueue] = useState(queue.includes(episode.src))
  const [reprState, setReprState] = useState({ position: 0, total: episode.duration, complete: false })
  const [{ globals: { locale } },] = useSettings()
  const { playing, position: playingPosition, quit: quitPlayer } = usePlayer()

  useEffect(() => {
    // update reproduction state
    getEpisodeState(episode.src).then(state => {
      if (state !== undefined) {
        setReprState({ position: state.position, total: state.total, complete: state.position >= state.total })
      } else {
        // render a not played episode
        setReprState({ position: 0, total: episode.duration, complete: false })
      }

    })
  }, [episode.src])

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


  return {reprState, inQueue, getDateString, togglePlayed, toggleQueue, getPosition, inProgress}
}