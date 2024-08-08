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
  title: string,
  description: string,
  src: string,
  pubDate: Date,
  duration: number,
  size: number,
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
    locale: string
  }
  podcasts: {
    [feedUrl: string] : PodcastSettings
  },

  // methods
  getPodcastSettings: (feedUrl: string) => PodcastSettings
  setPodcastSettings: (feedUrl: string, podcastSettings: PodcastSettings) => void
}