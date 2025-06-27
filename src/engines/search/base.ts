import { PodcastData } from '../..'
import { SearchApple } from './apple'
import { SearchPodcastIndex } from './podcastindex'

export async function SearchPodcast(term: string): Promise<Array<PodcastData>> {
  // no more options right now
  //return SearchApple(term)
  return SearchPodcastIndex(term)
}
