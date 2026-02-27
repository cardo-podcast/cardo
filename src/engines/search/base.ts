import { PodcastData } from '../..'
import { searchITunes } from './apple'
import { searchFyyd } from './fyyd'
import { searchPodcastIndex } from './podcastindex'

export async function searchPodcast(term: string, searchEngine: string): Promise<Array<PodcastData>> {
  // Perform search with selected search engine.
  switch (searchEngine) {
    case 'iTunes':
      return searchITunes(term)
    case 'fyyd':
      return searchFyyd(term)
    case 'PodcastIndex':
      return searchPodcastIndex(term)
    default:
      throw new Error('Unexpected searchEngine value')
  }
}
