import { useLocation } from "react-router-dom";
import { EpisodeData, PodcastData } from "..";
import { Dispatch, lazy, SetStateAction, useEffect, useState, Suspense } from "react";
import * as icons from "../Icons"
import { getXmlDownloaded, parseXML, removeXmlDownloaded, saveXml } from "../utils";
// import EpisodeCard from "../components/EpisodeCard";
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

function PodcastPreview({ play }: { play: (episode?: EpisodeData) => void }) {
  const location = useLocation();
  const [imageError, setImageError] = useState(false)
  const podcast = location.state.podcast as PodcastData
  const [episodes, setEpisodes] = useState<EpisodeData[]>([])
  const [subscribed, setSubscribed] = useState(false)
  const { subscriptions: { getSubscription } } = useDB()
  const EpisodeCard = lazy(() => import('../components/EpisodeCard'));

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
        setEpisodes(result)
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
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="grid gap-1">
          <Suspense fallback={
            Array.from({ length: 10 }).map(()=>{
              return <div className="bg-zinc-800 h-20 w-full"></div>
            })
          }>
                {episodes.map((episode, i) => (
                  <EpisodeCard
                    key={i}
                    episode={episode}
                    podcast={podcast}
                    play={() => play(episode)}
                  />
                ))}
              </Suspense>
        </div>
      </div>
    </div>
  )
}

export default PodcastPreview;