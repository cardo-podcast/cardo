import { useLocation } from "react-router-dom";
import { EpisodeData, PodcastData } from "..";
import { Dispatch, ReactNode, SetStateAction, Suspense, useEffect, useState } from "react";
import * as icons from "../Icons"
import { getXmlDownloaded, parseXML, removeXmlDownloaded, saveXml } from "../utils";
import EpisodeCard from "../components/EpisodeCard";
import { useDB } from "../DB";

function FavoriteButton({ podcast, subscribed, setSubscribed }: { podcast: PodcastData, subscribed: boolean, setSubscribed: Dispatch<SetStateAction<boolean>> }) {
  const { subscriptions } = useDB()

  return (
    <button onClick={async () => {
      if (subscribed) {
        await subscriptions.deleteSubscription(podcast.feedUrl)
        setSubscribed(false)
        removeXmlDownloaded(podcast)
      } else {
        podcast.id = await subscriptions.addSubscription(podcast)
        setSubscribed(true)
      }
      subscriptions.reloadSubscriptions()
    }}>
      {subscribed ? icons.starFilled : icons.star}
    </button>
  )
}

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
      className={`flex items-center gap-[2px] px-1 text-sm rounded-md hover:bg-zinc-600 ${globalCriterion.criterion === criterion && 'text-amber-500'}`}
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

  return (
    <div className={`flex justify-center gap-2 rounded-md ${showMenu && 'bg-zinc-700'}`}>
      <button className="" onClick={() => setShowMenu(!showMenu)}>
        {icons.sort}
      </button>
      {showMenu &&
        <div className="flex">
          <SortButton criterion="date" globalCriterion={criterion} setGlobalCriterion={setSortCriterion}>
            DATE
          </SortButton>
          <SortButton criterion="duration" globalCriterion={criterion} setGlobalCriterion={setSortCriterion}>
            DURATION
          </SortButton>
        </div>
      }
    </div>
  )
}

function PodcastPreview({ play }: { play: (episode?: EpisodeData, podcast?: string) => void }) {
  const location = useLocation();
  const [imageError, setImageError] = useState(false)
  const podcast = location.state.podcast as PodcastData
  const [episodes, setEpisodes] = useState<EpisodeData[]>([])
  const [subscribed, setSubscribed] = useState(false)
  const { subscriptions: { getSubscription } } = useDB()
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>({ criterion: 'date', mode: 'desc' })


  const sortEpisodes = (unsortedEpisodes = episodes): EpisodeData[] => {
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
  }

  useEffect(() => setEpisodes(sortEpisodes()), [sortCriterion])


  useEffect(() => {
    getSubscription(podcast.feedUrl).then(result => {
      setSubscribed(result !== undefined)
      if (result !== undefined) {
        setSubscribed(true)
      }
    })
  }, [getSubscription, podcast.feedUrl])

  useEffect(() => {
    setEpisodes([])
    getXmlDownloaded(podcast).then(async (path) => {
      if (path === undefined && subscribed) {
        // in case is subscribed but not downloaded
        path = await saveXml(podcast)
      }

      const url = path === undefined ? podcast.feedUrl : path
      parseXML(url, path !== undefined).then(result => {
        setEpisodes(sortEpisodes(result))
      })
    });
  }, [podcast, subscribed])



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
            <FavoriteButton podcast={podcast} subscribed={subscribed} setSubscribed={setSubscribed} />
            <button onClick={() => {
              parseXML(podcast.feedUrl).then(result => {
                setEpisodes(result)
              })
            }}>
              {icons.reload}
            </button>
            <SortMenu criterion={sortCriterion} setSortCriterion={setSortCriterion} />
          </div>

        </div>
      </div>

      <div className="flex-1 grid gap-">
        {episodes.map((episode, i) => (
          <Suspense key={i} fallback={<div className="bg-zinc-800 h-20 w-full" />}>
            <EpisodeCard
              episode={episode}
              podcast={podcast}
              play={() => play !== undefined && play(episode, podcast.feedUrl)}
            />
          </Suspense>
        ))}
      </div>
    </div>
  )
}

export default PodcastPreview;