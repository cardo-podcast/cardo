import { check, Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { useEffect, useRef, useState } from 'react'
import { UnlistenFn } from '@tauri-apps/api/event'
import { parse } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { upArrow } from './Icons'
import { useModalBanner } from './components/ModalBanner'
import { useDB } from './ContextProviders'

export default function Updater() {
  const unlistenCeckUpdates = useRef<UnlistenFn>(null)
  const [dialog, setDialog] = useState<{ version: string; releaseNotes: string }>()
  const installUpdate = useRef<Update['install']>(null)
  const [showBanner, Banner] = useModalBanner()
  const {
    misc: { getLastUpdate, setLastUpdate },
    dbLoaded,
  } = useDB()
  const { t } = useTranslation()

  useEffect(() => {
    dbLoaded && checkUpdates()

    return () => {
      unlistenCeckUpdates.current && unlistenCeckUpdates.current()
    }
  }, [dbLoaded])

  const checkUpdates = async () => {
    try {
      const update = await check()

      if (!update?.body || !update.date) return

      const release_notes = update.body.replace(/^v\d.\d.\d\s*\n*/, '') // messages could start with vX.X.X (in github  appears as title)

      setDialog({
        version: update.version,
        releaseNotes: release_notes,
      })

      installUpdate.current = update.install

      const formatString = 'yyyy-MM-dd HH:mm:ss.SSS xxxxx'
      const releaseDate = parse(update.date, formatString, new Date())
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
            installUpdate.current && (await installUpdate.current())

            // On macOS and Linux you will need to restart the app manually.
            // You could use this step to display another confirmation dialog.
            await relaunch()
          } catch (error) {
            console.error(error)
          }
        }}
      >
        <h1 className="border-primary-8 border-b-2 pb-1 text-lg">{t('new_update_available')}</h1>
        <div className="flex flex-col gap-1">
          <p>
            {t('release_notes')}: v{dialog?.version}
          </p>
          <p className="bg-primary-8 rounded-md p-2 pl-1 text-sm whitespace-pre-line">{dialog?.releaseNotes}</p>
        </div>
      </Banner>
    </>
  )
}
