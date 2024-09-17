import Database from "tauri-plugin-sql-api";
import { join, appDataDir } from "@tauri-apps/api/path"
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useSubscriptions } from "./Subscriptions";
import { useSubscriptionsEpisodes } from "./SubscriptionsEpisodes";
import { useEpisodeState } from "./EpisodeState";
import { useMisc } from "./Misc";
import { useQueue } from "./Queue";
import { useDownloads } from "./Downloads";



// #region DB PROVIDER

export type DB = ReturnType<typeof initDB>

const DBContext = createContext<DB | undefined>(undefined);

export function useDB(): DB {
  return useContext(DBContext) as DB
}

function initDB() {
  const [db, setDB] = useState<Database>()
  const [dbLoaded, setDBLoaded] = useState(false)
  const subscriptions = useSubscriptions(db!)
  const subscriptionsEpisodes = useSubscriptionsEpisodes(db!, subscriptions.subscriptions)
  const history = useEpisodeState(db!)
  const misc = useMisc(db!)
  const queue = useQueue(db!)
  const downloads = useDownloads(db!)

  async function init() {
    const dbPath = await join(await appDataDir(), "db.sqlite")
    console.log('QQQ: ', 'sqlite:/' + dbPath)
    setDB(await Database.load('sqlite:' + dbPath))
    setDBLoaded(true)
  }

  useEffect(() => {
    init()
  }, [])

  return {
    dbLoaded,
    db,
    subscriptions,
    subscriptionsEpisodes,
    history,
    misc,
    queue,
    downloads
  }
}


export function DBProvider({ children }: { children: ReactNode }) {
  // provider containing groups of variables / methods related to database

  const db = initDB()


  if (!db.dbLoaded) { // all elements that depends of DB aren't initialized till db is loaded
    return <></>
  }

  return (
    <DBContext.Provider value={db}>
      {children}
    </DBContext.Provider>
  )

}