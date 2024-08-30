import {
  checkUpdate,
  installUpdate
} from '@tauri-apps/api/updater'
import { relaunch } from '@tauri-apps/api/process'
import { useEffect, useRef, useState } from 'react'
import { UnlistenFn } from '@tauri-apps/api/event'
import { useDB } from './DB'
import { parse } from 'date-fns';
import { useTranslation } from 'react-i18next'
import { upArrow } from './Icons'


export default function Updater() {
  const unlistenCeckUpdates = useRef<UnlistenFn>()
  const [dialog, setDialog] = useState<{ version: string, releaseNotes: string }>()
  const [showDialog, setShowDialog] = useState(false)
  const { appUpdate, dbLoaded } = useDB()
  const { t } = useTranslation()

  useEffect(() => {
    dbLoaded && checkUpdates()

    return () => unlistenCeckUpdates.current && unlistenCeckUpdates.current()
  }, [dbLoaded])


  const checkUpdates = async () => {

    try {
      const { shouldUpdate, manifest } = await checkUpdate()

      if (!manifest || !shouldUpdate) return

      setDialog({
        version: manifest.version,
        releaseNotes: manifest.body
      })

      const formatString = "yyyy-MM-dd HH:mm:ss.SSS xxxxx"
      const releaseDate = parse(manifest.date, formatString, new Date())
      const lastUpdate = await appUpdate.getLastUpdate()

      setShowDialog(releaseDate.getTime() > lastUpdate) // annoying dialog is shown only once, after that only the title bar icon appears

      await appUpdate.setLastUpdate(Date.now())

    } catch (error) {
      console.error(error)
    }
  }

  return (
    <>
      <button onClick={() => setShowDialog(true)} title={t('new_update_available')}
        className={`bg-green-600 w-5 h-5 rounded-full transition-all ${dialog? 'flex': 'hidden'}`}
      >
        {upArrow}
      </button>

      <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-64 max-w-[70%] min-h-36 bg-primary-9 rounded-md z-40
            border-2 border-primary-6 shadow-md shadow-primary-8 px-3 pb-2 flex-col justify-between transition-all ${showDialog ? 'flex' : 'hidden'}
        `}>
        <h1 className='text-lg border-b-2 border-primary-8 p-1'>{t('new_update_available')}</h1>
        <div>
          <p>{t('release_notes')}: v{dialog?.version}</p>
          <p className='text-sm break-words bg-primary-8 rounded-md'>{dialog?.releaseNotes}</p>
        </div>
        <div className='flex gap-4 justify-center mt-1'>
          <button className='bg-green-600 px-2 py-1 rounded-md uppercase'
            onClick={async () => {
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
            {t('install')}
          </button>

          <button className='bg-red-600 px-2 py-1 rounded-md uppercase'
            onClick={() => { setShowDialog(false) }}
          >
            {t('later')}
          </button>
        </div>
      </div >
    </>
  )
}