import Database from '@tauri-apps/plugin-sql'
import { join, appDataDir } from '@tauri-apps/api/path'
import { ReactNode, useEffect, useState } from 'react'
import { useSubscriptionsStore } from './Subscriptions'
import { useSubscriptionsEpisodesStore } from './SubscriptionsEpisodes'
import { useEpisodeStateStore } from './EpisodeState'
import { useMiscStore } from './Misc'
import { useQueueStore } from './Queue'
import { useDownloadsStore } from './Downloads'
import {
  QueueContext,
  DownloadsContext,
  HistoryContext,
  MiscContext,
  SubscriptionsEpisodesContext,
  SubscriptionsContext,
  useSubscriptionsEpisodes,
  useDownloads,
  useQueue,
} from '../ContextProviders'

function QueueProvider({ db, children }: { db: Database; children: ReactNode }) {
  const queue = useQueueStore(db)

  return <QueueContext.Provider value={queue}>{children}</QueueContext.Provider>
}

function DownloadsProvider({ db, children }: { db: Database; children: ReactNode }) {
  const downloads = useDownloadsStore(db)

  return <DownloadsContext.Provider value={downloads}>{children}</DownloadsContext.Provider>
}

function HistoryProvider({ db, children }: { db: Database; children: ReactNode }) {
  const history = useEpisodeStateStore(db)

  return <HistoryContext.Provider value={history}>{children}</HistoryContext.Provider>
}

function MiscProvider({ db, children }: { db: Database; children: ReactNode }) {
  const misc = useMiscStore(db)

  return <MiscContext.Provider value={misc}>{children}</MiscContext.Provider>
}

function SubscriptionsEpisodesProvider({ db, children }: { db: Database; children: ReactNode }) {
  const subscriptionsEpisodes = useSubscriptionsEpisodesStore(db)

  return <SubscriptionsEpisodesContext.Provider value={subscriptionsEpisodes}>{children}</SubscriptionsEpisodesContext.Provider>
}

function SubscriptionsProvider({ db, children }: { db: Database; children: ReactNode }) {
  const subscriptionsEpisodes = useSubscriptionsEpisodes()
  const downloads = useDownloads()
  const queue = useQueue()
  const subscriptions = useSubscriptionsStore(db, subscriptionsEpisodes, downloads, queue)

  return <SubscriptionsContext.Provider value={subscriptions}>{children}</SubscriptionsContext.Provider>
}

export function DBProvider({ children }: { children: ReactNode }) {
  const [db, setDB] = useState<Database>()

  useEffect(() => {
    appDataDir().then((dir) =>
      join(dir, 'db.sqlite').then(async (dbPath) => {
        setDB(await Database.load('sqlite:' + dbPath))
      })
    )
  }, [])

  if (!db) return <></>

  return (
    <QueueProvider db={db}>
      <DownloadsProvider db={db}>
        <HistoryProvider db={db}>
          <MiscProvider db={db}>
            <SubscriptionsEpisodesProvider db={db}>
              <SubscriptionsProvider db={db}>
                {children}
              </SubscriptionsProvider>
            </SubscriptionsEpisodesProvider>
          </MiscProvider>
        </HistoryProvider>
      </DownloadsProvider>
    </QueueProvider>
  )
}
