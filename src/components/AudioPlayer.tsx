import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { secondsToStr } from "../utils";
import * as icons from "../Icons"
import { EpisodeData } from "..";
import { useDB } from "../DB";


interface AudioPlayerProps {
  className?: string,
}

export type AudioPlayerRef = {
  play: (episode?: EpisodeData | undefined) => void
}


const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(({ className = '' }, ref) => {
  const [playing, setPlaying] = useState<EpisodeData>()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { history: { updateEpisodeState, getEpisodeState }, queue } = useDB()

  const play = async (episode?: EpisodeData | undefined) => {
    if (audioRef.current == null) return

    if (episode !== undefined) {
      setPlaying(episode)

      audioRef.current.src = episode.src
      audioRef.current.load()

      const previousState = await getEpisodeState(episode?.src)

      if (previousState !== undefined && previousState.position < previousState.total) {
        audioRef.current.currentTime = previousState.position
      }
    }

    audioRef.current.play()
  }

  useImperativeHandle(ref, () => ({
    play: play
  }), [playing])

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
          setCurrentTime(audioRef.current.currentTime);
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
      setCurrentTime(newTime);
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
          className="bg-zinc-700 h-full aspect-square rounded-md"
          src={playing.coverUrl}
          alt=''
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
          <p>{secondsToStr(currentTime)}</p>
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleSeekChange}
            className="w-full mx-4 h-1 bg-zinc-300 accent-amber-600"
          />
          <p>{secondsToStr(duration)}</p>
        </div>

        <audio ref={audioRef} onLoadedMetadata={handleLoadedMetadata} className="hidden" />
      </div>
    </div>

  );
})

export default AudioPlayer;