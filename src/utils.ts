import { ResponseType, fetch as tauriFetch } from "@tauri-apps/api/http"
import { EpisodeData, PodcastData } from "."
import { createDir, exists, readTextFile, removeFile, writeTextFile } from "@tauri-apps/api/fs"
import { appCacheDir, join } from "@tauri-apps/api/path"
import sanitizeHtml from 'sanitize-html';

export function secondsToStr(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) - hours * 60
  const secondsStr = Math.floor(seconds % 60).toString().padStart(2, '0')

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

function htmlToText(html: string): string {
  return sanitizeHtml(html)
}

async function downloadXml(url: string): Promise<string> {
  const response = await tauriFetch(url, {
    method: 'GET',
    responseType: ResponseType.Text
  })
  return response.data as string
}

export async function parseXML(url: string, fileDownloaded = false): Promise<EpisodeData[]> {

  let xmlString = ''

  if (fileDownloaded) {
    xmlString = await readTextFile(url)
  } else {
    xmlString = await downloadXml(url)
  }

  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlString, "text/xml")
  const items = xml.querySelectorAll('item')
  const channel = xml.querySelector('channel')
  const podcastCover = channel?.querySelector('image')?.querySelector('url')?.textContent ?? ''

  const result = Array.from(items).map((item: Element) => {
    const episode: EpisodeData = {
      title: item.querySelector('title')?.textContent ?? '',
      description: htmlToText(item.querySelector('description')?.textContent ?? '') ?? item.querySelector('itunes\\:summary')?.textContent,
      src: item.querySelector('enclosure')?.getAttribute('url') ?? '',
      pubDate: new Date(item.querySelector('pubDate')?.textContent ?? 0),
      coverUrl: item.getElementsByTagNameNS('http://www.itunes.com/dtds/podcast-1.0.dtd', 'image')[0]?.getAttribute('href') ?? podcastCover,
      duration: strToSeconds(item.getElementsByTagNameNS('http://www.itunes.com/dtds/podcast-1.0.dtd', 'duration')[0]?.textContent || '00:00:00'),
      size: Number(item.querySelector('enclosure')?.getAttribute('length')) ?? 0,
      podcastUrl: url
    }
    return episode
  })

  return result
}

export async function getXmlDownloaded(podcast: PodcastData) {
  if (podcast.id === undefined) return

  const localXmlPath = await join(await appCacheDir(), 'Downloaded Feeds', podcast.id.toString() + '.xml');
  const fileExists = await exists(localXmlPath);

  return fileExists ? localXmlPath : undefined;
}

export async function saveXml(podcast: PodcastData) {
  if (podcast.id === undefined) return

  const feedDir = await join(await appCacheDir(), 'Downloaded Feeds');

  if (!await exists(feedDir)) {
    await createDir(feedDir)
  }

  const localXmlPath = await join(feedDir, podcast.id.toString() + '.xml')
  const xml = await downloadXml(podcast.feedUrl)

  writeTextFile(localXmlPath, xml)

  return localXmlPath
}

export async function removeXmlDownloaded(podcast: PodcastData) {
  if (podcast.id === undefined) return

  const localXmlPath = await getXmlDownloaded(podcast)

  if (localXmlPath !== undefined) {
    await removeFile(localXmlPath)
  }
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