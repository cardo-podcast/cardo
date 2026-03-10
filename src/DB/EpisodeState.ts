import { useCallback, useEffect, useState } from 'react'
import Database from '@tauri-apps/plugin-sql'
import { EpisodeState } from '..'

export function useEpisodeStateStore(db: Database) {
  const [cache, setCache] = useState<Map<string, EpisodeState>>(new Map())

  const get = useCallback(
    async function (episodeUrl: string): Promise<EpisodeState | undefined> {
      const r: EpisodeState[] = await db.select('SELECT * from episodes_history WHERE episode = $1', [episodeUrl])
      if (r.length > 0) {
        return r[0]
      }
    },
    [db],
  )

  const getCompleted = useCallback(
    async function (podcastUrl?: string) {
      const query = `SELECT episode from episodes_history
      WHERE position = total
      ${podcastUrl ? 'AND podcast = $1' : ''}
      `

      const playedEpisodes: { episode: string }[] = await db.select(query, [podcastUrl])

      return playedEpisodes.map((episode) => episode.episode) //only returns url
    },
    [db],
  )

  const getSync = useCallback(
    (episodeUrl: string) => cache.get(episodeUrl),
    [cache],
  )

  const getAll = useCallback(
    async function (timestamp = 0): Promise<EpisodeState[]> {
      const r: EpisodeState[] = await db.select(`SELECT * from episodes_history WHERE timestamp > $1`, [timestamp])

      return r
    },
    [db],
  )

  const update = useCallback(
    async function (episodeUrl: string, podcastUrl: string, position: number, total: number, timestamp?: number) {
      position = Math.floor(position)
      total = Math.floor(total)

      const ts = timestamp ?? Date.now()
      const pos = Math.min(position, total)
      const tot = Math.max(position, total)

      setCache(prev => {
        const next = new Map(prev)
        next.set(episodeUrl, {
          episode: episodeUrl,
          podcast: podcastUrl,
          position: pos,
          total: tot,
          timestamp: ts,
        })
        return next
      })

      await db.execute(
        `INSERT into episodes_history (episode, podcast, position, total, timestamp)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (episode) DO UPDATE
        SET position = $3, total = $4, timestamp = $5
        WHERE episode = $1 AND timestamp < $5 AND position <> $3`,
        [episodeUrl, podcastUrl, pos, tot, ts],
      )
    },
    [db],
  )

  useEffect(() => {
    getAll().then(states => {
      const map = new Map<string, EpisodeState>()
      for (const s of states) map.set(s.episode, s)
      setCache(map)
    })
  }, [getAll])

  return { get, getSync, getCompleted, getAll, update }
}
