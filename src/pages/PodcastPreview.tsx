import { useLocation } from 'react-router-dom'
import { EpisodeData, PodcastData, SortCriterion } from '..'
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import * as icons from '../Icons'
import { parseXML, toastError } from '../utils/utils'
import EpisodeCard from '../components/EpisodeCard'
import { Checkbox, Switch, SwitchState, TimeInput } from '../components/Inputs'
import { usePodcastSettings } from '../engines/Settings'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { sanitizeHTML } from '../utils/sanitize'
import { showMenu } from 'tauri-plugin-context-menu'
import { useSync, useDB } from '../ContextProviders'
import { PodcastCover } from '../components/Cover'
import { useModalBanner } from '../components/ModalBanner'

const EPISODE_CARD_HEIGHT = 80 // min height
const PRELOADED_EPISODES = 10 //

function SortButton({
  children,
  podcastUrl,
  criterion,
}: {
  children: ReactNode
  podcastUrl: string
  criterion: SortCriterion['criterion']
}) {
  const [podcastSettings, updatePodcastSettings] = usePodcastSettings(podcastUrl)
  const sort = podcastSettings.sort

  return (
    <button
      className={`flex w-2/3 items-center justify-center rounded-md bg-primary-8 hover:bg-primary-7 ${sort.criterion === criterion ? '.text-accent-6' : ''}`}
      onClick={() => {
        if (sort.criterion === criterion) {
          updatePodcastSettings({
            sort: {
              criterion,
              mode: sort.mode === 'asc' ? 'desc' : 'asc',
            },
          })
        } else {
          updatePodcastSettings({ sort: { criterion } })
        }
      }}
    >
      {sort.criterion === criterion && (
        <div className="h-5 w-5">{sort.mode === 'asc' ? icons.upArrow : icons.downArrow}</div>
      )}
      {children}
    </button>
  )
}

function PodcastPreview() {
  const location = useLocation()
  const podcast = location.state.podcast as PodcastData

  const [episodes, setEpisodes] = useState<EpisodeData[]>([])
  const [downloading, setDownloading] = useState(false)
  const {
    subscriptions,
    history: { getCompleted },
    subscriptionsEpisodes,
  } = useDB()
  const [podcastSettings, updatePodcastSettings] = usePodcastSettings(podcast.feedUrl)
  const { sync, loggedIn: loggedInSync } = useSync()
  const isSubscribed = subscriptions.includes(podcast.feedUrl)
  const allEpisodes = useMemo(async () => await getAllEpisodes(), [podcast.feedUrl])

  const [tweakMenu, setTweakMenu] = useState<'sort' | 'filter' | 'settings' | undefined>(undefined)
  const { t } = useTranslation()
  const [showChangeCoverBanner, ChangeCoverBanner] = useModalBanner()

  const scrollRef = useRef<HTMLDivElement>(null)
  const [visibleItems, setVisibleItems] = useState(() => {
    const savedVisibleItems = sessionStorage.getItem(`visibleItems-${location.key}`)
    if (savedVisibleItems) {
      sessionStorage.removeItem(`visibleItems-${location.key}`)
      return Number(savedVisibleItems)
    } else {
      return 0
    }
  })

  const sortEpisodes = (unsortedEpisodes: EpisodeData[]) => {
    const applyMode = (a: any, b: any) => {
      if (sortCriterion.mode === 'asc') {
        return a - b
      } else {
        return b - a
      }
    }

    let sortedEpisodes: EpisodeData[] = []
    const sortCriterion = podcastSettings.sort

    switch (sortCriterion.criterion) {
      case 'duration':
        sortedEpisodes = [...unsortedEpisodes].sort((a, b) => applyMode(a.duration, b.duration))
        break
      case 'date':
        sortedEpisodes = [...unsortedEpisodes].sort((a, b) => applyMode(a.pubDate, b.pubDate))
        break
    }

    return sortedEpisodes
  }

  async function getAllEpisodes(forceDownload = false) {
    async function downloadEpisodes() {
      setDownloading(true)
      try {
        const [episodes, podcastDetails] = await parseXML(podcast.feedUrl)
        podcast.description = podcastDetails.description
        setDownloading(false)
        return episodes
      } catch (e) {
        toastError(e as string)
        setDownloading(false)
        return []
      }
    }

    let episodes: EpisodeData[] = []
    if (!isSubscribed || forceDownload) {
      episodes = await downloadEpisodes()
    } else if (isSubscribed) {
      episodes = await subscriptionsEpisodes.getAll({ podcastUrl: podcast.feedUrl })
      if (!episodes.length) {
        setEpisodes([])
        episodes = await downloadEpisodes()
      }
    }

    if (isSubscribed) {
      subscriptionsEpisodes.save(episodes)
    }

    location.state['currentPodcastEpisodes'] = episodes

    return episodes
  }

  async function loadEpisodes(forceDownload = false) {
    const episodes = await (forceDownload ? getAllEpisodes(true) : allEpisodes)
    setEpisodes(sortEpisodes(await filterEpisodes(episodes)))

    forceDownload && subscriptions.loadLatestEpisodes() // when updating feed from button on podcast page latest episodes are refreshed
  }

  const filterEpisodes = async (unfilteredEpisodes: EpisodeData[]) => {
    const filter = podcastSettings.filter
    let result: EpisodeData[] = []

    // filter completed /uncompleted episodes
    const completedEpisodes = await getCompleted(podcast.feedUrl)

    if (filter.played === SwitchState.True) {
      result = unfilteredEpisodes.filter((ep) => completedEpisodes.includes(ep.src))
    } else if (filter.played === SwitchState.False) {
      result = unfilteredEpisodes.filter((ep) => !completedEpisodes.includes(ep.src))
    } else {
      result = unfilteredEpisodes
    }

    // filter by duration
    if (filter.duration.min > 0) {
      result = result.filter((ep) => ep.duration >= filter.duration.min)
    }

    if (filter.duration.max > 0) {
      result = result.filter((ep) => ep.duration <= filter.duration.max)
    }

    return result
  }

  useEffect(() => {
    loadEpisodes()
  }, [podcast.feedUrl, JSON.stringify(podcastSettings)])

  useEffect(() => {
    setTweakMenu(undefined)

    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [podcast.feedUrl])

  useEffect(() => {
    if (!scrollRef.current) return
    const elementsOnWindow = Math.floor(scrollRef.current.clientHeight / EPISODE_CARD_HEIGHT) + 1
    setVisibleItems(Math.max(visibleItems, elementsOnWindow))
  }, [scrollRef.current?.clientHeight])

  useEffect(() => {
    // triggered when episodes are loaded, saved scroll is deleted to avoid triggering after filter / sort
    // scroll is saved when entering to any episode details

    const savedScroll = sessionStorage.getItem(`scroll-${location.key}`)
    if (savedScroll && scrollRef.current && episodes.length) {
      scrollRef.current.scrollTo({ top: Number(savedScroll), behavior: 'instant' })
      sessionStorage.removeItem(`scroll-${location.key}`)
    }
  }, [episodes])

  function copyFeedUrl() {
    navigator.clipboard.writeText(podcast.feedUrl)
    toast.info(t('feed_url_copied'), {
      position: 'top-center',
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: 'dark',
    })
  }

  if (!podcast.feedUrl) {
    toastError("Feed URL couldn't be empty") // this should never happen, just to avoid weird behaviour in case of a bug
    return <></>
  }

  return (
    <>
      <ChangeCoverBanner
        onSubmit={(e) => {
          const input: HTMLInputElement = e.currentTarget.url

          podcast.coverUrl = podcast.coverUrlLarge = input.value

          updatePodcastSettings({ coverUrl: input.value })
        }}
      >
        <h1>{t('change_podcast_cover')}</h1>
        <input
          type="url"
          name="url"
          placeholder={t('podcast_cover_url')}
          autoFocus
          className="w-96 rounded-md bg-primary-8 px-2 py-1 focus:outline-none"
        />
      </ChangeCoverBanner>

      <div className="relative w-full px-1">
        {/* sticky bar that appears when scrolling */}
        <div className="group absolute top-0 z-10 flex w-full cursor-default items-center gap-2 border-b-2 border-primary-8 bg-primary-9 p-1">
          <PodcastCover className="aspect-square h-10 rounded-md bg-primary-7" podcast={podcast} />

          <h1 className="text-xl group-hover:hidden">{podcast.podcastName}</h1>

          <span
            className="absolute left-1/2 w-10 -translate-x-1/2 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => scrollRef.current && scrollRef.current.scrollTo({ top: 0 })}
          >
            {icons.upArrowSquare}
          </span>
        </div>

        <div
          ref={scrollRef}
          className="relative flex h-full w-full flex-col overflow-y-auto scroll-smooth"
          onScroll={() => {
            if (!scrollRef.current) return
            const scrolledWindows = scrollRef.current.scrollTop / scrollRef.current.clientHeight + 1
            const elementsOnWindow = Math.floor(scrollRef.current.clientHeight / EPISODE_CARD_HEIGHT) + 1

            setVisibleItems(Math.max(visibleItems, Math.round(scrolledWindows * elementsOnWindow) + PRELOADED_EPISODES))
          }}
        >
          {tweakMenu && (
            <>
              <div className="absolute left-0 top-0 z-20 h-screen w-screen" onClick={() => setTweakMenu(undefined)} />

              <div className="absolute left-1/2 top-0 z-20 flex w-4/5 -translate-x-1/2 flex-col items-center justify-between overflow-hidden rounded-b-3xl border-[1px] border-t-0 border-primary-6 bg-primary-9 transition-all duration-200">
                <div className="flex w-full flex-col items-center gap-1 p-2">
                  {tweakMenu === 'sort' && (
                    <div className="flex w-4/5 flex-col items-center justify-center gap-1">
                      <SortButton podcastUrl={podcast.feedUrl} criterion="date">
                        {t('date')}
                      </SortButton>
                      <SortButton podcastUrl={podcast.feedUrl} criterion="duration">
                        {t('duration')}
                      </SortButton>
                    </div>
                  )}

                  {tweakMenu === 'filter' && (
                    <div className="flex w-full flex-col items-center justify-center gap-0.5">
                      <Switch
                        state={podcastSettings.filter.played}
                        setState={(value) => {
                          updatePodcastSettings({ filter: { played: value } })
                        }}
                        labels={[t('not_played'), t('played')]}
                      />

                      <div>
                        <label className="flex items-center justify-between gap-2 uppercase">
                          {t('duration_less_than')}:
                          <TimeInput
                            value={podcastSettings.filter.duration.max}
                            onChange={(v) => updatePodcastSettings({ filter: { duration: { max: v } } })}
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2 uppercase">
                          {t('duration_greater_than')}:
                          <TimeInput
                            value={podcastSettings.filter.duration.min}
                            onChange={(v) => updatePodcastSettings({ filter: { duration: { min: v } } })}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {tweakMenu === 'settings' && (
                    <div className="flex w-4/5 justify-center gap-1">
                      <div className="flex flex-col items-end">
                        <label className="flex w-fit gap-1">
                          {t('download_new')}:
                          <Checkbox
                            defaultChecked={podcastSettings.downloadNew}
                            onChange={(value) => updatePodcastSettings({ downloadNew: value })}
                          />
                        </label>

                        <label className="flex w-fit gap-1">
                          {t('queue_new')}:
                          <Checkbox
                            defaultChecked={podcastSettings.queueNew}
                            onChange={(value) => updatePodcastSettings({ queueNew: value })}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="mt-1 flex h-5 w-4/5 items-center justify-center border-t-2 border-primary-8 p-2"
                  onClick={() => setTweakMenu(undefined)}
                >
                  <span className="h-6 w-6">{icons.upArrow}</span>
                </button>
              </div>
            </>
          )}

          <div className="justify-left z-10 flex h-52 w-full gap-3 border-b-2 border-primary-8 bg-primary-9 p-2 pb-3">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div
                className="aspect-square h-40 cursor-pointer"
                onContextMenu={() => {
                  showMenu({
                    items: [
                      {
                        label: t('copy_feed_url'),
                        event: copyFeedUrl,
                      },
                      {
                        label: t('change_podcast_cover'),
                        event: () => showChangeCoverBanner(),
                      },
                    ],
                  })
                }}
              >
                <PodcastCover className="aspect-square h-40 rounded-md bg-primary-7" podcast={podcast} />
              </div>

              {/* #region BUTTONS */}
              <div className="flex gap-2">
                <button
                  className="w-6 hover:text-accent-6"
                  title={t(isSubscribed ? 'remove_from_subscriptions' : 'add_to_subscriptions')}
                  onClick={async () => {
                    if (isSubscribed) {
                      loggedInSync && sync({ remove: [podcast.feedUrl] })
                      await subscriptions.remove(podcast.feedUrl)
                    } else {
                      loggedInSync && sync({ add: [podcast.feedUrl] })
                      podcast.id = await subscriptions.add(podcast)
                      await subscriptionsEpisodes.save(episodes)
                    }
                  }}
                >
                  {isSubscribed ? icons.starFilled : icons.star}
                </button>

                <button
                  className="hover:text-accent-6"
                  onClick={() => {
                    setTweakMenu('sort')
                  }}
                >
                  {icons.sort}
                </button>
                <button
                  className="hover:text-accent-6"
                  onClick={() => {
                    setTweakMenu('filter')
                  }}
                >
                  {icons.filter}
                </button>
                <button
                  className="h-6 w-6 hover:text-accent-6"
                  onClick={() => {
                    setTweakMenu('settings')
                  }}
                >
                  {icons.settings}
                </button>
                <button
                  className={`w-6 hover:text-accent-6 ${downloading && 'animate-[spin_2s_linear_reverse_infinite]'}`}
                  onClick={async () => {
                    loadEpisodes(true)
                  }}
                >
                  {icons.sync}
                </button>
              </div>
              {/* #endregion */}
            </div>

            <div className="flex h-full flex-col">
              <h1 className="text-lg">{podcast.podcastName}</h1>
              <h2 className="mb-2">{podcast.artistName}</h2>

              <div className="flex overflow-y-auto scroll-smooth rounded-md pr-2">
                <div
                  className="whitespace-pre-line text-sm text-primary-4"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(podcast.description ?? '') }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col px-1">
            {episodes.slice(0, visibleItems).map((episode) => (
              <EpisodeCard
                key={episode.src}
                episode={{
                  ...episode,
                  podcast: {
                    // not including all vars to save some memory
                    coverUrl: podcast.coverUrl,
                    podcastName: podcast.podcastName,
                    feedUrl: podcast.feedUrl
                  },
                }}
                className="border-b-[1px] border-primary-8 transition-colors hover:bg-primary-8"
                onClick={() => {
                  sessionStorage.setItem(
                    `scroll-${location.key}`,
                    Math.floor(scrollRef.current?.scrollTop ?? 0).toString(),
                  )
                  sessionStorage.setItem(`visibleItems-${location.key}`, visibleItems.toString())
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default PodcastPreview
