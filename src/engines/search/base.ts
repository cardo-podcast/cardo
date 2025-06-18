import { PodcastData } from '../..'
import { SearchApple } from './apple'
import { SearchFyyd } from './fyyd'

export async function SearchPodcast(term: string, searchEngine: string): Promise<Array<PodcastData>> {
  // Perform search with selected search engine.
  switch(searchEngine) {
    case "apple":
      return SearchApple(term);
    case "fyyd":
      return SearchFyyd(term);
    default:
      throw new Error("Unexpected searchEngine value");
  }
}
