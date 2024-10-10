import { appWindow } from '@tauri-apps/api/window'
import * as icons from '../Icons'
import { useEffect, useRef, useState } from 'react'
import { SyncButton, useSync } from '../sync/Sync'
import { usePlayer } from './AudioPlayer'
import { UnlistenFn } from '@tauri-apps/api/event'
import { useSettings } from '../engines/Settings'
import Updater from '../Updater'
import DownloadsIndicator from './DownloadsIndicator'

function TitleBar() {
  const [windowPinned, setWindowPinned] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const { onExit: savePlayerStatus } = usePlayer()
  const { performSync } = useSync()
  const [
    {
      sync: { syncBeforeAppClose },
      general: { checkUpdates },
      ui,
    },
    _,
  ] = useSettings()
  const unlistenClose = useRef<UnlistenFn>()

  const executeBeforeExit = async () => {
    await savePlayerStatus()

    if (syncBeforeAppClose) {
      // nextcloud sync
      await performSync()
    }
  }

  appWindow.isMaximized().then((m) => setMaximized(m))

  useEffect(() => {
    /* listen onCloseRequest to do exit actions when close is not triggered
      from app X button (for example taskbar right click menu) */
    appWindow
      .onCloseRequested(async () => {
        await executeBeforeExit()
      })
      .then((unlisten) => (unlistenClose.current = unlisten))

    // when reloading delete the previous event
    return () => unlistenClose.current && unlistenClose.current()
  }, [savePlayerStatus]) // reload when dependencies change

  return (
    <div className={`relative flex h-10 w-full items-center justify-between bg-primary-10 stroke-[1.5px] px-2 py-1`} data-tauri-drag-region={true} onDragStart={appWindow.startDragging}>
      <div className="flex items-center gap-2">
        {ui.showPinWindowButton && (
          <button
            onClick={() => {
              appWindow.setAlwaysOnTop(!windowPinned)
              setWindowPinned(!windowPinned)
            }}
            className="-mr-1 w-6 hover:text-accent-5"
          >
            {windowPinned ? icons.unpin : icons.pin}
          </button>
        )}

        <SyncButton />
        <DownloadsIndicator />

        {checkUpdates && <Updater />}
      </div>

      <h1 className="absolute left-1/2 -translate-x-1/2 cursor-default" data-tauri-drag-region={true} onDragStart={appWindow.startDragging}>
        Cardo
      </h1>

      <div className="flex justify-between gap-1">
        <button onClick={() => appWindow.minimize()} className="w-6 hover:text-accent-5">
          {icons.minus}
        </button>
        <button
          onClick={() => {
            appWindow.toggleMaximize()
            setMaximized(!maximized)
          }}
          className="w-5 hover:text-accent-5"
        >
          {maximized ? icons.unmaximize : icons.maximize}
        </button>
        <button
          onClick={async () => {
            await executeBeforeExit()
            appWindow.close()
          }}
          className="w-6 hover:text-red-500"
        >
          {icons.close}
        </button>
      </div>
    </div>
  )
}

export default TitleBar
