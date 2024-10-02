import { ResponseType, fetch as tauriFetch } from "@tauri-apps/api/http"
import { EpisodeData, PodcastData } from ".."
import { createDir, exists, readTextFile, writeTextFile, removeFile, removeDir, readDir } from "@tauri-apps/api/fs"
import { appCacheDir, dirname, join } from "@tauri-apps/api/path"
import { invoke } from "@tauri-apps/api"
import { toast } from "react-toastify"


export function secondsToStr(seconds: number, alwaysShowHours = false) {
  const negative = seconds < 0
  if (negative) {
    seconds = Math.abs(seconds)
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) - hours * 60
  const secondsStr = Math.floor(seconds % 60).toString().padStart(2, '0')

  if (Number.isNaN(seconds)) return ''

  if (hours > 0 || alwaysShowHours) {
    return `${negative ? '-' : ''}${hours}:${minutes.toString().padStart(2, '0')}:${secondsStr}`
  } else {
    return `${negative ? '-' : ''}${minutes}:${secondsStr}`
  }
}

export function strToSeconds(time: string) {
  const values = time.split(':')

  if (values.length == 1) {
    return Number(values[0])
  } else if (values.length == 2) {
    return Number(values[0]) * 60 + Number(values[1])
  } else {
    return Number(values[0]) * 3600 + Number(values[1]) * 60 + Number(values[2])
  }
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


export async function parseXML(url: string): Promise<[EpisodeData[], PodcastData]> {

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

  const podcastDetails = await parsePodcastDetails(url, xml)

  const result = Array.from(items).map((item: Element, i) => {

    const duration = parseDuration(getItunesTag(item, 'duration')?.textContent) ?? 0
    const size = Number(item.querySelector('enclosure')?.getAttribute('length')) / 1000000

    const episode: EpisodeData = {
      id: i, //
      title: item.querySelector('title')?.textContent ?? '',
      description: item.querySelector('description')?.textContent ?? item.querySelector('itunes\\:summary')?.textContent ?? '',
      src: item.querySelector('enclosure')?.getAttribute('url') ?? '',
      pubDate: new Date(item.querySelector('pubDate')?.textContent ?? 0),
      coverUrl: getItunesTag(item, 'image')?.getAttribute('href') ?? podcastDetails.coverUrl,
      duration: duration > 0 ? duration : size * 1024 * 8 / 128, // if duration isn't especified on xml use estimated size suposing a 128kb/s bitrate
      size: Math.round(size > 0 ? size : duration * 128 / 8 / 1024), // if size isn't especified on xml use estimated size suposing a 128kb/s bitrate
      podcastUrl: podcastDetails.feedUrl
    }
    return episode
  })

  return [result, podcastDetails]
}

export async function parsePodcastDetails(url: string, xml?: Document ) {

  if (!xml) {
    const xmlString = await downloadXml(url)
    const parser = new DOMParser()
    xml = parser.parseFromString(xmlString, "text/xml")
  }

  const channel = xml.querySelector('channel')

  if (channel == null) return { podcastName: '', artistName: '', coverUrl: '', coverUrlLarge: '', feedUrl: '' }

  const coverUrl = channel.querySelector('image')?.getAttribute('href') ?? channel.querySelector('image')?.querySelector('url')?.textContent ?? ''

  const podcast: PodcastData = {
    podcastName: capitalize(channel?.querySelector('title')?.textContent ?? ''),
    artistName: getItunesTag(channel, 'author').textContent ?? '',
    coverUrl: coverUrl,
    coverUrlLarge: coverUrl,
    feedUrl: url,
    description: channel.querySelector('description')?.textContent ?? ''
  }

  return podcast
}

export async function getAllCreds(): Promise<any | undefined> {

  const file = await join(await appCacheDir(), 'creds.json');

  if (!await exists(file)) return

  try {
    const data = JSON.parse(await readTextFile(file))
    return data
  } catch {
    return {}
  }

}

export async function getCreds(name: string): Promise<any | undefined> {
  const creds = await getAllCreds()
  if (creds) {
    return creds[name] ?? undefined
  }
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

function makeSafeFilename(name: string) {
  return name.replace(/(\\)|(\/)|(\:)|(\*)|(\?)|(\")|(\<)|(\>)|(\|)/g, '')
}

export async function downloadEpisode(episode: EpisodeData) {

  const podcastName = episode.podcast?.podcastName ?? 'unknown'
  const destFolder = await join(await appCacheDir(), 'Downloads', makeSafeFilename(podcastName))

  let extension = episode.src.split('.').pop()
  extension = extension && ['mp3', 'wav', 'aac', 'ogg', 'm4a'].includes(extension) ? extension : 'mp3'

  // limiting max filename lenght to 255 characters if it was the case
  const maxFilenameLenght = 255 - destFolder.length - episode.id.toString().length - extension.length - 3

  const filename = `${makeSafeFilename(episode.title.slice(0, maxFilenameLenght))}_${episode.id}.${extension}`


  const destination = await join(destFolder, filename)


  if (!await exists(destFolder)) {
    await createDir(destFolder, { recursive: true })
  }

  await invoke('download_file', { url: episode.src, destination, name: episode.title })

  return destination
}

export async function removeDownloadedEpisode(localFile: string) {
  await removeFile(localFile)

  const podcastDir = await dirname(localFile)
  const downloadedPodcasts = await readDir(podcastDir)

  if (downloadedPodcasts.length == 0) {
    removeDir(podcastDir)
  }
}

export function toastError(message: string) {
  toast.error(message, {
    position: "top-center",
    autoClose: 3000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "dark",
  });
}