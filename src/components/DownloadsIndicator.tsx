import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { useEffect, useRef, useState } from 'react'
import { DownloadPayload } from '..'

type DownloadsList = {
  [src: string]: Omit<DownloadPayload, 'src' | 'complete'>
}

export default function DownloadsIndicator() {
  const unlisten = useRef<UnlistenFn>(null)
  const downloads = useRef<DownloadsList>({})
  const [progress, setProgress] = useState<number>(0)

  const startListening = async () => {
    unlisten.current = await listen<DownloadPayload>(
      'downloading',
      ({ payload: { src, downloaded, total, name, complete } }) => {
        if (src in downloads.current && complete) {
          delete downloads.current[src]
          if (Object.keys(downloads.current).length === 0) {
            setProgress(0)
            return
          }
        } else {
          downloads.current[src] = {
            name,
            downloaded,
            total,
          }
        }

        let totalFilesSize = 0
        let totalDownloadedSize = 0
        for (const download in downloads.current) {
          totalFilesSize += downloads.current[download].total
          totalDownloadedSize += downloads.current[download].downloaded
        }

        setProgress(totalDownloadedSize / totalFilesSize)
      },
    )
  }

  useEffect(() => {
    startListening()

    return () => {
      unlisten.current && unlisten.current()
    }
  }, [])

  if (progress == 0) return <></>

  return (
    <div className="group relative h-6 w-6">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle className="stroke-primary-8" cx="50" cy="50" r="35" fill="none" strokeWidth="15" />

        <circle
          className="stroke-accent-6"
          cx="50"
          cy="50"
          r="35"
          fill="none"
          strokeWidth="15"
          transform="rotate(-90)"
          transform-origin="50 50"
          strokeDasharray={2 * Math.PI * 35}
          strokeDashoffset={2 * Math.PI * 35 * (1 - progress)}
        />
      </svg>
      <div className="absolute top-7 z-20 hidden max-w-96 flex-col rounded-md border-2 border-primary-6 bg-primary-9 px-2 py-1 text-xs hover:flex group-hover:flex">
        {Object.keys(downloads.current).map((src) => (
          <div
            key={src}
            className="flex items-center justify-between gap-3 border-b-2 border-primary-8 p-1 last:border-0"
          >
            <p className="line-clamp-2 w-max text-ellipsis">{downloads.current[src].name}</p>
            <p className="text-sm">
              {((downloads.current[src].downloaded / downloads.current[src].total) * 100).toFixed(1)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
