import { PodcastData } from '../..'
import { searchITunes } from './apple'
import { searchFyyd } from './fyyd'

export async function searchPodcast(term: string, searchEngine: string): Promise<Array<PodcastData>> {
  // Perform search with selected search engine.
  switch (searchEngine) {
    case 'iTunes':
      return searchITunes(term)
    case 'fyyd':
      return searchFyyd(term)
    default:
      throw new Error('Unexpected searchEngine value')
  }
}
