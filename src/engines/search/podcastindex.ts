import { } from '@tauri-apps/api'
import { PodcastData } from '../..'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { sha1 } from 'js-sha1'
import tauriConfig from '../../../src-tauri/tauri.conf.json'
//import * as http from '@tauri-apps/plugin-http'

// The API key and secret for PodcastIndex must be specified in a .env File. This file is not
// checked in to git. To build/run/debug you will need to register for the PodcastIndex API
// at this URL: https://api.podcastindex.org/signup

// Example .env values:
//     VITE_PODCASTINDEX_API_KEY=abc
//     VITE_PODCASTINDEX_API_SECRET=123

// Note that these values must be escaped if they contain special characters.
// The .env values are populated into the Javascript layer by Vite.
export async function searchPodcastIndex(term: string): Promise<Array<PodcastData>> {
  const searchParams = new URLSearchParams({ q: term.trim() })
  const url = `https://api.podcastindex.org/api/1.0/search/byterm?${searchParams.toString()}`
  const apiHeaderTime = String(Math.floor(Date.now() / 1000))
  const apiKey = import.meta.env.VITE_PODCASTINDEX_API_KEY
  const apiSecret = import.meta.env.VITE_PODCASTINDEX_API_SECRET
  if (!apiKey || !apiSecret) {
    // Read the comment above if this throws an error.
    throw new Error('No API key or secret specified for PodcastIndex')
  }

  const response = await tauriFetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Date': apiHeaderTime,
      'X-Auth-Key': apiKey,
      Authorization: sha1(apiKey + apiSecret + apiHeaderTime),
      'User-Agent': tauriConfig.productName + '/' + tauriConfig.version,
    },
  })

  const apiResults = (await response.json()).feeds
  const results: PodcastData[] = []
  for (const result of apiResults) {
    if (result.url) {
      results.push({
        podcastName: result.title,
        artistName: result.author,
        coverUrl: result.image,
        coverUrlLarge: result.image,
        feedUrl: result.url,
        description: result.description,
      })
    }
  }

  return results
}
