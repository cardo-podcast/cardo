import { Suspense } from "react"
import EpisodeCard, { SortEpisodeGrip } from "../components/EpisodeCard"
import { useDB } from "../DB"
import { EpisodeData } from ".."
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';


export default function QueuePage({ play }: { play: (episode?: EpisodeData) => void }) {
  const { queue: {queue, move} } = useDB()


  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;

    if (over == null) return

    const activePosition = queue.findIndex(episode => episode.id == active.id as number)
    const overPosition = queue.findIndex(episode => episode.id == over.id as number)

    move(activePosition, overPosition)
    
  }


  return (
    <div className="p-2 w-full flex flex-col">
      <div className='flex justify-center items-center w-full gap-3 bg-zinc-800 rounded-md mb-2 min-h-28'>
        <h1>QUEUE</h1>
      </div>
      <DndContext
      onDragEnd={handleDragEnd}
      >
        <SortableContext items={queue.map(episode => episode.id)}>
          <div className="grid gap-1 content-start">
            {queue.map(episode => (
              <SortEpisodeGrip key={episode.id} id={episode.id}>
                <Suspense fallback={<div className="bg-zinc-800 h-20 w-full" />}>
                  <EpisodeCard
                    episode={episode}
                    play={() => play(episode)}
                    noLazyLoad={true}
                  />
                </Suspense>
              </SortEpisodeGrip>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}