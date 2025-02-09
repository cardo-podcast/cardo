import { useDB } from '../ContextProviders'
import { parsePodcastDetails } from './utils'

export function useOPML() {
  const { subscriptions } = useDB()

  function importOPML(file: File) {
    const reader = new FileReader()

    reader.readAsText(file)

    reader.onload = async () => {
      const parser = new DOMParser()
      const fileContent = reader.result as string

      const xml = parser.parseFromString(fileContent, 'application/xml')

      for (const outline of xml.getElementsByTagName('outline')) {
        const feedUrl = outline.getAttribute('xmlUrl')
        if (feedUrl && !subscriptions.includes(feedUrl)) {
          const podcast = await parsePodcastDetails(feedUrl)
          subscriptions.add(podcast)
        }
      }
    }
  }

  function exportOPML() {}

  return [importOPML, exportOPML]
}
