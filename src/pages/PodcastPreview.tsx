import { useLocation } from "react-router-dom";
import { EpisodeData, PodcastData } from "..";
import { Dispatch, ReactNode, SetStateAction, Suspense, useCallback, useEffect, useState } from "react";
import * as icons from "../Icons"
import { parseXML } from "../utils";
import EpisodeCard from "../components/EpisodeCard";
import { useDB } from "../DB";
import { Switch } from "../components/Inputs";
import { usePodcastSettings } from "../Settings";
import { useTranslation } from "react-i18next";


type SortCriterion = {
  criterion: string,
  mode: 'asc' | 'desc'
}

function SortButton({ criterion, globalCriterion, setGlobalCriterion, children }:
  { criterion: string, globalCriterion: SortCriterion, setGlobalCriterion: Dispatch<SetStateAction<SortCriterion>>, children: ReactNode }) {


  return (
    <button onClick={() => {
      if (globalCriterion.criterion === criterion) {
        setGlobalCriterion({
          ...globalCriterion,
          mode: globalCriterion.mode === 'asc' ? 'desc' : 'asc'
        })
      } else {
        globalCriterion.criterion = criterion
        globalCriterion.criterion = criterion
        setGlobalCriterion({
          ...globalCriterion,
          criterion: criterion
        })
      }
    }}
      className={`flex items-center uppercase gap-[2px] px-1 text-sm rounded-md hover:bg-zinc-600 ${globalCriterion.criterion === criterion && 'text-amber-500'}`}
    >
      {children}
      <div className="w-4 h-4 justify-center flex">
        {globalCriterion.mode === 'asc' ? icons.upArrow : icons.downArrow}
      </div>
    </button>
  )
}


function SortMenu({ criterion, setSortCriterion }:
  { criterion: SortCriterion, setSortCriterion: Dispatch<SetStateAction<SortCriterion>> }) {
  const [showMenu, setShowMenu] = useState(false)
  const { t } = useTranslation();

  return (
    <div className={`flex justify-center gap-2 rounded-md ${showMenu && 'bg-zinc-700'}`}>
      <button className="" onClick={() => setShowMenu(!showMenu)}>
        {icons.sort}
      </button>
      {showMenu &&
        <div className="flex">
          <SortButton criterion="date" globalCriterion={criterion} setGlobalCriterion={setSortCriterion}>
            {t('date')}
          </SortButton>
          <SortButton criterion="duration" globalCriterion={criterion} setGlobalCriterion={setSortCriterion}>
            {t('duration')}
          </SortButton>
        </div>
      }
    </div>
  )
}


function FilterMenu({ podcast }: { podcast: PodcastData }) {
  const [showMenu, setShowMenu] = useState(false)
  const [podcastSettings, updatePodcastSettings] = usePodcastSettings(podcast.feedUrl)
  const [played, setPlayed] = useState(podcastSettings.filter.played)
  const { t } = useTranslation();


  useEffect(() => {
    podcastSettings.filter.played = played
    updatePodcastSettings(podcastSettings)
  }, [played])

  return (
    <div className={`flex justify-center gap-2 rounded-md ${showMenu && 'bg-zinc-700'}`}>
      <button className="" onClick={() => setShowMenu(!showMenu)}>
        {icons.filter}
      </button>
      {showMenu &&
        <div className="flex">
          <Switch state={played} setState={setPlayed} labels={[t('not_played'), t('played')]} />
        </div>
      }
    </div>
  )
}


function PodcastPreview() {
  const location = useLocation();
  const [imageError, setImageError] = useState(false)
  const podcast = location.state.podcast as PodcastData
  const [episodes, setEpisodes] = useState<EpisodeData[]>([])
  const [subscribed, setSubscribed] = useState(false)
  const { subscriptions: { getSubscription, deleteSubscription, addSubscription, reloadSubscriptions },
    subscriptionsEpisodes: { getAllSubscriptionsEpisodes, deleteSubscriptionEpisodes, saveSubscriptionsEpisodes } } = useDB()
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>({ criterion: 'date', mode: 'desc' })
  const [podcastSettings,] = usePodcastSettings(podcast.feedUrl)


  const sortEpisodes = useCallback((unsortedEpisodes = episodes): EpisodeData[] => {
    const applyMode = (a: any, b: any) => {
      if (sortCriterion.mode === 'asc') {
        return a - b
      } else {
        return b - a
      }
    }

    let sortedEpisodes: EpisodeData[] = []
    switch (sortCriterion.criterion) {
      case 'duration':
        sortedEpisodes = [...unsortedEpisodes].sort((a, b) => applyMode(a.duration, b.duration))
        break
      case 'date':
        sortedEpisodes = [...unsortedEpisodes].sort((a, b) => applyMode(a.pubDate, b.pubDate))
        break
    }
    return sortedEpisodes
  }, [episodes, sortCriterion])

  useEffect(() => setEpisodes(sortEpisodes()), [sortCriterion])

  const loadEpisodes = async () => {
    const isSubscribed = await getSubscription(podcast.feedUrl) !== undefined
    setSubscribed(isSubscribed)

    let episodes;
    if (isSubscribed) {
      episodes = await getAllSubscriptionsEpisodes(podcast.feedUrl)
      if (!episodes.length) {
        episodes = await parseXML(podcast.feedUrl)
        saveSubscriptionsEpisodes(episodes)
      }
    } else {
      episodes = await parseXML(podcast.feedUrl)
    }

    setEpisodes(sortEpisodes(episodes))

  }

  useEffect(() => {
    loadEpisodes()

  }, [podcast.feedUrl])


  return (
    <div className="p-2 w-full flex flex-col">
      <div className='flex justify-left w-full gap-3 bg-zinc-800 rounded-md mb-2'>
        {imageError ?
          icons.photo :
          <img
            className="bg-zinc-700 h-40 aspect-square rounded-md"
            src={podcast.coverUrlLarge}
            alt=""
            onError={() => setImageError(true)}
          />
        }

        <div className="flex flex-col">
          <h1>{podcast.podcastName}</h1>
          <h2 className="mb-2">{podcast.artistName}</h2>

          <div className="flex gap-2">
            <button onClick={async () => {
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
            <button onClick={async () => {
              const fetchedEpisodes = await parseXML(podcast.feedUrl)
              setEpisodes(sortEpisodes(fetchedEpisodes))
              saveSubscriptionsEpisodes(fetchedEpisodes)
            }
            }>
              {icons.reload}
            </button>
            <SortMenu criterion={sortCriterion} setSortCriterion={setSortCriterion} />
            <FilterMenu podcast={podcast} />
          </div>

        </div>
      </div>

      <div className="grid gap-1 content-start">
        {episodes.map((episode, i) => (
          <Suspense key={i} fallback={<div className="bg-zinc-800 h-20 w-full" />}>
            <EpisodeCard
              episode={episode}
              play={() => playerRef.current && playerRef.current.play(episode)}
              className="hover:bg-zinc-800 rounded-md"
              filter={podcastSettings.filter}
            />
          </Suspense>
        ))}
      </div>
    </div>
  )
}

export default PodcastPreview;