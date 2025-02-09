import { useDB } from '../ContextProviders'
import { parsePodcastDetails } from './utils'

export function useOPML(): [typeof importOPML, typeof exportOPML] {
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

  function downloadOPML(content: string, filename = 'subscriptions.opml') {
    const blob = new Blob([content], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportOPML() {
    const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Cardo Subscriptions</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
    ${subscriptions.subscriptions.map((s) => `<outline text="${s.podcastName}" title="${s.podcastName}" type="rss" xmlUrl="${s.feedUrl}" />`).join('\n\t')}
  </body>
</opml>`
    downloadOPML(opml)
  }

  return [importOPML, exportOPML]
}
