import EpisodeCard from "../components/EpisodeCard"
import SortEpisodeGrip from "../components/SortEpisodeGrip"
import { useDB } from "../DB/DB"
import { EpisodeData } from ".."
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { capitalize, parsePodcastDetails } from "../utils/utils";
import { useNavigate } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";


export default function QueuePage() {
  const { queue: { queue, move, batchRemove } } = useDB()
  const navigate = useNavigate()
  const { subscriptions, history } = useDB()
  const { t } = useTranslation()
  const [queueInfo, setQueueInfo] = useState('')


  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over == null) return

    const activePosition = queue.findIndex(episode => episode.id == active.id as number)
    const overPosition = queue.findIndex(episode => episode.id == over.id as number)

    move(activePosition, overPosition)

  }

  const fetchPodcastData = async (episode: EpisodeData) => {
    const subscription = await subscriptions.get(episode.podcastUrl)

    if (subscription !== undefined) {
      episode.podcast = subscription
    } else {
      episode.podcast = await parsePodcastDetails(episode.podcastUrl)
    }
  }

  useEffect(() => {
    // asynchronously fetch podcast data to allow loadig podcast page clicking on cover
    queue.map(episode => {
      fetchPodcastData(episode)
    })

    //sum items and total time
    const items = queue.length
    let time = 0
    queue.map(episode => time += episode.duration)

    const hours = Math.floor(time / 3600)
    const minutes = Math.round((time - (hours * 3600)) / 60)

    setQueueInfo(`${items} ${t('episodes')} · ${capitalize(t('remaining_time'))}: ${hours} ${hours === 1 ? t('hour') : t('hours')} ${minutes} ${t('minutes')}`)
  }, [queue])

  const clear = async (mode: 'completed' | 'all') => {
    const completedEpisodes = await history.getCompleted()

    const deleteEpisodes = mode === 'completed' ?
      queue.filter(episode => completedEpisodes.includes(episode.src)):
      queue

    batchRemove(deleteEpisodes.map(episode => episode.src))

  }


  return (
    <div className="p-2 w-full flex flex-col">
      <div>
        <div className='flex p-2 w-full border-b-[1px] border-primary-8 items-center gap-5 justify-between'>
          <div className="flex flex-col">
            <h1 className="uppercase">{t('queue')}</h1>
            <h2 className="0 text-sm">{queueInfo}</h2>
          </div>

          <div className="flex gap-2">
            <button className="rounded-md bg-accent-7 hover:bg-accent-8 w-fit h-fit px-2 py-1"
              onClick={() => clear('completed')}
            >
              {t('remove_complete')}
            </button>
            <button className="rounded-md bg-accent-7 hover:bg-accent-8 w-fit h-fit px-2 py-1"
              onClick={() => clear('all')}
            >
              {t('empty_queue')}
            </button>
          </div>
        </div>
      </div>

      {
        queue.length > 0 ?
          <>
            <DndContext
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={queue.map(episode => episode.id)}>
                <div className="grid content-start">
                  {queue.map(episode => (
                    <SortEpisodeGrip key={episode.id} id={episode.id}>
                      <Suspense fallback={<div className="bg-primary-8 h-20 w-full" />}>
                        <EpisodeCard
                          episode={episode}
                          className="hover:bg-primary-8 border-b-[1px] border-primary-8"
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
          </> :
          <>
            <p className="p-4">{t('queue_default_message')}</p>
          </>
      }
    </div>
  )
}