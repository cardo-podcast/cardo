import { PodcastData } from '../..'
import { fetch as tauriFetch } from '@tauri-apps/api/http'

export async function searchITunes(term: string): Promise<Array<PodcastData>> {
    const searchParams = new URLSearchParams({
    'limit': '40',
    'entity': 'podcast',
    'term': term.trim()
  });
  const url = `https://itunes.apple.com/search?${searchParams.toString()}`

  const response = await tauriFetch(url) // fetching from backend to avoid cors errors
  const apiResults = await (response.data as any).results

  const results = []
  for (const result of apiResults) {
    if (result.feedUrl) {
      results.push({
        podcastName: result.collectionName,
        artistName: result.artistName,
        coverUrl: result.artworkUrl100,
        coverUrlLarge: result.artworkUrl600,
        feedUrl: result.feedUrl,
      })
    }
  }

  return results
}
