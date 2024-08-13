import EpisodeCard, { SortEpisodeGrip } from "../components/EpisodeCard"
import { useDB } from "../DB"
import { EpisodeData } from ".."
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { parsePodcastDetails } from "../utils";
import { useNavigate } from "react-router-dom";
import { Suspense, useEffect } from "react";


export default function QueuePage() {
  const { queue: {queue, move} } = useDB()
  const navigate = useNavigate()
  const {subscriptions: {getSubscription}} = useDB()


  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;

    if (over == null) return

    const activePosition = queue.findIndex(episode => episode.id == active.id as number)
    const overPosition = queue.findIndex(episode => episode.id == over.id as number)

    move(activePosition, overPosition)
    
  }

  const fetchPodcastData = async(episode: EpisodeData) => {
    const subscription = await getSubscription(episode.podcastUrl)

    if (subscription !== undefined) {
      episode.podcast = subscription
    }else {
      episode.podcast = await parsePodcastDetails(episode.podcastUrl)
    }
  } 

  useEffect(() => {
    // asynchronously fetch podcast data to allow loadig podcast page clicking on cover
    queue.map(episode => {
      fetchPodcastData(episode)
    })
  }, [queue])


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
                    noLazyLoad={true}
                    onImageClick={(e) => {
                      e.stopPropagation()
                      navigate('/preview', {
                        state: {
                          podcast: episode.podcast
                        }
                      })
                    }}
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