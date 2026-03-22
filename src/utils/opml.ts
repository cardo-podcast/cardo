import { useSubscriptions } from '../ContextProviders'
import { parsePodcastDetails, toastError } from './utils'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { documentDir, join } from '@tauri-apps/api/path'
import { toast } from 'react-toastify'
import { useTranslation } from 'react-i18next'

export function useOPML(): [typeof importOPML, typeof exportOPML] {
  const subscriptions = useSubscriptions()
  const { t } = useTranslation()

  async function importOPML() {
    try {
      const path = await open({
        defaultPath: await documentDir(),
        filters: [{ name: 'OPML', extensions: ['opml'] }],
      })

      if (!path) return

      const fileContent = await readTextFile(path)
      const parser = new DOMParser()
      const xml = parser.parseFromString(fileContent, 'application/xml')

      if (xml.querySelector('parsererror')) {
        toastError(t('opml_invalid'))
        return
      }

      const outlines = xml.getElementsByTagName('outline')
      let imported = 0
      let failed = 0

      for (const outline of outlines) {
        const feedUrl = outline.getAttribute('xmlUrl')
        if (!feedUrl || subscriptions.includes(feedUrl)) continue

        try {
          const podcast = await parsePodcastDetails(feedUrl)
          await subscriptions.add(podcast)
          imported++
        } catch (e) {
          console.error(`Failed to import feed: ${feedUrl}`, e)
          failed++
        }
      }

      if (imported > 0 || failed > 0) {
        toast.info(t('opml_import_result', { imported, failed }), { autoClose: 5000, theme: 'dark' })
      } else {
        toast.info(t('opml_no_new'), { autoClose: 3000, theme: 'dark' })
      }
    } catch (e) {
      console.error('OPML import failed:', e)
      toastError(t('opml_error'))
    }
  }

  async function exportOPML() {
    try {
      const path = await save({
        defaultPath: await join(await documentDir(), 'subscriptions.opml'),
        filters: [{ name: 'OPML', extensions: ['opml'] }],
      })

      if (!path) return

      const doc = document.implementation.createDocument(null, 'opml')
      doc.documentElement.setAttribute('version', '2.0')

      const head = doc.createElement('head')
      const title = doc.createElement('title')
      title.textContent = 'Cardo Subscriptions'
      head.appendChild(title)
      const dateCreated = doc.createElement('dateCreated')
      dateCreated.textContent = new Date().toUTCString()
      head.appendChild(dateCreated)
      doc.documentElement.appendChild(head)

      const body = doc.createElement('body')
      for (const s of subscriptions.subscriptions) {
        const outline = doc.createElement('outline')
        outline.setAttribute('text', s.podcastName)
        outline.setAttribute('title', s.podcastName)
        outline.setAttribute('type', 'rss')
        outline.setAttribute('xmlUrl', s.feedUrl)
        body.appendChild(outline)
      }
      doc.documentElement.appendChild(body)

      const serializer = new XMLSerializer()
      const opml = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(doc)

      await writeTextFile(path, opml)
    } catch (e) {
      console.error('OPML export failed:', e)
      toastError(t('opml_error'))
    }
  }

  return [importOPML, exportOPML]
}
