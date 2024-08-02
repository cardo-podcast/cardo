import { ResponseType, fetch as tauriFetch} from "@tauri-apps/api/http"
import { EpisodeData } from "."


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

function htmlToText(html: string): string {
  const tempElement = document.createElement('div');
  tempElement.innerHTML = html;
  return tempElement.innerText;
}

export async function parseXML(url: string): Promise<EpisodeData[]> {
  const response = await tauriFetch(url, {
    method: 'GET',
    responseType: ResponseType.Text
  })
  const xmlString = response.data as string

  const parser = new DOMParser()

  const xml = parser.parseFromString(xmlString, "text/xml")

  const items = xml.querySelectorAll('item')


  const result = Array.from(items).map( (item: Element) => {
    const episode: EpisodeData = {
      title: item.querySelector('title')?.textContent ?? '',
      description: item.querySelector('itunes\\:summary')?.textContent ?? htmlToText(item.querySelector('description')?.textContent ?? ''),
      src: item.querySelector('enclosure')?.getAttribute('url') ?? '',
      pubDate: new Date(item.querySelector('pubDate')?.textContent ?? 0),
      coverUrl: item.getElementsByTagNameNS('http://www.itunes.com/dtds/podcast-1.0.dtd', 'image')[0]?.getAttribute('href') ?? undefined
    }
    return episode
  })

  return result
}