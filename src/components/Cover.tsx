import { useState } from 'react'
import { EpisodeData, PodcastData } from '..'
import appIcon from '../../src-tauri/icons/icon.png'
import { usePodcastSettings } from '../engines/Settings'

interface PodcastCoverProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  podcast: Partial<PodcastData>
}

interface EpisodeCoverProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  episode: EpisodeData
}

export function PodcastCover({ podcast, ...props }: PodcastCoverProps) {
  const [podcastSettings] = usePodcastSettings(podcast.feedUrl!)

  let coverUrl = podcastSettings.coverUrl ? podcastSettings.coverUrl : (podcast.coverUrlLarge ?? podcast.coverUrl)

  if (!coverUrl?.length) {
    coverUrl = appIcon
  }

  return (
    <img
      src={coverUrl}
      alt=""
      loading="lazy"
      decoding="async"
      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.src = appIcon
      }}
      style={{ backgroundColor: 'white' }}
      {...props}
    />
  )
}

export function EpisodeCover({ episode, ...props }: EpisodeCoverProps) {
  const [error, setError] = useState(false)

  if (error) return PodcastCover({ podcast: episode.podcast!, ...props })

  return <img src={episode.coverUrl} alt="" loading="lazy" decoding="async" onError={() => setError(true)} {...props} />
}
