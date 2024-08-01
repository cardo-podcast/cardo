import { SearchAPIResponse } from "./base";



export async function SearchApple(term: string): Promise<Array<SearchAPIResponse>>{
  const url = `https://itunes.apple.com/search?limit=15&entity=podcast&term=${term}`

  const response = await fetch(url);
  const data = await response.json();

  const results = data.results.map((item: any) => ({
    podcastName: item.collectionName,
    artistName: item.artistName,
    coverUrl: item.artworkUrl100,
    coverUrlLarge: item.artworkUrl600,
    feedUrl: item.feedUrl,
  }));

  return results;
}