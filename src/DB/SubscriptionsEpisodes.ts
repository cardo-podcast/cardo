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
        const placeholders = group
          .map(
            (_, i) =>
              `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`,
          )
          .join(', ')

        const values = group.flatMap((episode) => [
          episode.title,
          episode.description,
          episode.src,
          episode.pubDate.getTime(),
          episode.duration,
          episode.size,
          episode.podcastUrl,
          episode.coverUrl || '',
        ])

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
    async function (options: {
      pubdate_gt?: number
      podcastUrl?: string
      searchTerm?: string
    }): Promise<EpisodeData[]> {
      let query = `SELECT
        se.*
      FROM
        subscriptions_episodes se
      LEFT JOIN
        subscriptions ON subscriptions.feedUrl = se.podcastUrl
      WHERE
        se.pubDate > $1`

      if (options.podcastUrl) {
        query += ' AND podcastUrl = $2'
      }

      if (options.searchTerm) {
        query += ` AND (lower(se.title) LIKE "%${options.searchTerm.toLowerCase()}%"
                      OR lower(se.description) LIKE "%${options.searchTerm.toLocaleLowerCase()}%")`
      }

      const r: (EpisodeData & { coverUrl: string })[] = await db.select(query, [
        options.pubdate_gt ?? 0,
        options.podcastUrl,
      ])

      console.log(r)

      return r.map((episode) => ({
        ...episode,
        podcast: { feedUrl: episode.podcastUrl, coverUrl: episode.coverUrl },
        pubDate: new Date(episode.pubDate),
      }))
    },
    [db],
  )

  const loadNew = useCallback(
    async function (pubdate_gt: number): Promise<NewEpisodeData[]> {
      // get all uncompleted episodes since a pubDate

      // get all episodes of the database, filter by pubdate
      const r2: RawEpisodeData[] = await db.select(
        `
      WITH episodes_with_count AS ( -- subquery not constrained by pubdate
        SELECT
          se.*,
          ROW_NUMBER() OVER (
          PARTITION BY se.podcastUrl 
          ORDER BY se.pubDate ASC
            ) AS countCurrent -- incremental count thought episodes of same podcast
        FROM subscriptions_episodes se
      )
      SELECT
            ec.*,
            s.coverUrl AS podcastCover,
            s.podcastName,
            s.episode_count AS count
      FROM
        episodes_with_count ec
      LEFT JOIN
        episodes_history eh ON ec.src = eh.episode
      LEFT JOIN
        subscriptions s ON ec.podcastUrl = s.feedUrl
      WHERE
        pubDate > $1
        AND (eh.position IS NULL OR eh.position < eh.total)
      `,
        [pubdate_gt],
      )

      // update episode count after checking which episodes are new
      await db.execute(`
        UPDATE subscriptions
        SET episode_count = (
          SELECT COUNT(se.src)
          FROM subscriptions_episodes se
          WHERE se.podcastUrl = subscriptions.feedUrl
        );
      `)

      return r2.map((episode) => {
        return {
          ...episode,
          pubDate: new Date(episode.pubDate),
          new: episode.count > 0 && episode.countCurrent > episode.count, // is new if it's just discovered
          podcast: { coverUrl: episode.podcastCover, podcastName: episode.podcastName, feedUrl: episode.podcastUrl },
        }
      })
    },
    [db],
  )

  return { save, getAll, remove, loadNew, fetchingFeeds, fetchFeed }
}
