import { PodcastData } from "../..";
import { fetch as tauriFetch} from "@tauri-apps/api/http"


export async function SearchApple(term: string): Promise<Array<PodcastData>>{
  const url = `https://itunes.apple.com/search?limit=40&entity=podcast&term=${term.trim().replace(' ', '+')}`

  const response = await tauriFetch(url) // fetching from backend to avoid cors errors
  const apiResults = await (response.data as any).results


  const results = apiResults.map((item: any) => ({
    podcastName: item.collectionName,
    artistName: item.artistName,
    coverUrl: item.artworkUrl100,
    coverUrlLarge: item.artworkUrl600,
    feedUrl: item.feedUrl,
  }));

  return results;
}