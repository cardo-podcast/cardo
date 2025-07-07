import Database from 'tauri-plugin-sql-api'
import { join, appDataDir } from '@tauri-apps/api/path'
import { ReactNode, useEffect, useState } from 'react'
import { useSubscriptions } from './Subscriptions'
import { useSubscriptionsEpisodes } from './SubscriptionsEpisodes'
import { useEpisodeState } from './History'
import { useMisc } from './Misc'
import { useQueue } from './Queue'
import { useDownloads } from './Downloads'
import { DBContext } from '../ContextProviders'

export function DBProvider({ children }: { children: ReactNode }) {
  // provider containing groups of variables / methods related to database
  const [db, setDB] = useState<Database>()
  const [dbLoaded, setDBLoaded] = useState(false)
  const subscriptionsEpisodes = useSubscriptionsEpisodes(db!)
  const queue = useQueue(db!)
  const downloads = useDownloads(db!)
  const subscriptions = useSubscriptions(db!, subscriptionsEpisodes, downloads, queue)
  const history = useEpisodeState(db!)
  const misc = useMisc(db!)

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

  return (
    <DBContext.Provider value={{ dbLoaded, subscriptions, subscriptionsEpisodes, history, misc, queue, downloads }}>
      {children}
    </DBContext.Provider>
  )
}
