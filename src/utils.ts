import { ResponseType, fetch as tauriFetch } from "@tauri-apps/api/http"
import { EpisodeData, PodcastData } from "."
import { exists, readTextFile, writeTextFile } from "@tauri-apps/api/fs"
import { appCacheDir, join } from "@tauri-apps/api/path"

export function secondsToStr(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) - hours * 60
  const secondsStr = Math.floor(seconds % 60).toString().padStart(2, '0')

  if (Number.isNaN(seconds)) return ''

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secondsStr}`
  } else {
    return `${minutes}:${secondsStr}`
  }
}

export function strToSeconds(time: string) {
  const [hours, minutes, seconds] = time.split(':')
  const r = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)
  return r
}

async function downloadXml(url: string): Promise<string> {
  const response = await tauriFetch(url, {
    method: 'GET',
    responseType: ResponseType.Text
  })
  return response.data as string
}

function getItunesTag(item: Element, tag: string) {
  return item.getElementsByTagNameNS('http://www.itunes.com/dtds/podcast-1.0.dtd', tag)[0]
}

export async function parseXML(url: string): Promise<EpisodeData[]> {
  // dynamic import of sanitize module, to reduce bundle size
  const module = await import('sanitize-html');
  const sanitizeHtml = module.default;

  const xmlString = await downloadXml(url)
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlString, "text/xml")
  const items = xml.querySelectorAll('item')

  const parseDuration = (duration: string | null): number => {
    if (!duration) return 0

    const durationNumber = Number(duration)
    
    if (Number.isNaN(durationNumber)) {
      // format comes in '00:00:00'
      return strToSeconds(duration)
    } else {
      // format comes in seconds
      return durationNumber
    }
  }

  const podcastDetails = await parsePodcastDetails(xml)

  const result = await Promise.all(Array.from(items).map(async(item: Element, i) => {
    const episode: EpisodeData = {
      id: i, //
      title: item.querySelector('title')?.textContent ?? '',
      description: await sanitizeHtml(item.querySelector('description')?.textContent ?? '') ?? item.querySelector('itunes\\:summary')?.textContent,
      src: item.querySelector('enclosure')?.getAttribute('url') ?? '',
      pubDate: new Date(item.querySelector('pubDate')?.textContent ?? 0),
      coverUrl: getItunesTag(item, 'image')?.getAttribute('href') ?? podcastDetails.coverUrl,
      duration: parseDuration(getItunesTag(item, 'duration')?.textContent),
      size: Number(item.querySelector('enclosure')?.getAttribute('length')) ?? 0,
      podcastUrl: podcastDetails.feedUrl
    }
    return episode
  }))

  return result
}

export async function parsePodcastDetails(xml: Document | string) {
  /*
  xml:  string -> url to download xml
        Document -> parsed downloaded xml
  */

  if (typeof xml === "string") {
    const xmlString = await downloadXml(xml)
    const parser = new DOMParser()
    xml = parser.parseFromString(xmlString, "text/xml")
  }

  const channel = xml.querySelector('channel')

  if (channel == null) return {podcastName:'', artistName: '', coverUrl: '', coverUrlLarge: '', feedUrl: ''}

  const coverUrl = channel.querySelector('image')?.getAttribute('href') ?? channel.querySelector('image')?.querySelector('url')?.textContent ?? ''

  const podcast: PodcastData = {
    podcastName: channel?.querySelector('title')?.textContent ?? '',
    artistName: getItunesTag(channel, 'author').textContent ?? '',
    coverUrl: coverUrl,
    coverUrlLarge: coverUrl,
    feedUrl: channel.querySelector('link[rel="self"]')?.getAttribute('href') ?? ''
  }

  return podcast
}

export async function getAllCreds(): Promise<any | undefined> {

  const file = await join(await appCacheDir(), 'creds.json');

  if (!await exists(file)) return

  try{
    const data = JSON.parse(await readTextFile(file))
    return data
  }catch{
    return {}
  }

}

export async function getCreds(name: string): Promise<any | undefined> {
  const creds = await getAllCreds()
  return creds[name] || undefined
}

export async function saveCreds(name: string, value: any) {
  const file = await join(await appCacheDir(), 'creds.json');

  let data: any;
  if (! await exists(file)) {
    data = {}
  } else {
    data = await getAllCreds()
  }

  data[name] = value

  await writeTextFile(file, JSON.stringify(data))
}

export async function removeCreds(name: string) {
  const file = await join(await appCacheDir(), 'creds.json');

  let data: any;
  if (! await exists(file)) {
    return
  }

  data = await getAllCreds()
  delete data[name]

  await writeTextFile(file, JSON.stringify(data))
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}