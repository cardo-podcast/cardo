import Database, { QueryResult } from "tauri-plugin-sql-api";
import { path } from "@tauri-apps/api"
import { PodcastData } from ".";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";


let db: Database = new Database('');

// Functions to subscribe podcasts
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

interface DBContextProps {
  db: Database,
  subscriptions: {
    subscriptions: PodcastData[],
    addSubscription: (podcast: PodcastData) => Promise<number>,
    getSubscription: (feedUrl: string) => Promise<PodcastData | undefined>,
    deleteSubscription: (feedUrl: string) => Promise<QueryResult | undefined>,
    reloadSubscriptions: () => Promise<PodcastData[]>,
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
      }
    }}>
      {children}
    </DBContext.Provider>
  )

}
