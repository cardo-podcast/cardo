import { Suspense } from "react"
import EpisodeCard from "../components/EpisodeCard"
import { useDB } from "../DB"


export default function QueuePage() {
  const { queue } = useDB()


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