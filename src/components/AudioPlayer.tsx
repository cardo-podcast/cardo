import React, { useRef, useEffect, useState, RefObject } from "react";
import { secondsToStr } from "../utils";
import * as icons from "../Icons"
import { EpisodeData } from "..";

interface AudioPlayerProps {
  audioRef: RefObject<HTMLAudioElement>
  className?: string,
}

export function useAudioPlayer() {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState<EpisodeData>()

  const play = (episode: EpisodeData | null = null) => {
    if (!ref.current) return

    if (episode != null) {
      setPlaying(episode)
      ref.current.src = episode.src
      ref.current.load()
    }

    ref.current.play()
  }

  return {ref, play, playing}
}


function AudioPlayer ({ audioRef, className='' }: AudioPlayerProps) {
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (audioRef.current) {
      const intervalId = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, []);

  const handlePlayPause = () => {
    if (audioRef.current) {
      audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause();
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
    <div className={`flex flex-col h-[70px] justify-center bg-zinc-950 text-slate-50 p-2 ${audioRef.current?.src? '': 'hidden'} ${className}`}>
      <div className="flex justify-center">

        <button
          className="flex items-center focus:outline-none hover: hover:text-amber-600 w-8"
          onClick={handlePlayPause}
        >
          {audioRef.current?.paused? icons.play : icons.pause}
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
  );
};

export default AudioPlayer;