import { PodcastData } from '../..'
import { SearchApple } from './apple'

export async function SearchPodcast(term: string): Promise<Array<PodcastData>> {
  // no more options right now
  return SearchApple(term)
}
