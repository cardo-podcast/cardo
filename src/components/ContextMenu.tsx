import { ReactNode, RefObject, useEffect, useRef, useState } from "react";


interface ContextProps {
  show: boolean,
  x?: number,
  y?: number
}


export function useContextMenu() {
  const contextRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const [contextProps, setContextProps] = useState<ContextProps>({ show: false })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {

      if (!contextProps.show) return

      // click outside CONTEXT MENU
      if (contextRef.current && !contextRef.current.contains(event.target as Node)) {
        setContextProps({ show: false })
        event.stopPropagation()
      }
    }

    const handleContext = (event: MouseEvent) => {
      // rigth click inside TARGET
      if (targetRef.current && targetRef.current.contains(event.target as Node)) {
        event.preventDefault()
        setContextProps({show: true, x: event.pageX, y:event.pageY})
      } else {
        setContextProps({ show: false })
      }

    }


    document.addEventListener('click', handleClickOutside, true) // true captures onClick calls on other elements
    document.addEventListener('contextmenu', handleContext)
    return () => {
      document.removeEventListener('click', handleClickOutside, true)
      document.removeEventListener('contextmenu', handleContext)
    }
  })

  return {contextRef, targetRef, contextProps}

}




export function ContextMenu({ contextRef, contextProps, children }:
                                { contextRef: RefObject<HTMLDivElement>, contextProps: ContextProps, children: ReactNode}) {

  return (
    <div ref={contextRef} className={`absolute ${contextProps.show ? '' : 'hidden'}`}
      style={{ top: `${contextProps.y}px`, left: `${contextProps.x}px` }}
    >
      {children}
    </div>
  )
}