import { ReactNode, useEffect, useRef, useState } from "react"
import * as icons from "../Icons"



export default function EpisodeOverview({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showButtons, setShowButtons] = useState(false)


  useEffect(() => {
    if (!scrollRef.current) return

    // only show buttons when the content is wider than the screen (without the padding)
    setShowButtons(scrollRef.current?.scrollWidth > scrollRef.current?.clientWidth)
  }, [scrollRef.current?.clientWidth, scrollRef.current?.scrollWidth])

  const manageScroll = (value: number) => {
    if (!scrollRef.current) return

    scrollRef.current.scrollLeft += value
  }

  return (
    <div className="flex flex-col p-2 w-full h-fit relative">
      {
        showButtons &&
        <>
          <div className="fixed z-10 flex items-center h-24">
            <button
              className="bg-amber-500 w-10 rounded-r-full h-20 opacity-0 peer-hover:opacity-60 hover:opacity-90 transition-opacity duration-200"
              onClick={() => manageScroll(-200)}
            >
              {icons.arrowLeft}
            </button>
          </div>

          <div className="fixed z-10 right-4 flex items-center h-24">
            <button
              className="bg-amber-500 w-10 rounded-l-full h-20 opacity-0 hover:opacity-90 transition-opacity duration-200"
              onClick={() => manageScroll(200)}
            >
              {icons.arrowRight}
            </button>
          </div>
        </>
      }

      <div ref={scrollRef} className="flex gap-2 overflow-x-auto scroll-smooth">
        {children}
      </div>

    </div>
  )
}