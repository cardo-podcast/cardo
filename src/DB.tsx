import Database, { QueryResult } from "tauri-plugin-sql-api";
import { path } from "@tauri-apps/api"
import { PodcastData } from ".";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";


let db: Database = new Database('');

// Favorite podcasts functions
const addFavoritePodcast = async(podcast: PodcastData) => {
  await db.execute(
      "INSERT into favorite_podcasts (podcastName, artistName, coverUrl, coverUrlLarge, feedUrl) VALUES ($1, $2, $3, $4, $5)",
      [podcast.podcastName, podcast.artistName, podcast.coverUrl, podcast.coverUrlLarge, podcast.feedUrl],
    );
}

const getFavoritePodcast = async(feedUrl: string): Promise<PodcastData | undefined> => {
  const r: PodcastData[] = await db.select(
    "SELECT * from favorite_podcasts WHERE feedUrl = $1", [feedUrl]
  )
  if (r.length > 0) {
    return r[0]
  }
}

const removeFavoritePodcast = async (feedUrl: string): Promise<QueryResult | undefined> => {
  const fav = await getFavoritePodcast(feedUrl)

  if (fav === undefined) return
  
  return await db.execute(
    "DELETE FROM favorite_podcasts WHERE feedUrl = $1",
    [feedUrl],
  )
}

const getFavoritePodcasts = async(): Promise<PodcastData[]> => {
  const r: PodcastData[] = await db.select(
    "SELECT * from favorite_podcasts")
  
    return r
}

interface DBContextProps {
  db: Database,
  favoritePodcasts: {
    favorites: PodcastData[],
    addFavoritePodcast: (podcast: PodcastData) => Promise<void>,
    getFavoritePodcast: (feedUrl: string) => Promise<PodcastData | undefined>,
    removeFavoritePodcast: (feedUrl: string) => Promise<QueryResult | undefined>,
    reloadFavoritePodcasts: () => Promise<PodcastData[]>,
  }
}

const DBContext = createContext<DBContextProps | undefined>(undefined);

export function useDB(): DBContextProps {
  return useContext(DBContext) as DBContextProps
}

export function DBProvider({ children }: {children: ReactNode}){
  const [dbLoaded, setDbLoaded] = useState(false)
  const [favoritePodcastsList, setFavoritePodcastsList] = useState<PodcastData[]>([]);


  useEffect(()=>{
    // load database
    path.appDataDir().then(
      appDataPath => path.join(appDataPath, "db.sqlite")
    ).then(
      dbPath => Database.load(dbPath)
    ).then(
      dbLoaded => {db = dbLoaded
      setDbLoaded(true)
  })
  }, [])

  useEffect(() => {
    if (!dbLoaded) return

    getFavoritePodcasts().then(r => {
      setFavoritePodcastsList(r)
    })
  }, [dbLoaded])

  const reloadFavoritePodcasts = async(): Promise<PodcastData[]> => {
    const fp = await getFavoritePodcasts()
    setFavoritePodcastsList(fp)
    return fp
  }

  return(
    <DBContext.Provider value={{db, favoritePodcasts: {
      favorites: favoritePodcastsList,
      addFavoritePodcast,
      getFavoritePodcast,
      removeFavoritePodcast,
      reloadFavoritePodcasts
      }}}>
      {children}
    </DBContext.Provider>
  )

}
