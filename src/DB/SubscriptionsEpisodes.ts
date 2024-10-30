import { useCallback, useState } from 'react'
import Database from 'tauri-plugin-sql-api'
import { EpisodeData, NewEpisodeData, PodcastData, RawEpisodeData } from '..'
import { parseXML, toastError } from '../utils/utils'

export function useSubscriptionsEpisodes(db: Database) {
  const [fetchingFeeds, setFetchingFeeds] = useState<number[]>([]) //id of the feed that it's been downloaded

  async function fetchFeed(subscription: PodcastData) {
    setFetchingFeeds((prev) => [...prev, subscription.id!])
    try {
      const [episodes] = await parseXML(subscription.feedUrl)
      setFetchingFeeds((prev) => prev.filter((id) => id !== subscription.id!))
      return episodes
    } catch (e) {
      toastError(`Error updating feed ${subscription.feedUrl}: ${e}`)
      setFetchingFeeds((prev) => prev.filter((id) => id !== subscription.id!))
      return []
    }
  }

  const save = useCallback(
    async function (episodes: EpisodeData[]) {
      const sortedEpisodes = [...episodes]

      sortedEpisodes.sort((a, b) => a.pubDate.getTime() - b.pubDate.getTime())

      // group queries in chunks, avoiding exceed limits and incrementing speed
      const queryGroups: EpisodeData[][] = []
      for (let i = 0; i < sortedEpisodes.length; i += 999) {
        queryGroups.push(sortedEpisodes.slice(i, i + 999))
      }

      for (const group of queryGroups) {
        const placeholders = group.map((_, i) => `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`).join(', ')

        const values = group.flatMap((episode) => [episode.title, episode.description, episode.src, episode.pubDate.getTime(), episode.duration, episode.size, episode.podcastUrl, episode.coverUrl || ''])

        const query = `
        INSERT INTO subscriptions_episodes (title, description, src, pubDate, duration, size, podcastUrl, coverUrl) 
        VALUES ${placeholders} 
        ON CONFLICT (src) DO NOTHING`

        await db.execute(query, values)
      }
    },
    [db],
  )

  const remove = useCallback(
    async function (podcastUrl: string) {
      await db.execute('DELETE FROM subscriptions_episodes WHERE podcastUrl = $1', [podcastUrl])
    },
    [db],
  )

  const getAll = useCallback(
    async function (options: { pubdate_gt?: number; podcastUrl?: string; searchTerm?: string }): Promise<EpisodeData[]> {
      let query = 'SELECT * FROM subscriptions_episodes WHERE pubDate > $1'

      if (options.podcastUrl) {
        query += ' AND podcastUrl = $2'
      }

      if (options.searchTerm) {
        query += ` AND (lower(title) LIKE "%${options.searchTerm.toLowerCase()}%"
                      OR lower(description) LIKE "%${options.searchTerm.toLocaleLowerCase()}%")`
      }

      const r: EpisodeData[] = await db.select(query, [options.pubdate_gt ?? 0, options.podcastUrl])

      return r.map((episode) => ({
        ...episode,
        pubDate: new Date(episode.pubDate),
      }))
    },
    [db],
  )

  const loadNew = useCallback(
    async function (pubdate_gt: number): Promise<NewEpisodeData[]> {
      // get all uncompleted episodes since a pubDate

      // get last feed dowload sync to highlight the new fetched episodes
      const r: { value: number }[] = await db.select(
        `SELECT value from misc
        WHERE description = "lastFeedDownload"`,
      )

      const lastSync = r[0]?.value ?? 0

      // set current time as last
      db.execute(
        `
        INSERT into misc (description, value)
        VALUES ('lastFeedDownload', $1)
        ON CONFLICT (description) DO UPDATE
        SET value = $1
        WHERE description = 'lastFeedDownload'
      `,
        [Date.now()],
      )

      // get all episodes of the database, filter by pubdate
      const r2: RawEpisodeData[] = await db.select(
        `
      SELECT subscriptions_episodes.*,
            subscriptions.coverUrl AS podcastCover,
            subscriptions.podcastName
            FROM subscriptions_episodes
      LEFT JOIN episodes_history ON subscriptions_episodes.src = episodes_history.episode
      LEFT JOIN subscriptions ON subscriptions_episodes.podcastUrl = subscriptions.feedUrl
      WHERE pubDate > $1
      AND (episodes_history.position IS NULL
      OR episodes_history.position < episodes_history.total)
      `,
        [pubdate_gt],
      )

      return r2.map((episode) => ({
        ...episode,
        pubDate: new Date(episode.pubDate),
        new: episode.pubDate > lastSync, // is new if it's just discovered
        podcast: { coverUrl: episode.podcastCover, podcastName: episode.podcastName },
      }))
    },
    [db],
  )

  return { save, getAll, remove, loadNew, fetchingFeeds, fetchFeed }
}
