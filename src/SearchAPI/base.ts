import { SearchApple } from "./apple"


export interface SearchAPIResponse {
  podcastName: string,
  artistName: string,
  coverUrl: string,
  coverUrlLarge: string,
  feedUrl: string
}


export async function SearchPodcast(term: string) : Promise<Array<SearchAPIResponse>>{
  // no more options right now
  return SearchApple(term)
}