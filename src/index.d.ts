

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
  coverUrl?: string
}

export interface EpisodeState {
  podcast: string,
  episode: string,
  position: number,
  total: number,
  timestamp: number
}