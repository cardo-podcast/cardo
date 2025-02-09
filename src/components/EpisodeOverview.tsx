import { ReactNode, useEffect, useRef, useState } from 'react'
import * as icons from '../Icons'

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
    <div className="group relative flex h-fit w-full flex-col p-2">
      {showButtons && (
        <div className="opacity-0 group-hover:opacity-100">
          <div className="fixed z-10 flex h-24 items-center">
            <button
              className="h-20 w-6 rounded-r-full bg-accent-5 opacity-50 transition-opacity duration-200 hover:w-10 hover:opacity-90 peer-hover:opacity-60"
              onClick={() => manageScroll(-200)}
            >
              {icons.arrowLeft}
            </button>
          </div>

          <div className="fixed right-4 z-10 flex h-24 items-center">
            <button
              className="h-20 w-6 rounded-l-full bg-accent-5 opacity-50 transition-opacity duration-200 hover:w-10 hover:opacity-90"
              onClick={() => manageScroll(200)}
            >
              {icons.arrowRight}
            </button>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scroll-smooth"
        onWheel={(e) => {
          e.preventDefault()

          const deltaX = e.deltaY * 0.5 // deltaY is too fast

          e.currentTarget.scrollBy({ left: deltaX, behavior: 'instant' }) // smooth behaviour is clunky
        }}
      >
        {children}
      </div>
    </div>
  )
}
