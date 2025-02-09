import { checkUpdate, installUpdate } from '@tauri-apps/api/updater'
import { relaunch } from '@tauri-apps/api/process'
import { useEffect, useRef, useState } from 'react'
import { UnlistenFn } from '@tauri-apps/api/event'
import { parse } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { upArrow } from './Icons'
import { useModalBanner } from './components/ModalBanner'
import { useDB } from './ContextProviders'

export default function Updater() {
  const unlistenCeckUpdates = useRef<UnlistenFn>()
  const [dialog, setDialog] = useState<{ version: string; releaseNotes: string }>()
  const [showBanner, Banner] = useModalBanner()
  const {
    misc: { getLastUpdate, setLastUpdate },
    dbLoaded,
  } = useDB()
  const { t } = useTranslation()

  useEffect(() => {
    dbLoaded && checkUpdates()

    return () => unlistenCeckUpdates.current && unlistenCeckUpdates.current()
  }, [dbLoaded])

  const checkUpdates = async () => {
    try {
      const { shouldUpdate, manifest } = await checkUpdate()

      if (!manifest || !shouldUpdate) return

      const release_notes = manifest.body.replace(/^v\d.\d.\d\s*\n*/, '') // messages could start with vX.X.X (in github  appears as title)

      setDialog({
        version: manifest.version,
        releaseNotes: release_notes,
      })

      const formatString = 'yyyy-MM-dd HH:mm:ss.SSS xxxxx'
      const releaseDate = parse(manifest.date, formatString, new Date())
      const lastUpdate = await getLastUpdate()

      showBanner(releaseDate.getTime() > lastUpdate) // annoying dialog is shown only once, after that only the title bar icon appears

      await setLastUpdate(Date.now())
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <>
      <button
        onClick={() => showBanner()}
        title={t('new_update_available')}
        className={`h-5 w-5 rounded-full bg-green-600 transition-all ${dialog ? 'flex' : 'hidden'}`}
      >
        {upArrow}
      </button>

      <Banner
        labels={[t('install'), t('later')]}
        onSubmit={async () => {
          try {
            // Install the update. This will also restart the app on Windows!
            await installUpdate()

            // On macOS and Linux you will need to restart the app manually.
            // You could use this step to display another confirmation dialog.
            await relaunch()
          } catch (error) {
            console.error(error)
          }
        }}
      >
        <h1 className="border-b-2 border-primary-8 pb-1 text-lg">{t('new_update_available')}</h1>
        <div className="flex flex-col gap-1">
          <p>
            {t('release_notes')}: v{dialog?.version}
          </p>
          <p className="whitespace-pre-line rounded-md bg-primary-8 p-2 pl-1 text-sm">{dialog?.releaseNotes}</p>
        </div>
      </Banner>
    </>
  )
}
