import Database from "tauri-plugin-sql-api";
import { PodcastData } from "..";
import { useCallback, useEffect, useState } from "react";


export function useSubscriptions(db: Database) {
  const [subscriptions, setSubscriptions] = useState<PodcastData[]>([])

  useEffect(() => {
    if (!db) return

    getAll().then(r => {
      setSubscriptions(r)
    })
  }, [db])


  const add = useCallback(async function add(podcast: PodcastData){
    setSubscriptions(prev => [...prev, podcast])
    // returns subscription id on database
    const r = await db.execute(
      `INSERT into subscriptions (podcastName, artistName, coverUrl, coverUrlLarge, feedUrl, description)
        VALUES ($1, $2, $3, $4, $5, $6)`,
      [podcast.podcastName, podcast.artistName, podcast.coverUrl, podcast.coverUrlLarge, podcast.feedUrl, podcast.description ?? ''],
    );
  
    return r.lastInsertId
  }, [db])

  const get = useCallback(async function get(feedUrl: string){
    const r: PodcastData[] = await db.select(
      "SELECT * from subscriptions WHERE feedUrl = $1", [feedUrl]
    )
    if (r.length > 0) {
      return r[0]
    }
  }, [db])

  const remove = useCallback(async function remove(feedUrl: string){
    setSubscriptions(prev => prev.filter(podcast => podcast.feedUrl != feedUrl))
    return await db.execute(
      "DELETE FROM subscriptions WHERE feedUrl = $1",
      [feedUrl],
    )
  }, [db])

  const getAll = useCallback(async function getAll(){
    const r: PodcastData[] = await db.select(
      "SELECT * from subscriptions")
  
    return r
  }, [db])

  return {subscriptions, add, get, remove, getAll}
}
