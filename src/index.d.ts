import { PodcastSettings } from "./Settings"


export interface PodcastData {
  id?: number,
  podcastName: string,
  artistName: string,
  coverUrl: string,
  coverUrlLarge: string,
  feedUrl: string,
}

export interface EpisodeData {
  id: number
  title: string,
  description: string,
  src: string,
  pubDate: Date,
  duration: number,
  size: number,
  podcastUrl: string
  podcast?: PodcastData
  coverUrl?: string,
}

export interface EpisodeState {
  podcast: string,
  episode: string,
  position: number,
  total: number,
  timestamp: number
}


//// SETTINGS ////

export interface Settings {
  globals: {
    locale: string,
    language: string
  }
  podcasts: {
    [feedUrl: string] : PodcastSettings
  }
}