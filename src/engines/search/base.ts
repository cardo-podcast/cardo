import { PodcastData } from '../..'
import { SearchApple } from './apple'
import { SearchFyyd } from './fyyd'

export async function SearchPodcast(term: string): Promise<Array<PodcastData>> {
  // no more options right now

  // TODO: Figure out how to dedupe results before merging.
  //return SearchApple(term)
  return SearchFyyd(term)
}
