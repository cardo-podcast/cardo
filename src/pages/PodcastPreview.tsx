import { useLocation } from "react-router-dom";
import { EpisodeData, PodcastData, SortCriterion } from "..";
import { ReactNode, Suspense, useEffect, useState } from "react";
import * as icons from "../Icons"
import { parseXML } from "../utils";
import EpisodeCard from "../components/EpisodeCard";
import { useDB } from "../DB";
import { Switch, SwitchState } from "../components/Inputs";
import { usePodcastSettings } from "../Settings";
import { useTranslation } from "react-i18next";


function SortButton({ children, podcastUrl, criterion }: { children: ReactNode, podcastUrl: string, criterion: SortCriterion['criterion'] }) {
  const [{ sort }, updatePodcastSettings] = usePodcastSettings(podcastUrl)
  // podcastSettings.sort.criterion

  return (
    <button
      className={`bg-primary-800 hover:bg-primary-700 flex items-center justify-center w-2/3 rounded-md ${sort.criterion == criterion ? 'text-accent-500' : ''}`}
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
  const [imageError, setImageError] = useState(false)
  const podcast = location.state.podcast as PodcastData
  const [episodes, setEpisodes] = useState<EpisodeData[]>([])
  const [subscribed, setSubscribed] = useState(false)
  const { subscriptions: { getSubscription, deleteSubscription, addSubscription, reloadSubscriptions },
    history: { getCompletedEpisodes },
    subscriptionsEpisodes: { getAllSubscriptionsEpisodes, deleteSubscriptionEpisodes, saveSubscriptionsEpisodes } } = useDB()
  const [podcastSettings, updatePodcastSettings] = usePodcastSettings(podcast.feedUrl)
  const [tweakMenu, setTweakMenu] = useState<ReactNode>(undefined)
  const { t } = useTranslation()

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

  const loadEpisodes = async () => {
    const isSubscribed = await getSubscription(podcast.feedUrl) !== undefined
    setSubscribed(isSubscribed)

    let episodes;
    if (isSubscribed) {
      episodes = await getAllSubscriptionsEpisodes({ podcastUrl: podcast.feedUrl })
      if (!episodes.length) {
        episodes = await parseXML(podcast.feedUrl)
        saveSubscriptionsEpisodes(episodes)
      }
    } else {
      episodes = await parseXML(podcast.feedUrl)
    }

    return sortEpisodes(episodes)
  }

  const filterEpisodes = async () => {
    const newEpisodes = await loadEpisodes()

    const completedEpisodes = await getCompletedEpisodes()

    if (podcastSettings.filter.played === SwitchState.True) {
      setEpisodes(newEpisodes.filter(ep => completedEpisodes.includes(ep.src)))
    } else if (podcastSettings.filter.played === SwitchState.False) {
      setEpisodes(newEpisodes.filter(ep => !completedEpisodes.includes(ep.src)))
    }else {
      setEpisodes(newEpisodes)
    }
  }

  useEffect(() => {
    loadEpisodes().then(episodes => setEpisodes(episodes))
    setTweakMenu(undefined)
  }, [podcast.feedUrl])


  useEffect(() => {
    setEpisodes(sortEpisodes(episodes))
  }, [podcastSettings.sort.criterion, podcastSettings.sort.mode])


  useEffect(() => {
    filterEpisodes()

    // setEpisodes(sortEpisodes(episodes))
  }, [podcastSettings.filter.played])


  return (
    <div className="relative p-2 w-full flex flex-col">
      <div className='flex justify-left w-full gap-3 pb-3 border-b-[3px] border-primary-800'>

        {tweakMenu &&
          <div className="left-1/2 -translate-x-1/2 absolute w-2/3 top-0 rounded-b-3xl overflow-hidden bg-primary-900 border-[1px] border-t-0 border-primary-600 flex flex-col justify-between items-center transition-all duration-200 z-20">
            <div className="p-2 flex flex-col gap-1 items-center w-full">
              {tweakMenu}
            </div>

            <button className="border-t-2 border-primary-800 p-2 h-5 w-4/5 flex justify-center items-center mt-1"
              onClick={() => setTweakMenu(undefined)}
            >
              <span className="h-6 w-6">{icons.upArrow}</span>
            </button>
          </div>
        }

        {imageError ?
          icons.photo :
          <img
            className="bg-primary-700 h-40 aspect-square rounded-md"
            src={podcast.coverUrlLarge}
            alt=""
            onError={() => setImageError(true)}
          />
        }

        <div className="flex flex-col">
          <h1>{podcast.podcastName}</h1>
          <h2 className="mb-2">{podcast.artistName}</h2>

          <div className="flex gap-2">
            <button className="hover:text-accent-500" onClick={async () => {
              if (subscribed) {
                await deleteSubscription(podcast.feedUrl)
                setSubscribed(false)
                await deleteSubscriptionEpisodes(podcast.feedUrl)
              } else {
                podcast.id = await addSubscription(podcast)
                setSubscribed(true)
                await saveSubscriptionsEpisodes(episodes)
              }
              reloadSubscriptions()
            }}>
              {subscribed ? icons.starFilled : icons.star}
            </button>
            <button className="hover:text-accent-500" onClick={async () => {
              const fetchedEpisodes = await parseXML(podcast.feedUrl)
              setEpisodes(sortEpisodes(fetchedEpisodes))
              saveSubscriptionsEpisodes(fetchedEpisodes)
            }
            }>
              {icons.reload}
            </button>

            <button
              className="hover:text-accent-500"
              onClick={() => {
                setTweakMenu(
                  <>
                    <SortButton podcastUrl={podcast.feedUrl} criterion="date">
                      {t('date')}
                    </SortButton>
                    <SortButton podcastUrl={podcast.feedUrl} criterion="duration">
                      {t('duration')}
                    </SortButton>
                  </>
                )
              }
              }>
              {icons.sort}
            </button>
            <button
              className="hover:text-accent-500"
              onClick={() => {
                setTweakMenu(
                  <>
                    <Switch initialState={podcastSettings.filter.played} setState={value => {
                      updatePodcastSettings({ filter: { played: value } })
                    }} labels={[t('not_played'), t('played')]} />
                  </>
                )
              }
              }>
              {icons.filter}
            </button>
          </div>

        </div>
      </div >

      <div className="grid content-start">
        {episodes.map((episode, i) => (
          <Suspense key={i} fallback={<div className="bg-primary-800 h-20 w-full" />}>
            <EpisodeCard
              episode={episode}
              className="hover:bg-primary-800 border-b-[1px] border-primary-800"
            />
          </Suspense>
        ))}
      </div>
    </div >
  )
}

export default PodcastPreview;