import Database from 'tauri-plugin-sql-api'
import { join, appDataDir } from '@tauri-apps/api/path'
import {ReactNode, useEffect, useState } from 'react'
import { useSubscriptions } from './Subscriptions'
import { useSubscriptionsEpisodes } from './SubscriptionsEpisodes'
import { useEpisodeState } from './EpisodeState'
import { useMisc } from './Misc'
import { useQueue } from './Queue'
import { useDownloads } from './Downloads'
import { DBContext } from '../ContextProviders'


export function DBProvider({ children }: { children: ReactNode }) {
  // provider containing groups of variables / methods related to database
  const [db, setDB] = useState<Database>()
  const [dbLoaded, setDBLoaded] = useState(false)
  const subscriptions = useSubscriptions(db!)
  const subscriptionsEpisodes = useSubscriptionsEpisodes(db!, subscriptions.subscriptions)
  const history = useEpisodeState(db!)
  const misc = useMisc(db!)
  const queue = useQueue(db!)
  const downloads = useDownloads(db!)

  async function init() {
    const dbPath = await join(await appDataDir(), 'db.sqlite')
    setDB(await Database.load('sqlite:' + dbPath))
    setDBLoaded(true)
  }

  useEffect(() => {
    init()
  }, [])

  if (!dbLoaded) {
    // all elements that depends of DB aren't initialized till db is loaded
    return <></>
  }


  return <DBContext.Provider value={{ dbLoaded, subscriptions, subscriptionsEpisodes, history, misc, queue, downloads }}>{children}</DBContext.Provider>
}
