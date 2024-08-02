import { ResponseType, fetch as tauriFetch} from "@tauri-apps/api/http"
import { EpisodeData } from "."


export function secondsToStr(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
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
      audioUrl: item.querySelector('enclosure')?.getAttribute('url') ?? '',
      pubDate: new Date(item.querySelector('pubDate')?.textContent ?? 0),
      coverUrl: item.getElementsByTagNameNS('http://www.itunes.com/dtds/podcast-1.0.dtd', 'image')[0]?.getAttribute('href') ?? undefined
    }
    return episode
  })

  return result
}