import { useCallback } from "react"
import Database from "tauri-plugin-sql-api"
import { EpisodeState } from ".."



export function useEpisodeState(db: Database){

  const get = useCallback(async function(episodeUrl: string): Promise<EpisodeState | undefined>{
    const r: EpisodeState[] = await db.select(
      "SELECT * from episodes_history WHERE episode = $1", [episodeUrl]
    )
    if (r.length > 0) {
      return r[0]
    }
  }, [db])

  const getCompleted = useCallback(async function(podcastUrl?: string){

    const query = `SELECT episode from episodes_history
      WHERE position = total
      ${podcastUrl ? 'AND podcast = $1' : ''}
      `
  
    const playedEpisodes: {episode: string}[] = await db.select(query, [podcastUrl])
  
    return playedEpisodes.map(episode => episode.episode) //only returns url
  }, [db])

  const getAll = useCallback(async function(timestamp = 0): Promise<EpisodeState[]>{
    const r: EpisodeState[] = await db.select(
      `SELECT * from episodes_history WHERE timestamp > $1`, [timestamp]
    )
  
    return r
  }, [db])


  const update = useCallback(async function(episodeUrl: string, podcastUrl: string, position: number, total: number, timestamp?: number){

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
  
  }, [db])


  return {get, getCompleted, getAll, update}
}
