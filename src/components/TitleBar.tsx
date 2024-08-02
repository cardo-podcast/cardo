import { appWindow } from "@tauri-apps/api/window";
import * as icons from "../Icons"
import { useState } from "react";


function TitleBar() {
  const [windowPinned, setWindowPinned] = useState(false)
  const [maximized, setMaximized] = useState(false)

  appWindow.isMaximized().then(m =>
    setMaximized(m)
  )

  return (
    <div className={`bg-zinc-950 flex w-full text-white h-8 justify-between px-2 pt-1 items-center relative stroke-[1.5px]`} data-tauri-drag-region={true} onDragStart={appWindow.startDragging}>
        <div className='flex w-20 justify-between'>
          <button onClick={() => {
            appWindow.setAlwaysOnTop(!windowPinned)
            setWindowPinned(!windowPinned)
            }} className='hover:text-amber-500 w-5'>
              {windowPinned? icons.unpin: icons.pin}
            </button>
        </div>

          <h1 data-tauri-drag-region={true} onDragStart={appWindow.startDragging}>Podland</h1>

        <div className='flex justify-between gap-1'>
          <button onClick={() => appWindow.minimize()} className='hover:text-amber-500 w-5'>
            {icons.minus}
          </button>
          <button onClick={() => {
            appWindow.toggleMaximize()
            setMaximized(!maximized)
          }} className='hover:text-amber-500 w-5'>
            {maximized? icons.unmaximize: icons.maximize}
          </button>
          <button onClick={() => appWindow.close()} className='hover:text-red-500 w-5'>
            {icons.close}
          </button>
        </div>
    </div>
  )
}


export default TitleBar;