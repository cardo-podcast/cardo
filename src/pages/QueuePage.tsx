import { createContext, ReactNode, Suspense, useContext, useState } from "react"
import { EpisodeData } from ".."
import EpisodeCard from "../components/EpisodeCard"

export type Queue = ReturnType<typeof initQueue>

function initQueue() {
  const [queue, setQueue] = useState<EpisodeData[]>([])

  const add = (item: EpisodeData) => {
    setQueue([...queue, item])
  }

  const remove = (item: EpisodeData) => {
    const newQueue = [...queue]
    const index = newQueue.indexOf(item)
    newQueue.splice(index)
    setQueue(newQueue)
  }

  const next = () => {
    const newQueue = queue.slice(1)
    setQueue(newQueue)
    return newQueue[0]
  }

  return { queue, setQueue, add, remove, next }
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

export default function QueuePage() {
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
              play={() => console.log('PLAY FROM QUEUE')}
            />
          </Suspense>
        ))}
      </div>
    </div>
  )
}