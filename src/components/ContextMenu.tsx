import { ReactNode, RefObject, useEffect, useState } from "react";


interface ContextProps {
  show: boolean,
  x?: number,
  y?: number
}

export function ContextMenu({ target, children }:
  { target: RefObject<HTMLDivElement>, children: ReactNode }) {

  const [contextProps, setContextProps] = useState<ContextProps>({ show: false })

  useEffect(() => {
    const handleContext = (event: MouseEvent) => {
      if (!target.current) return

      // rigth click inside target will display this context menu
      if (target.current.contains(event.target as Node)) {
        event.preventDefault()
        setContextProps({ show: true, x: event.pageX, y: event.pageY })
      } else {
        setContextProps({ show: false })
      }

    }

    document.addEventListener('contextmenu', handleContext)
    return () => {
      document.removeEventListener('contextmenu', handleContext)
    }
  })

  return (
      <div className={`w-screen h-screen absolute z-30 top-0 left-0
                          ${contextProps.show ? '' : 'hidden'}`}
        onClick={e => {
          setContextProps({show: false})
          e.stopPropagation()
      }}
      onContextMenu={e => {
        setContextProps({show: false})
        e.stopPropagation()
        e.preventDefault()
    }}
      
      >
      <div className={`absolute z-40 overflow-hidden ${contextProps.show ? '' : 'hidden'}`}
        style={{ top: `${contextProps.y}px`, left: `${contextProps.x}px` }}
      >
        {children}
      </div>
    </div>
  )
}