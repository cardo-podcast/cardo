import { createContext, ReactNode, Suspense, useContext, useEffect, useRef, useState } from "react"
import { EpisodeData } from ".."
import EpisodeCard from "../components/EpisodeCard"
import { appDataDir, join } from "@tauri-apps/api/path"
import { exists, readTextFile, writeTextFile } from "@tauri-apps/api/fs"

export type Queue = ReturnType<typeof initQueue>

function initQueue() {
  const [queue, setQueue] = useState<EpisodeData[]>([])
  const filePath = useRef('')

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    save()
  }, [queue])

  const load = async () => {
    if (filePath.current) return

    filePath.current = await join(
      await appDataDir(),
      'queue.json'
    )

    if (!await exists(filePath.current)) {
      return // if no file don't update the queue
    }

    const loadedQueue = JSON.parse(await readTextFile(filePath.current))

    setQueue(loadedQueue.map((episode: EpisodeData) => ({
      ...episode,
      pubDate: new Date(episode.pubDate)
    })))
  }

  const save = async () => {
    if (!filePath.current) return

    await writeTextFile(
      filePath.current,
      JSON.stringify(queue)
    )
  }

  const add = (item: EpisodeData) => {
    setQueue([...queue, item])
  }

  const remove = (item: EpisodeData) => {
    const newQueue = [...queue]
    const index = newQueue.indexOf(item)
    newQueue.splice(index)
    setQueue(newQueue)
  }

  const next = (playingUrl: string) => {
    const nextIndex = queue.findIndex(episode => episode.src == playingUrl) + 1


    return queue[nextIndex]
  }

  return { queue, setQueue, add, remove, next, save }
}

const QueueContext = createContext<Queue | undefined>(undefined)
export const useQueue = (): Queue => {
  return useContext(QueueContext) as Queue
}

export function QueueProvider({ children }: { children: ReactNode }) {
  const queue = initQueue()

  return (
    <QueueContext.Provider value={queue}>
      {children}
    </QueueContext.Provider>
  )
}

export default function QueuePage({ play }: { play: (episode?: EpisodeData) => void }) {
  const queue = useQueue()


  return (
    <div className="p-2 w-full flex flex-col">
      <div className='flex justify-center items-center w-full gap-3 bg-zinc-800 rounded-md mb-2 min-h-28'>
        <h1>QUEUE</h1>
      </div>
      <div className="grid gap-1 content-start">
        {queue.queue.map((episode, i) => (
          <Suspense key={i} fallback={<div className="bg-zinc-800 h-20 w-full" />}>
            <EpisodeCard
              episode={episode}
              play={() => play(episode)}
            />
          </Suspense>
        ))}
      </div>
    </div>
  )
}