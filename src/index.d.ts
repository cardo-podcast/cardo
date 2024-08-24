import { PodcastSettings } from "./Settings"
import colors from "tailwindcss/colors"
import { TailwindColor } from "./ThemeConfigurator"
import { DefaultTheme } from "./DefaultThemes"


export interface PodcastData {
  id?: number,
  podcastName: string,
  artistName: string,
  coverUrl: string,
  coverUrlLarge: string,
  feedUrl: string,
  description?: string
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

export interface NewEpisodeData extends EpisodeData {
  new?: boolean
}

export interface RawEpisodeData extends EpisodeData {
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
    [feedUrl: string]: PodcastSettings
  },
  sync: {
    syncAfterAppStart: boolean,
    syncBeforeAppClose: boolean
  },
  general: {
    numberOfDaysInNews: number,
    fetchSubscriptionsAtStartup: boolean
  },
  colors: {
    primary: ColorTheme | TailwindBaseColor | DefaultTheme,
    accent: ColorTheme | TailwindBaseColor | DefaultTheme,
  },
  playback: {
    stepForward: number,
    stepBackwards: number,
    resumeBefore: number, // resume playing some seconds before the last state
    displayRemainingTime: boolean //show -remaining time in player instead of total time
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


// #region colors

export interface ColorTheme {
  DEFAULT: TailwindColor
  1: TailwindColor
  2: TailwindColor
  3: TailwindColor
  4: TailwindColor
  5: TailwindColor
  6: TailwindColor
  7: TailwindColor
  8: TailwindColor
  9: TailwindColor
  10: TailwindColor
}

export type TailwindBaseColor = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose'

export type TailwindColor = `${TailwindBaseColor}-${50 |100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950}`

// #endregion