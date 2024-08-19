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

export interface NewEpisodeData extends EpisodeData{
  new?: boolean
}

export interface RawEpisodeData extends EpisodeData{
  pubDate: number
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
  },
  sync: {
    syncAfterAppStart: boolean,
    syncBeforeAppClose: boolean
  },
  general: {
    numberOfDaysInNews: number,
    fetchSubscriptionsAtStartup: boolean
  }
}

type RecursivePartial<T> = {
  [P in keyof T]?:
    T[P] extends (infer U)[] ? RecursivePartial<U>[] :
    T[P] extends object | undefined ? RecursivePartial<T[P]> :
    T[P];
};

export interface SortCriterion {
  criterion: 'date' | 'duration',
  mode: 'asc' | 'desc'
}