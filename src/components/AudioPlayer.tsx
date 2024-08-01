import React, { useRef, useEffect, useState } from "react";
import { secondsToStr } from "../utils";

interface AudioPlayerProps {
  src: string
}

function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [src]);

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
    <div className="flex flex-col h-16 bg-slate-800 text-slate-50 p-2">
      <div>
        <button
          className="flex items-center focus:outline-none"
          onClick={handlePlayPause}
        >
          PLAY
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
          className="w-full mx-4 h-1 bg-slate-300"
        />
        <p>{secondsToStr(duration)}</p>
        </div>

        <audio ref={audioRef} src={src} onLoadedMetadata={handleLoadedMetadata} className="hidden" />
    </div>
  );
};

export default AudioPlayer;