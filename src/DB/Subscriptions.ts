import Database from '@tauri-apps/plugin-sql'
import { EpisodeData, NewEpisodeData, PodcastData } from '..'
import { useCallback, useEffect, useState } from 'react'
import { getPodcastSettings, useSettings } from '../engines/Settings'
import { DB } from '.'
import { downloadEpisode } from '../utils/utils'

export function useSubscriptions(
  db: Database,
  subscriptionsEpisodes: DB['subscriptionsEpisodes'],
  downloads: DB['downloads'],
  queue: DB['queue'],
) {
  const [subscriptions, setSubscriptions] = useState<PodcastData[]>([])
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

  const loadLatestEpisodes = async () => {
    const minDate = Date.now() - 24 * 3600 * 1000 * numberOfDaysInNews
    let episodes = await subscriptionsEpisodes.loadNew(minDate)

    episodes = episodes.filter(filterByDuration) // discard episodes that don't meet the duration conditions (podcast's setting)
    episodes.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())

    setLatestEpisodes(episodes)

    // download / add to queue new episodes (filtered episodes aren't processed)
    for (const episode of episodes.filter((episode) => episode.new)) {
      if (episode.podcastUrl in podcastSettings) {
        const episodePodcastSettings = getPodcastSettings(episode.podcastUrl, podcastSettings)

        // we are suposing that, as the episodes are new, they can't be either on downloads or queue
        // if that fails then we must wait till both queue and downloads are loaded

        if (episodePodcastSettings.downloadNew) {
          downloadEpisode(episode).then((destination) => downloads.addToDownloadList(episode, destination))
        }

        if (episodePodcastSettings.queueNew) {
          await queue.push(episode)
        }
      }
    }
  }

  useEffect(() => {
    db && loadLatestEpisodes()
  }, [db, numberOfDaysInNews])

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
        [
          podcast.podcastName,
          podcast.artistName,
          podcast.coverUrl,
          podcast.coverUrlLarge,
          podcast.feedUrl,
          podcast.description ?? '',
        ],
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
    loadLatestEpisodes() // TODO: load latest episodes (home) as feeds are updated
  }

  return { subscriptions, add, get, remove, getAll, updateFeeds, latestEpisodes, includes, loadLatestEpisodes }
}
