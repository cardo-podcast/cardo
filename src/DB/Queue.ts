import { useCallback, useEffect, useState } from 'react'
import Database from 'tauri-plugin-sql-api'
import { EpisodeData, RawEpisodeData } from '..'

export function useQueue(db: Database) {
  const [queue, setQueue] = useState<EpisodeData[]>([]) // list of queue sqlite id's

  useEffect(() => {
    if (!db) return

    load()
  }, [db])

  useEffect(() => {
    if (queue.length > 0) {
      updateOrder(queue.map((episode) => episode.id))
    }
  }, [queue])

  // #region INTERNAL

  const getAll = async (): Promise<EpisodeData[]> => {
    const r: RawEpisodeData[] = await db.select(
      `SELECT queue.*,
            subscriptions.coverUrl AS podcastCover,
            subscriptions.podcastName
            FROM queue
        LEFT JOIN subscriptions ON queue.podcastUrl = subscriptions.feedUrl
      `,
    )

    return r.map((episode) => ({
      ...episode,
      pubDate: new Date(episode.pubDate),
      podcast: { coverUrl: episode.podcastCover, podcastName: episode.podcastName },
    }))
  }

  async function load() {
    // load queue from sqlite db
    const loadedQueue = await getAll()
    const order = await readOrder()

    loadedQueue.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))

    setQueue(loadedQueue)
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

  const insertOnDb = async (episode: EpisodeData): Promise<number | undefined> => {
    // returns id in sql table if item is appended

    const query = await db.execute(
      `INSERT into queue (title, description, src, pubDate, duration, size, podcastUrl, coverUrl)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (src) DO NOTHING 
      `,
      [episode.title, episode.description, episode.src, episode.pubDate.getTime(), episode.duration, episode.size, episode.podcastUrl, episode.coverUrl || ''],
    )

    return query.lastInsertId
  }

  const indexOf = (episodeSrc: string) => {
    return queue.findIndex((episode) => episode.src == episodeSrc)
  }

  // #endregion

  const unshift = useCallback(
    async function (episode: EpisodeData) {
      if (includes(episode.src)) return

      const id = await insertOnDb(episode)

      if (id !== undefined) {
        // episode appended to queue
        setQueue((prev) => [{ ...episode, id: id }, ...prev])
      }
    },
    [insertOnDb],
  )

  const push = useCallback(
    async function (episode: EpisodeData) {
      if (includes(episode.src)) return

      const id = await insertOnDb(episode)

      if (id !== undefined) {
        // episode appended to queue
        setQueue((prev) => [...prev, { ...episode, id: id }])
      }
    },
    [db],
  )

  const includes = useCallback(
    function (episodeSrc: string) {
      return indexOf(episodeSrc) > -1
    },
    [indexOf],
  )

  const next = useCallback(
    function (episode: EpisodeData) {
      const nextIndex = queue.findIndex((ep) => ep.id == episode.id) + 1
      return queue[nextIndex]
    },
    [queue],
  )

  const remove = useCallback(
    async function (episodeSrc: string) {
      // delete from queue
      setQueue((prev) => prev.filter((episode) => episode.src != episodeSrc))

      await db.execute('DELETE FROM queue WHERE src = $1', [episodeSrc])
    },
    [db],
  )

  const batchRemove = useCallback(
    async function (episodesSrc: string[]) {
      // delete from queue

      if (!episodesSrc.length) return

      setQueue((prev) => prev.filter((episode) => !episodesSrc.includes(episode.src)))

      // delete from db
      const placeholders = episodesSrc.map((_, i) => '$' + (i + 1)).join(',')

      await db.execute(`DELETE FROM queue WHERE src IN (${placeholders})`, [...episodesSrc])
    },
    [db],
  )

  const move = useCallback(
    function (from: number, to: number) {
      const newQueue = [...queue]
      const fromElement = newQueue.splice(from, 1)

      newQueue.splice(to, 0, fromElement[0])

      setQueue(newQueue)
    },
    [queue],
  )

  return { queue, unshift, push, next, remove, batchRemove, move, includes }
}
