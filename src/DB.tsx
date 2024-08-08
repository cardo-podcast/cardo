import Database, { QueryResult } from "tauri-plugin-sql-api";
import { path } from "@tauri-apps/api"
import { EpisodeData, EpisodeState, PodcastData } from ".";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";


let db: Database = new Database('');

// #region SUBSCRIPTIONS

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

const getEpisodesStates = async (timestamp = 0): Promise<EpisodeState[]> => {
  const r: EpisodeState[] = await db.select(
    `SELECT * from episodes_history WHERE timestamp > $1`, [timestamp]
  )

  return r
}

const updateEpisodeState = async (episodeUrl: string, podcastUrl: string, position: number, total: number, timestamp?: number) => {

  const r = await getEpisodeState(episodeUrl)

  if (r === undefined) {
    // create a new entry
    await db.execute(
      "INSERT into episodes_history (episode, podcast, position, total, timestamp) VALUES ($1, $2, $3, $4, $5)",
      [episodeUrl, podcastUrl, position, total, timestamp ?? Date.now()],
    );
  } else {
    // update an existent entry

    //check if timestamp is newer, otherwise don't update the row
    if (timestamp !== undefined && timestamp < r.timestamp) return


    await db.execute(
      `UPDATE episodes_history
      SET position = $1, timestamp = $2
      WHERE episode = $3
      `,
      [Math.floor(position), timestamp ?? Date.now(), episodeUrl],
    );
  }
}

// #endregion
// #region MISC

const getSyncKey = async (): Promise<string | undefined> => {
  const r: { value: string }[] = await db.select(
    `SELECT value from misc
      WHERE description = "syncKey"`,
  )
  if (r.length > 0) {
    return r[0].value
  }
}

const setSyncKey = async (key: string) => {
  if (await getSyncKey() === undefined) {
    await db.execute(
      `INSERT into misc (description, value) VALUES ("syncKey", $1)`,
      [key],
    );
  } else {
    await db.execute(
      `UPDATE misc
      SET value = $1
      WHERE description = "syncKey"
      `,
      [key],
    );
  }
}

const getLastSync = async (): Promise<number> => {
  const r: { value: number }[] = await db.select(
    `SELECT value from misc
      WHERE description = "lastSync"`,
  )
  if (r.length > 0) {
    return r[0].value
  } else {
    return 0
  }
}

const setLastSync = async (timestamp: number) => {
  if (await getLastSync() === 0) {
    await db.execute(
      `INSERT into misc (description, value) VALUES ("lastSync", $1)`,
      [timestamp],
    );
  } else {
    await db.execute(
      `UPDATE misc
      SET value = $1
      WHERE description = "lastSync"
      `,
      [timestamp],
    );
  }
}

// #endregion
// #region QUEUE

export type Queue = ReturnType<typeof initQueue>

function initQueue() {
  const [queue, setQueue] = useState<EpisodeData[]>([])

  const render = async() => {
    const rows = await getAll()

    setQueue(rows.map(row => ({
      ...row,
      pubDate: new Date(row.pubDate)
    })

    )
  )
  }

  const orderPositions = async () => {
    // orders elements in queue from 1 to lenght without gaps
    await db.execute(`
              WITH NumberedRows AS (
                    SELECT
                        id,
                        ROW_NUMBER() OVER (ORDER BY queuePosition) AS row_num
                    FROM
                        queue
                )
              UPDATE queue
              SET queuePosition = (
                  SELECT row_num
                  FROM NumberedRows
                  WHERE NumberedRows.id = queue.id
              );`)
  }
  
  const add = async (episode: EpisodeData, order: number = 0) => {
    /*
      order:
        0: first on queue
        -1: last on queue
    */
  
    let queuePosition: number;
  
    const queueLenght: number[] = await db.select(
      "SELECT MAX(queuePosition) FROM queue") // [queueLenght]
  
    if (order < 0) {
  
      queuePosition = queueLenght[0] + 2 - order // -1 is last element, -2...
    } else if (order === 0) {
      queuePosition = 0
    } else {
      queuePosition = order - 0.5 // if this order has already an element this element is inserted before
    }
  
    if (queuePosition < 0 || queuePosition > queueLenght[0] + 1) {
      throw new Error(`Error in queue position, ${queuePosition} is not between ${0} and ${queueLenght[0]}`)
    }
  
    await db.execute(
      "INSERT into queue (queuePosition, title, description, src, pubDate, duration, size, podcastUrl, coverUrl) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [queuePosition, episode.title, episode.description, episode.src, episode.pubDate.getTime(), episode.duration, episode.size, episode.podcastUrl, episode.coverUrl || ''],
    );

    await orderPositions()
    await render()
  }
  
  const get = async (episodeSrc: string): Promise<EpisodeData | undefined> => {
    const r: EpisodeData[] = await db.select(
      "SELECT * from queue WHERE src = $1", [episodeSrc]
    )
    if (r.length > 0) {
      return r[0]
    }
  }
  
  const remove = async (episodeSrc: string): Promise<QueryResult | undefined> => {
    const r = await db.execute(
      "DELETE FROM queue WHERE src = $1",
      [episodeSrc],
    )
    await render()
    return r
  }
  
  const getAll = async (): Promise<EpisodeData[]> => {
    const r: EpisodeData[] = await db.select(
      "SELECT * from queue ORDER BY queuePosition")
  
    return r
  }

  const reorder = async(from: number, to: number) => {
    await db.execute(`
      UPDATE queue
      SET queuePosition = $2
      WHERE queuePosition = $1
      `, [from, to-0.5])

      await orderPositions()
      await render()
    
  }

  const getNext = async(actualSrc: string) => {
    const r: EpisodeData[] = await db.select(
      `SELECT * from queue WHERE queuePosition > (
          SELECT queuePosition FROM queue
          WHERE src = $1
      )`, [actualSrc]
    )

    return r
  }
  return { queue, add, remove, getNext, reorder, get, render }
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
  const [subscriptionsList, setSubscriptionsList] = useState<PodcastData[]>([]);
  const queue = initQueue()


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

    queue.render()

    getSubscriptions().then(r => {
      setSubscriptionsList(r)
    })
  }, [dbLoaded])

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
    },
    misc: {
      getSyncKey,
      setSyncKey,
      getLastSync,
      setLastSync
    },
    queue
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