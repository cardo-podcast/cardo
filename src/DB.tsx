import Database, { QueryResult } from "tauri-plugin-sql-api";
import { path } from "@tauri-apps/api"
import { EpisodeState, PodcastData } from ".";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";


let db: Database = new Database('');

////////////// SUBSCRIPTIONS  //////////////

const addSubscription = async (podcast: PodcastData): Promise<number> => {
  // returns subscription id on database
  const r = await db.execute(
    "INSERT into subscriptions (podcastName, artistName, coverUrl, coverUrlLarge, feedUrl) VALUES ($1, $2, $3, $4, $5)",
    [podcast.podcastName, podcast.artistName, podcast.coverUrl, podcast.coverUrlLarge, podcast.feedUrl],
  );
  
  return r.lastInsertId
}

const getSubscription = async (feedUrl: string): Promise<PodcastData | undefined> => {
  const r: PodcastData[] = await db.select(
    "SELECT * from subscriptions WHERE feedUrl = $1", [feedUrl]
  )
  if (r.length > 0) {
    return r[0]
  }
}

const deleteSubscription = async (feedUrl: string): Promise<QueryResult | undefined> => {
  const fav = await getSubscription(feedUrl)

  if (fav === undefined) return

  return await db.execute(
    "DELETE FROM subscriptions WHERE feedUrl = $1",
    [feedUrl],
  )
}

const getSubscriptions = async (): Promise<PodcastData[]> => {
  const r: PodcastData[] = await db.select(
    "SELECT * from subscriptions")

  return r
}


////////////// EPISODE STATE  //////////////

const getEpisodeState = async (episodeUrl: string): Promise<EpisodeState | undefined> => {
  const r: EpisodeState[] = await db.select(
    "SELECT * from episodes_history WHERE episode = $1", [episodeUrl]
  )
  if (r.length > 0) {
    return r[0]
  }
}

const updateEpisodeState = async (episodeUrl: string, podcastUrl: string, position: number, total: number) => {

  if (await getEpisodeState(episodeUrl) === undefined) {
    // create a new entry
    await db.execute(
      "INSERT into episodes_history (episode, podcast, position, total, timestamp) VALUES ($1, $2, $3, $4, $5)",
      [episodeUrl, podcastUrl, position, total, Date.now()],
    );
  }else {
    // update an existent entry
    await db.execute(
      `UPDATE episodes_history
      SET position = $1, timestamp = $2`,
      [position, Date.now()],
    );
  }
}





////////////// DB CONTEXT  //////////////

interface DBContextProps {
  db: Database,
  subscriptions: {
    subscriptions: PodcastData[],
    addSubscription: (podcast: PodcastData) => Promise<number>,
    getSubscription: (feedUrl: string) => Promise<PodcastData | undefined>,
    deleteSubscription: (feedUrl: string) => Promise<QueryResult | undefined>,
    reloadSubscriptions: () => Promise<PodcastData[]>,
  },
  history: {
    getEpisodeState: (episodeUrl: string) => Promise<EpisodeState | undefined>,
    updateEpisodeState: (episodeUrl: string, podcastUrl: string, position: number, total: number) => Promise<void>
  }
}

const DBContext = createContext<DBContextProps | undefined>(undefined);

export function useDB(): DBContextProps {
  return useContext(DBContext) as DBContextProps
}

export function DBProvider({ children }: { children: ReactNode }) {
  const [dbLoaded, setDbLoaded] = useState(false)
  const [subscriptionsList, setSubscriptionsList] = useState<PodcastData[]>([]);


  useEffect(() => {
    // load database
    path.appDataDir().then(
      appDataPath => path.join(appDataPath, "db.sqlite")
    ).then(
      dbPath => Database.load(dbPath)
    ).then(
      dbLoaded => {
        db = dbLoaded
        setDbLoaded(true)
      })
    return () => {
      db.close()
    }
  }, [])

  useEffect(() => {
    if (!dbLoaded) return

    getSubscriptions().then(r => {
      setSubscriptionsList(r)
    })
  }, [dbLoaded])

  const reloadSubscriptions = async (): Promise<PodcastData[]> => {
    const fp = await getSubscriptions()
    setSubscriptionsList(fp)
    return fp
  }

  return (
    <DBContext.Provider value={{
      db, subscriptions: {
        subscriptions: subscriptionsList,
        addSubscription,
        getSubscription,
        deleteSubscription,
        reloadSubscriptions
      },
      history : {
        getEpisodeState,
        updateEpisodeState
      }
    }}>
      {children}
    </DBContext.Provider>
  )

}
