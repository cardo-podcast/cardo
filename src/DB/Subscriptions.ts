import Database from 'tauri-plugin-sql-api'
import { PodcastData } from '..'
import { useCallback, useEffect, useState } from 'react'
import { useSettings } from '../engines/Settings'
import { DB } from '.'

export function useSubscriptions(db: Database, subcriptionEpisodes: DB['subscriptionsEpisodes']) {
  const [subscriptions, setSubscriptions] = useState<PodcastData[]>([])
  const [updateFeedsCount, setUpdateFeedsCount] = useState(0) // variable used to refresh app after all feeds are fetched (db isn't reactive)


  const [
    {
      general: { fetchSubscriptionsAtStartup },
    },
  ] = useSettings()

  useEffect(() => {
    if (!db) return

    fetchSubscriptionsAtStartup && updateFeeds()

    getAll().then((r) => {
      setSubscriptions(r)
    })
  }, [db])

  const add = useCallback(
    async function add(podcast: PodcastData) {
      setSubscriptions((prev) => [...prev, podcast])

      // subscription_episodes are download and saved on DB also
      const episodes = await subcriptionEpisodes.fetchFeed(podcast)
      await subcriptionEpisodes.save(episodes)

      // returns subscription id on database
      const r = await db.execute(
        `INSERT into subscriptions (podcastName, artistName, coverUrl, coverUrlLarge, feedUrl, description)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [podcast.podcastName, podcast.artistName, podcast.coverUrl, podcast.coverUrlLarge, podcast.feedUrl, podcast.description ?? ''],
      )

      return r.lastInsertId
    },
    [db],
  )

  const get = useCallback(
    async function get(feedUrl: string) {
      const r: PodcastData[] = await db.select('SELECT * from subscriptions WHERE feedUrl = $1', [feedUrl])
      if (r.length > 0) {
        return r[0]
      }
    },
    [db],
  )

  const remove = useCallback(
    async function remove(feedUrl: string) {
      await subcriptionEpisodes.remove(feedUrl)
      setSubscriptions((prev) => prev.filter((podcast) => podcast.feedUrl !== feedUrl))
      return await db.execute('DELETE FROM subscriptions WHERE feedUrl = $1', [feedUrl])
    },
    [db],
  )

  const getAll = useCallback(
    async function getAll() {
      const r: PodcastData[] = await db.select('SELECT * from subscriptions')

      return r
    },
    [db],
  )

  async function updateFeeds() {
    // fetch all subscriptions at once
    const subsEpisodes = await Promise.all(subscriptions.map((subscription) => subcriptionEpisodes.fetchFeed(subscription)))

    // save after all feeds are downloaded, db operations are executed on a single thread
    await subcriptionEpisodes.save(subsEpisodes.flat())
    setUpdateFeedsCount(prev => prev + 1)
  }

  return { subscriptions, add, get, remove, getAll, updateFeeds, updateFeedsCount }
}
