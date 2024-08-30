import { appWindow } from "@tauri-apps/api/window";
import * as icons from "../Icons"
import { useEffect, useRef, useState } from "react";
import { SyncButton, useSync } from "../sync/Nextcloud";
import { usePlayer } from "./AudioPlayer";
import { UnlistenFn } from "@tauri-apps/api/event";
import { useSettings } from "../engines/Settings";
import Updater from "../Updater";


function TitleBar() {
  const [windowPinned, setWindowPinned] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const { onExit: savePlayerStatus } = usePlayer()
  const { performSync } = useSync()
  const [{ sync: { syncBeforeAppClose }, general: { checkUpdates }, ui }, _] = useSettings()
  const unlistenClose = useRef<UnlistenFn>()


  const executeBeforeExit = async () => {
    await savePlayerStatus()

    if (syncBeforeAppClose) {
      // nextcloud sync
      await performSync()
    }
  }

  appWindow.isMaximized().then(m =>
    setMaximized(m)
  )

  useEffect(() => {
    /* listen onCloseRequest to do exit actions when close is not triggered
      from app X button (for example taskbar right click menu) */
    appWindow.onCloseRequested(async () => {
      await executeBeforeExit()
    }).then(
      unlisten => unlistenClose.current = unlisten
    )

    // when reloading delete the previous event
    return () => unlistenClose.current && unlistenClose.current()
  }, [savePlayerStatus]) // reload when dependencies change

  return (
    <div className={`bg-primary-10 border-b-2 border-primary-8 flex w-full h-10 justify-between px-2 py-1 items-center relative stroke-[1.5px]`} data-tauri-drag-region={true} onDragStart={appWindow.startDragging}>
      <div className='flex gap-2 items-center'>

        {ui.showPinWindowButton &&

          <button onClick={() => {
            appWindow.setAlwaysOnTop(!windowPinned)
            setWindowPinned(!windowPinned)
          }} className='hover:text-accent-5 w-6 -mr-1'>
            {windowPinned ? icons.unpin : icons.pin}
          </button>
        }

        <SyncButton />

        {checkUpdates && <Updater />}
      </div>

      <h1 className="cursor-default absolute left-1/2 -translate-x-1/2" data-tauri-drag-region={true} onDragStart={appWindow.startDragging}>Cardo</h1>

      <div className='flex justify-between gap-1'>
        <button onClick={() => appWindow.minimize()} className='hover:text-accent-5 w-6'>
          {icons.minus}
        </button>
        <button onClick={() => {
          appWindow.toggleMaximize()
          setMaximized(!maximized)
        }} className='hover:text-accent-5 w-5'>
          {maximized ? icons.unmaximize : icons.maximize}
        </button>
        <button onClick={async () => {
          await executeBeforeExit()
          appWindow.close()
        }} className='hover:text-red-500 w-6'>
          {icons.close}
        </button>
      </div>
    </div>
  )
}


export default TitleBar;