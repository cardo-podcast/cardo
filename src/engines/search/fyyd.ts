import { PodcastData } from '../..'
import { fetch as tauriFetch } from '@tauri-apps/api/http'

export async function searchFyyd(term: string): Promise<Array<PodcastData>> {
  const searchParams = new URLSearchParams({
    count: '40',
    term: term.trim(),
  })
  const url = `https://api.fyyd.de/0.2/search/podcast?${searchParams.toString()}`

  console.log(url)

  const response = await tauriFetch(url) // fetching from backend to avoid cors errors
  const apiResults = ((await response.data) as any).data

  // Put results into a map using the returned search rank as keys.
  const resultsMap = new Map()
  for (const result of apiResults) {
    if (result.xmlURL) {
      resultsMap.set(result.rank, {
        podcastName: result.title,
        artistName: result.author,
        coverUrl: result.thumbImageURL,
        coverUrlLarge: result.imgURL,
        feedUrl: result.xmlURL,
      })
    }
  }

  // Convert our map into an array sorted by search rank.
  return Array.from(resultsMap.values()).sort()
}
