import { useLocation } from "react-router-dom";
import { EpisodeData, PodcastData, SortCriterion } from "..";
import { ReactNode, SyntheticEvent, useEffect, useMemo, useRef, useState } from "react";
import * as icons from "../Icons"
import { parseXML } from "../utils/utils";
import EpisodeCard from "../components/EpisodeCard";
import { useDB } from "../DB/DB";
import { Switch, SwitchState } from "../components/Inputs";
import { usePodcastSettings } from "../engines/Settings";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useSync } from "../sync/Nextcloud";
import appIcon from '../../src-tauri/icons/icon.png'
import { sanitizeHTML } from "../utils/sanitize";

const EPISODE_CARD_HEIGHT = 80 // min height
const PRELOADED_EPISODES = 10 //

function SortButton({ children, podcastUrl, criterion }: { children: ReactNode, podcastUrl: string, criterion: SortCriterion['criterion'] }) {
  const [podcastSettings, updatePodcastSettings] = usePodcastSettings(podcastUrl)
  const sort = podcastSettings.sort

  return (
    <button
      className={`bg-primary-8 hover:bg-primary-7 flex items-center justify-center w-2/3 rounded-md ${sort.criterion == criterion ? '.text-accent-6' : ''}`}
      onClick={
        () => {
          if (sort.criterion == criterion) {
            updatePodcastSettings({
              sort: {
                criterion,
                mode: sort.mode == 'asc' ? 'desc' : 'asc'
              }
            })
          } else {
            updatePodcastSettings({ sort: { criterion } })
          }
        }
      }
    >
      {
        sort.criterion == criterion &&
        <div className="w-5 h-5">
          {sort.mode === 'asc' ? icons.upArrow : icons.downArrow}
        </div>
      }
      {children}
    </button>
  )
}


function PodcastPreview() {
  const location = useLocation();
  const podcast = location.state.podcast as PodcastData
  const [episodes, setEpisodes] = useState<EpisodeData[]>([])
  const [downloading, setDownloading] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const { subscriptions,
    history: { getCompleted },
    misc: { loggedInSync: loggedInSync },
    subscriptionsEpisodes } = useDB()
  const [podcastSettings, updatePodcastSettings] = usePodcastSettings(podcast.feedUrl)
  const { performSync } = useSync()
  const allEpisodes = useMemo(async() => await getAllEpisodes(), [podcast.feedUrl])

  const [tweakMenu, setTweakMenu] = useState<ReactNode>(undefined)
  const { t } = useTranslation()

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


  async function getAllEpisodes(forceDownload = false){
    console.log('LOADED')
    async function downloadEpisodes() {
      setDownloading(true)
      const [episodes, podcastDetails] = await parseXML(podcast.feedUrl)
      podcast.description = podcastDetails.description
      setDownloading(false)
      return episodes
    }

    const isSubscribed = await subscriptions.get(podcast.feedUrl) !== undefined
    setSubscribed(isSubscribed)

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

  async function loadEpisodes(forceDownload = false){

    const episodes = await (forceDownload? getAllEpisodes(true): allEpisodes)
    setEpisodes(sortEpisodes(await filterEpisodes(episodes)))
  }

  const filterEpisodes = async (unfilteredEpisodes: EpisodeData[]) => {
    const completedEpisodes = await getCompleted(podcast.feedUrl)
    const filter = podcastSettings.filter

    if (filter.played === SwitchState.True) {
      return unfilteredEpisodes.filter(ep => completedEpisodes.includes(ep.src))
    } else if (filter.played === SwitchState.False) {
      return unfilteredEpisodes.filter(ep => !completedEpisodes.includes(ep.src))
    } else {
      return unfilteredEpisodes
    }
  }

  useEffect(() => {
    loadEpisodes()
  }, [podcast.feedUrl, JSON.stringify(podcastSettings)])

  useEffect(() => {
    setTweakMenu(undefined)

    if (scrollRef.current) {
      scrollRef.current.scrollTo({top: 0, behavior: 'instant'})
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
      scrollRef.current.scrollTo({ top: Number(savedScroll), behavior: "instant" })
      sessionStorage.removeItem(`scroll-${location.key}`)
    }
  }, [episodes])

  return (
    <div className="relative w-full px-1">

      {/* sticky bar that appears when scrolling */}
      < div className="flex gap-2 items-center bg-primary-9 absolute w-full top-0 p-1 border-b-2 border-primary-8 z-10 cursor-default group "
      >
        <img className="bg-primary-7 h-10 aspect-square rounded-md"
          src={podcast.coverUrlLarge}
          alt=""
          onError={(e: SyntheticEvent<HTMLImageElement>) => e.currentTarget.src = appIcon}
        />

        <h1 className="text-xl group-hover:hidden">{podcast.podcastName}</h1>

        <span className="opacity-0 group-hover:opacity-100 transition-opacity w-10 absolute left-1/2 -translate-x-1/2 cursor-pointer"
          onClick={() => scrollRef.current && scrollRef.current.scrollTo({ top: 0 })}
        >
          {icons.upArrowSquare}
        </span>
      </div >

      <div ref={scrollRef} className="relative w-full flex flex-col h-full overflow-y-auto scroll-smooth"
        onScroll={() => {
          if (!scrollRef.current) return
          const scrolledWindows = scrollRef.current.scrollTop / scrollRef.current.clientHeight + 1
          const elementsOnWindow = Math.floor(scrollRef.current.clientHeight / EPISODE_CARD_HEIGHT) + 1

          setVisibleItems(Math.max(visibleItems, Math.round((scrolledWindows) * elementsOnWindow) + PRELOADED_EPISODES))
        }}
      >

        {tweakMenu &&
          <>
            <div className="absolute top-0 left-0 z-20 w-screen h-screen"
              onClick={() => setTweakMenu(undefined)}
            />

            <div className="left-1/2 -translate-x-1/2 absolute w-4/5 top-0 rounded-b-3xl overflow-hidden bg-primary-9 border-[1px] border-t-0 border-primary-6 flex flex-col justify-between items-center transition-all duration-200 z-20">
              <div className="p-2 flex flex-col gap-1 items-center w-full">
                {tweakMenu}
              </div>

              <button className="border-t-2 border-primary-8 p-2 h-5 w-4/5 flex justify-center items-center mt-1"
                onClick={() => setTweakMenu(undefined)}
              >
                <span className="h-6 w-6">{icons.upArrow}</span>
              </button>
            </div>
          </>
        }

        <div className='flex justify-left w-full gap-3 pb-3 border-b-2 border-primary-8 h-52 bg-primary-9 p-2 z-10'>
          <div className="flex flex-col gap-2 items-center shrink-0">
            <div className="h-40 aspect-square cursor-pointer"
              title={t('copy_feed_url')}
              onClick={() => {
                navigator.clipboard.writeText(podcast.feedUrl)
                toast.info(t('feed_url_copied'), {
                  position: "top-center",
                  autoClose: 3000,
                  hideProgressBar: true,
                  closeOnClick: true,
                  pauseOnHover: true,
                  draggable: true,
                  progress: undefined,
                  theme: "dark",
                });
              }}
            >
              <img
                className="bg-primary-7 h-40 aspect-square rounded-md"
                src={podcast.coverUrlLarge}
                alt=""
                onError={(e: SyntheticEvent<HTMLImageElement>) => e.currentTarget.src = appIcon}
              />
            </div>

            {/* #region BUTTONS */}
            <div className="flex gap-2">
              <button className="hover:text-accent-6"
                title={t(subscribed ? 'remove_from_subscriptions' : 'add_to_subscriptions')}
                onClick={async () => {
                  if (subscribed) {
                    loggedInSync && performSync({ remove: [podcast.feedUrl] })
                    await subscriptions.remove(podcast.feedUrl)
                    setSubscribed(false)
                  } else {
                    loggedInSync && performSync({ add: [podcast.feedUrl] })
                    podcast.id = await subscriptions.add(podcast)
                    setSubscribed(true)
                    await subscriptionsEpisodes.save(episodes)
                  }
                }}>
                {subscribed ? icons.starFilled : icons.star}
              </button>

              <button
                className="hover:text-accent-6"
                onClick={() => {
                  setTweakMenu(
                    <div className="w-4/5 flex flex-col gap-1 justify-center items-center">
                      <SortButton podcastUrl={podcast.feedUrl} criterion="date">
                        {t('date')}
                      </SortButton>
                      <SortButton podcastUrl={podcast.feedUrl} criterion="duration">
                        {t('duration')}
                      </SortButton>
                    </div>
                  )
                }
                }>
                {icons.sort}
              </button>
              <button
                className="hover:text-accent-6"
                onClick={() => {
                  setTweakMenu(
                    <div className="flex justify-center items-center">
                      <Switch initialState={podcastSettings.filter.played} setState={async (value) => {
                        updatePodcastSettings({ filter: { played: value } })
                      }} labels={[t('not_played'), t('played')]} />
                    </div>
                  )
                }
                }>
                {icons.filter}
              </button>
              <button className={`w-6 hover:text-accent-6 ${downloading
                && 'animate-[spin_2s_linear_reverse_infinite]'}`}
                onClick={async () => {
                  loadEpisodes(true)
                }}
              >
                {icons.sync}
              </button>
            </div>
            {/* #endregion */}

          </div>

          <div className="flex flex-col h-full">
            <h1 className="text-lg">{podcast.podcastName}</h1>
            <h2 className="mb-2">{podcast.artistName}</h2>

            <div className="flex overflow-y-auto rounded-md scroll-smooth pr-2">
              <div className="whitespace-pre-line text-sm text-primary-4"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(podcast.description ?? '') }} />
            </div>

          </div>
        </div >


        <div className="flex flex-col px-1">
          {episodes.slice(0, visibleItems).map(episode => (

            <EpisodeCard
              key={episode.src}
              episode={{
                ...episode,
                podcast: { // not including all vars to save some memory
                  coverUrl: podcast.coverUrl,
                  podcastName: podcast.podcastName
                }
              }}
              className="hover:bg-primary-8 transition-colors border-b-[1px] border-primary-8"
              onClick={() => {
                sessionStorage.setItem(`scroll-${location.key}`, Math.floor(scrollRef.current?.scrollTop ?? 0).toString())
                sessionStorage.setItem(`visibleItems-${location.key}`, visibleItems.toString())
              }}
            />
          ))}
        </div>
      </div >
    </div>
  )
}

export default PodcastPreview;