import EpisodeCard from '../components/EpisodeCard'
import { PodcastData } from '..'
import { capitalize, parsePodcastDetails, removeDownloadedEpisode } from '../utils/utils'
import { useNavigate } from 'react-router-dom'
import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDownloads, useSubscriptions, useHistory } from '../ContextProviders'

export default function DownloadsPage() {
  const { downloads, batchRemoveFromDownloadList } = useDownloads()
  const navigate = useNavigate()
  const subscriptions = useSubscriptions()
  const history = useHistory()
  const { t } = useTranslation()
  const [downloadsInfo, setDownloadsInfo] = useState('')
  const [podcastMap, setPodcastMap] = useState<Record<string, PodcastData>>({})

  useEffect(() => {
    // asynchronously fetch podcast data to allow loading podcast page clicking on cover
    downloads.forEach(async (episode) => {
      if (podcastMap[episode.podcastUrl]) return
      const podcast = await subscriptions.get(episode.podcastUrl) ?? await parsePodcastDetails(episode.podcastUrl)
      setPodcastMap((prev) => ({ ...prev, [episode.podcastUrl]: podcast }))
    })

    //sum items and total time
    const items = downloads.length
    let time = 0
    downloads.map((episode) => (time += episode.duration))

    const hours = Math.floor(time / 3600)
    const minutes = Math.round((time - hours * 3600) / 60)

    setDownloadsInfo(
      `${items} ${t('episodes')} · ${capitalize(t('remaining_time'))}: ${hours} ${hours === 1 ? t('hour') : t('hours')} ${minutes} ${t('minutes')}`,
    )
  }, [downloads])

  const clear = async (mode: 'completed' | 'all') => {
    const completedEpisodes = await history.getCompleted()

    const deleteEpisodes =
      mode === 'completed' ? downloads.filter((episode) => completedEpisodes.includes(episode.src)) : downloads

    batchRemoveFromDownloadList(
      deleteEpisodes.map((episode) => {
        removeDownloadedEpisode(episode.localFile)
        return episode.src
      }),
    )
  }

  return (
    <div className="flex w-full flex-col p-2">
      <div>
        <div className="flex w-full items-center justify-between gap-5 border-b border-primary-8 p-2">
          <div className="flex flex-col">
            <h1 className="uppercase">{t('downloads')}</h1>
            <h2 className="0 text-sm">{downloadsInfo}</h2>
          </div>

          <div className="flex gap-2">
            <button
              className="h-fit w-fit rounded-md bg-accent-7 px-2 py-1 hover:bg-accent-8"
              onClick={() => clear('completed')}
            >
              {t('remove_complete')}
            </button>
            <button
              className="h-fit w-fit rounded-md bg-accent-7 px-2 py-1 hover:bg-accent-8"
              onClick={() => clear('all')}
            >
              {t('remove_all')}
            </button>
          </div>
        </div>
      </div>

      {downloads.length > 0 ? (
        <>
          <div className="grid content-start">
            {downloads.map((episode) => {
              const enriched = { ...episode, podcast: podcastMap[episode.podcastUrl] ?? episode.podcast }
              return (
                <Suspense key={episode.id} fallback={<div className="h-20 w-full bg-primary-8" />}>
                  <EpisodeCard
                    episode={enriched}
                    className="border-b border-primary-8 hover:bg-primary-8"
                    onImageClick={(e) => {
                      e.stopPropagation()
                      navigate('/preview', {
                        state: {
                          podcast: enriched.podcast,
                        },
                      })
                    }}
                  />
                </Suspense>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <p className="p-4">{t('downloads_default_message')}</p>
        </>
      )}
    </div>
  )
}
