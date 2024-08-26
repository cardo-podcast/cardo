import Database, { QueryResult } from "tauri-plugin-sql-api";
import { path } from "@tauri-apps/api"
import { EpisodeData, EpisodeState, NewEpisodeData, PodcastData, RawEpisodeData } from ".";
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useSettings } from "./Settings";
import { parseXML } from "./utils";


let db: Database = new Database('');

// #region SUBSCRIPTIONS

const addSubscription = async (podcast: PodcastData): Promise<number> => {
  // returns subscription id on database
  const r = await db.execute(
    `INSERT into subscriptions (podcastName, artistName, coverUrl, coverUrlLarge, feedUrl, description)
      VALUES ($1, $2, $3, $4, $5, $6)`,
    [podcast.podcastName, podcast.artistName, podcast.coverUrl, podcast.coverUrlLarge, podcast.feedUrl, podcast.description ?? ''],
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
  await deleteSubscriptionEpisodes(feedUrl)
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

// #endregion
// #region EPISODE STATE

const getEpisodeState = async (episodeUrl: string): Promise<EpisodeState | undefined> => {
  const r: EpisodeState[] = await db.select(
    "SELECT * from episodes_history WHERE episode = $1", [episodeUrl]
  )
  if (r.length > 0) {
    return r[0]
  }
}

const getCompletedEpisodes = async (podcastUrl?: string) => {

  const query = `SELECT episode from episodes_history
    WHERE position = total
    ${podcastUrl? 'AND podcast = $1': ''}
    `

  const playedEpisodes: EpisodeState[] = await db.select(query, [podcastUrl])

  return playedEpisodes.map(episode => episode.episode) //only returns url
}

const getEpisodesStates = async (timestamp = 0): Promise<EpisodeState[]> => {
  const r: EpisodeState[] = await db.select(
    `SELECT * from episodes_history WHERE timestamp > $1`, [timestamp]
  )

  return r
}

const updateEpisodeState = async (episodeUrl: string, podcastUrl: string, position: number, total: number, timestamp?: number) => {

  position = Math.floor(position)
  total = Math.floor(total)

  await db.execute(
    `INSERT into episodes_history (episode, podcast, position, total, timestamp)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (episode) DO UPDATE
      SET position = $3, total = $4, timestamp = $5
      WHERE episode = $1 AND timestamp < $5`,
    [episodeUrl, podcastUrl, Math.min(position, total), Math.max(position, total), timestamp ?? Date.now()],
  );

}

// #endregion
// #region MISC


const getMiscKey = async (key: string): Promise<string | undefined> => {
  const r: { value: string }[] = await db.select(
    `SELECT value from misc
      WHERE description = $1`, [key])
  if (r.length > 0) {
    return r[0].value
  }
}

const setMiscValue = async (key: string, value: string) => {
  await db.execute(
    `INSERT into misc (description, value)
    VALUES ($1, $2)
    ON CONFLICT (description) DO UPDATE
    SET value = $2
    WHERE description = $1
    `,
    [key, value],
  )
}


const getSyncKey = async (): Promise<string | undefined> => {
  return await getMiscKey('syncKey')
}

const setSyncKey = async (key: string) => {
  return await setMiscValue('syncKey', key)
}

const getLastSync = async (): Promise<number> => {
  return Number(await getMiscKey('lastSync') ?? '0')
}

const setLastSync = async (timestamp: number) => {
  return await setMiscValue('lastSync', timestamp.toString())
}

const getLastPlayed = async (): Promise<EpisodeData | undefined> => {
  const r: { value: string }[] = await db.select(
    `SELECT value from misc
      WHERE description = "lastPlaying"`,
  )
  if (r.length > 0) {

    if (r[0].value == 'NONE') {
      return
    }

    const parsedEpisode: EpisodeData = JSON.parse(r[0].value)

    return {
      ...parsedEpisode,
      pubDate: new Date(parsedEpisode.pubDate)
    }
  }
}

const setLastPlaying = async (playingEpisode?: EpisodeData) => {
  // empty args to set NONE as last played

  const data = playingEpisode ? JSON.stringify(playingEpisode) : 'NONE'

  return await setMiscValue('lastPlaying', data)

}


const getLastUpdate = async () => {
  return Number(await getMiscKey('lastUpdate') ?? '0')
}

const setLastUpdate = async (timestamp: number) => {
  return await setMiscValue('lastUpdate', timestamp.toString())
}

// #endregion
// #region QUEUE

export type Queue = ReturnType<typeof initQueue>

function initQueue() {
  const [queue, setQueue] = useState<EpisodeData[]>([]) // list of queue sqlite id's
  const queueLoaded = useRef(false)

  useEffect(() => {
    if (queueLoaded.current) { // supress uggly db not loaded error on mounting
      updateOrder(queue.map(episode => episode.id))
    }
  }, [queue])

  const load = async () => {
    // load queue from sqlite db
    const loadedQueue = await getAll()
    const order = await readOrder()

    loadedQueue.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))

    setQueue(loadedQueue)

    queueLoaded.current = true
  }

  const readOrder = async (): Promise<number[]> => {
    const query: { value: string }[] = await db.select(`
      SELECT value FROM misc
      WHERE description = 'queueOrder'
      `)

    return query.length > 0 ? JSON.parse(query[0].value) : []
  }

  const updateOrder = async (newOrder: number[]) => {
    await db.execute(
      `INSERT into misc (description, value)
      VALUES ('queueOrder', $1)
      ON CONFLICT (description) DO UPDATE
      SET value = $1
      WHERE description = 'queueOrder'
      `,
      [JSON.stringify(newOrder)],
    )
  }

  const unshift = async (episode: EpisodeData) => {
    const id = await insertOnDb(episode)

    if (id !== undefined) { // episode appended to queue
      setQueue([{ ...episode, id: id }, ...queue])
    }
  }

  const push = async (episode: EpisodeData) => {
    const id = await insertOnDb(episode)

    if (id !== undefined) { // episode appended to queue
      setQueue([...queue, { ...episode, id: id }])
    }
  }

  const insertOnDb = async (episode: EpisodeData): Promise<number | undefined> => {
    // returns id in sql table if item is appended

    if (includes(episode.src)) {
      // only add episode if not is in queue yet
      return
    }

    const query = await db.execute(
      "INSERT into queue (title, description, src, pubDate, duration, size, podcastUrl, coverUrl) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [episode.title, episode.description, episode.src, episode.pubDate.getTime(), episode.duration, episode.size, episode.podcastUrl, episode.coverUrl || ''],
    );

    return query.lastInsertId
  }

  const indexOf = (episodeSrc: string) => {
    return queue.findIndex(episode => episode.src == episodeSrc)
  }

  const includes = (episodeSrc: string) => {
    return indexOf(episodeSrc) > -1
  }


  const next = (episode: EpisodeData) => {
    const nextIndex = queue.findIndex(ep => ep.id == episode.id) + 1
    return queue[nextIndex]
  }

  const remove = async (episodeSrc: string) => {
    // delete from queue
    const newQueue = [...queue]
    newQueue.splice(indexOf(episodeSrc), 1)

    setQueue(
      newQueue
    )

    await db.execute(
      "DELETE FROM queue WHERE src = $1",
      [episodeSrc],
    )
  }

  const batchRemove = async (episodesSrc: string[]) => {
    // delete from queue

    if (!episodesSrc.length) return

    const newQueue = queue.filter(episode => !episodesSrc.includes(episode.src))

    setQueue(newQueue)

    const placeholders = episodesSrc.map((_, i) => '$' + (i + 1)).join(',');

    await db.execute(
      `DELETE FROM queue WHERE src IN (${placeholders})`,
      [...episodesSrc],
    )
  }

  const getAll = async (): Promise<EpisodeData[]> => {
    const r: RawEpisodeData[] = await db.select(
      `SELECT queue.*, subscriptions.coverUrl AS podcastCover from queue
        LEFT JOIN subscriptions ON queue.podcastUrl = subscriptions.feedUrl
      `)


    return r.map(episode => ({
      ...episode,
      pubDate: new Date(episode.pubDate),
      podcast: { coverUrl: episode.podcastCover }
    }))
  }

  const move = (from: number, to: number) => {

    const newQueue = [...queue]
    const fromElement = newQueue.splice(from, 1)

    newQueue.splice(to, 0, fromElement[0])

    setQueue(newQueue)
  }


  return { queue, load, includes, push, unshift, remove, batchRemove, next, move }
}

// #endregion
// #region SUBSCRIPTIONS_EPISODES

const saveSubscriptionsEpisodes = async (episodes: EpisodeData[]) => {
  const sortedEpisodes = [...episodes]

  sortedEpisodes.sort((a, b) => a.pubDate.getTime() - b.pubDate.getTime())

  //
  const placeholders = sortedEpisodes.map((_, i) => `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`).join(', ');

  const values = sortedEpisodes.flatMap(episode => [
    episode.title,
    episode.description,
    episode.src,
    episode.pubDate.getTime(),
    episode.duration,
    episode.size,
    episode.podcastUrl,
    episode.coverUrl || ''
  ]);

  const query = `
    INSERT INTO subscriptions_episodes (title, description, src, pubDate, duration, size, podcastUrl, coverUrl) 
    VALUES ${placeholders} 
    ON CONFLICT (src) DO NOTHING
`;

  return await db.execute(query, values)

}

const deleteSubscriptionEpisodes = async (podcastUrl: string) => {
  await db.execute(
    "DELETE FROM subscriptions_episodes WHERE podcastUrl = $1",
    [podcastUrl],
  )
}

const getAllSubscriptionsEpisodes = async (options: { pubdate_gt?: number, podcastUrl?: string, searchTerm?: string }): Promise<EpisodeData[]> => {

  let query = 'SELECT * FROM subscriptions_episodes WHERE pubDate > $1'

  if (options.podcastUrl) {
    query += ' AND podcastUrl = $2'
  }

  if (options.searchTerm) {
    query += ` AND (lower(title) LIKE "%${options.searchTerm.toLowerCase()}%"
                    OR lower(description) LIKE "%${options.searchTerm.toLocaleLowerCase()}%")`
  }

  const r: EpisodeData[] = await db.select(query, [options.pubdate_gt ?? 0, options.podcastUrl])

  return r.map(episode => ({
    ...episode,
    pubDate: new Date(episode.pubDate)
  }))

}


const loadNewSubscriptionsEpisodes = async (pubdate_gt: number): Promise<NewEpisodeData[]> => {
  // get all uncompleted episodes since a pubDate  

  // get last feed dowload sync to highlight the new fetched episodes
  const r: { value: number }[] = await db.select(
    `SELECT value from misc
      WHERE description = "lastFeedDownload"`,
  )

  const lastSync = r[0]?.value ?? 0

  // set current time as last
  db.execute(`
      INSERT into misc (description, value)
      VALUES ('lastFeedDownload', $1)
      ON CONFLICT (description) DO UPDATE
      SET value = $1
      WHERE description = 'lastFeedDownload'
    `, [Date.now()])


  // get all episodes of the database, filter by pubdate
  const r2: RawEpisodeData[] = await db.select(`
    SELECT subscriptions_episodes.*, subscriptions.coverUrl AS podcastCover FROM subscriptions_episodes
    LEFT JOIN episodes_history ON subscriptions_episodes.src = episodes_history.episode
    LEFT JOIN subscriptions ON subscriptions_episodes.podcastUrl = subscriptions.feedUrl
    WHERE pubDate > $1
    AND (episodes_history.position IS NULL
	  OR episodes_history.position < episodes_history.total)
    `, [pubdate_gt])


  return r2.map(episode => ({
    ...episode,
    pubDate: new Date(episode.pubDate),
    new: episode.pubDate > lastSync, // is new if it's just discovered
    podcast: { coverUrl: episode.podcastCover }
  }))

}

// #endregion

// #region DB PROVIDER

export type DB = ReturnType<typeof initDB>

const DBContext = createContext<DB | undefined>(undefined);

export function useDB(): DB {
  return useContext(DBContext) as DB
}

function initDB() {
  const [dbLoaded, setDbLoaded] = useState(false)
  const [loggedInSync, setLoggedInSync] = useState(false)
  const [updatingFeeds, setUpdatingFeeds] = useState(false)
  const [subscriptionsList, setSubscriptionsList] = useState<PodcastData[]>([]);
  const [newEpisodes, setNewEpisodes] = useState<NewEpisodeData[]>([])
  const queue = initQueue()
  const [{ general: { numberOfDaysInNews, fetchSubscriptionsAtStartup } }, _] = useSettings()


  const loadNewEpisodes = async () => {
    const minDate = Date.now() - (24 * 3600 * 1000 * numberOfDaysInNews)
    const episodes = await loadNewSubscriptionsEpisodes(minDate)

    episodes.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())

    setNewEpisodes(episodes)
  }

  const updateSubscriptionsFeed = async () => {
    setUpdatingFeeds(true)
    for (const subscription of subscriptionsList) {
      const [episodes,] = await parseXML(subscription.feedUrl)
      const r = await saveSubscriptionsEpisodes(episodes)
      if (r.rowsAffected > 0) {
        loadNewEpisodes()
      }
    }
    setUpdatingFeeds(false)
  }

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

    queue.load()

    getSubscriptions().then(r => {
      setSubscriptionsList(r)
    })
  }, [dbLoaded])

  useEffect(() => {
    // extract episodes newer than setting
    if (dbLoaded) {
      loadNewEpisodes()
    }
  }, [dbLoaded, numberOfDaysInNews])

  useEffect(() => {
    if (fetchSubscriptionsAtStartup) {
      updateSubscriptionsFeed()
    }
  }, [subscriptionsList, fetchSubscriptionsAtStartup])

  const reloadSubscriptions = async (): Promise<PodcastData[]> => {
    const fp = await getSubscriptions()
    setSubscriptionsList(fp)
    return fp
  }

  return {
    db, subscriptions: {
      subscriptions: subscriptionsList,
      addSubscription,
      getSubscription,
      deleteSubscription,
      reloadSubscriptions
    },
    history: {
      getEpisodeState,
      updateEpisodeState,
      getEpisodesStates,
      getLastPlayed,
      setLastPlaying,
      getCompletedEpisodes
    },
    sync: {
      getSyncKey,
      setSyncKey,
      getLastSync,
      setLastSync,
      loggedInSync,
      setLoggedInSync
    },
    queue,
    subscriptionsEpisodes: {
      saveSubscriptionsEpisodes,
      deleteSubscriptionEpisodes,
      getAllSubscriptionsEpisodes,
      newEpisodes,
      updatingFeeds,
      updateSubscriptionsFeed
    },
    dbLoaded,
    appUpdate: {
      getLastUpdate,
      setLastUpdate
    }
  }
}

export function DBProvider({ children }: { children: ReactNode }) {
  const dbManager = initDB()


  return (
    <DBContext.Provider value={dbManager}>
      {children}
    </DBContext.Provider>
  )

}

// #endregion