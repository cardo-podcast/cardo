import Database from 'tauri-plugin-sql-api'
import { EpisodeData, NewEpisodeData, PodcastData } from '..'
import { useCallback, useEffect, useState } from 'react'
import { getPodcastSettings, useSettings } from '../engines/Settings'
import { DB } from '.'

export function useSubscriptions(db: Database, subscriptionsEpisodes: DB['subscriptionsEpisodes']) {
  const [subscriptions, setSubscriptions] = useState<PodcastData[]>([])
  const [updateFeedsCount, setUpdateFeedsCount] = useState(0) // variable used to refresh app after all feeds are fetched (db isn't reactive)
  const [latestEpisodes, setLatestEpisodes] = useState<NewEpisodeData[]>([])
  const [
    {
      general: { numberOfDaysInNews, fetchSubscriptionsAtStartup },
      podcasts: podcastSettings,
    },
  ] = useSettings()

  const indexOf = useCallback(
    function (feedUrl: string) {
      return subscriptions.findIndex((subscription) => subscription.feedUrl === feedUrl)
    },
    [subscriptions],
  )

  const includes = useCallback(
    function (feedUrl: string) {
      const index = indexOf(feedUrl)
      if (index > -1) {
        return subscriptions[index]
      }
    },
    [indexOf],
  )

  const loadLatestEpisodes = async () => {
    const minDate = Date.now() - 24 * 3600 * 1000 * numberOfDaysInNews
    const episodes = await subscriptionsEpisodes.loadNew(minDate)

    episodes.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())

    // filter by duration
    function filterByDuration(episode: EpisodeData) {
      let result = true
      if (episode.podcastUrl in podcastSettings) {
        const episodePodcastSettings = getPodcastSettings(episode.podcastUrl, podcastSettings)

        if (episodePodcastSettings.filter.duration.min > 0) {
          result = result && episode.duration >= episodePodcastSettings.filter.duration.min
        }

        if (episodePodcastSettings.filter.duration.max > 0) {
          result = result && episode.duration <= episodePodcastSettings.filter.duration.max
        }
      }
      return result
    }

    setLatestEpisodes(episodes.filter(filterByDuration))
  }

  useEffect(() => {
    // extract episodes newer than setting
    db && loadLatestEpisodes()
  }, [numberOfDaysInNews, subscriptions, updateFeedsCount])

  useEffect(() => {
    if (!db) return

    getAll().then((dbSubscriptions) => {
      setSubscriptions(dbSubscriptions)
      fetchSubscriptionsAtStartup && updateFeeds(dbSubscriptions)
    })
  }, [db])

  const add = useCallback(
    async function add(podcast: PodcastData) {
      // returns subscription id on database
      const r = await db.execute(
        `INSERT into subscriptions (podcastName, artistName, coverUrl, coverUrlLarge, feedUrl, description)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [podcast.podcastName, podcast.artistName, podcast.coverUrl, podcast.coverUrlLarge, podcast.feedUrl, podcast.description ?? ''],
      )

      podcast = { ...podcast, id: r.lastInsertId } // podcast id comes from database
      setSubscriptions((prev) => [...prev, podcast])

      // subscription_episodes are download and saved on DB also
      const episodes = await subscriptionsEpisodes.fetchFeed(podcast)
      await subscriptionsEpisodes.save(episodes)
      loadLatestEpisodes() // update latest episodes (home page)

      return podcast.id
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
      await subscriptionsEpisodes.remove(feedUrl)
      loadLatestEpisodes() // update latest episodes (home page)

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

  async function updateFeeds(feeds = subscriptions) {
    // fetch all subscriptions at once
    const subsEpisodes = await Promise.all(feeds.map((subscription) => subscriptionsEpisodes.fetchFeed(subscription)))

    // save after all feeds are downloaded, db operations are executed on a single thread
    await subscriptionsEpisodes.save(subsEpisodes.flat())
    setUpdateFeedsCount((prev) => prev + 1)
  }

  return { subscriptions, add, get, remove, getAll, updateFeeds, latestEpisodes, includes }
}
