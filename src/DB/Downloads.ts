import { useCallback, useEffect, useState } from "react"
import { EpisodeData } from ".."
import Database from "tauri-plugin-sql-api"



// #region DOWNLOADS
type DownloadedEpisode = EpisodeData & { localFile: string }

export function useDownloads(db: Database) {
  const [downloads, setDownloads] = useState<DownloadedEpisode[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!db) return

    load()
  }, [db])

  const indexOf = useCallback(function(episodeSrc: string){
    return downloads.findIndex(episode => episode.src == episodeSrc)
  }, [downloads])

  const includes = useCallback(function(episodeSrc: string){
    const index = indexOf(episodeSrc)
    if (index > -1) {
      return downloads[index]
    }
  }, [indexOf])

  const load = async function(){
    const downloadedEpisodes = await getDownloadedEpisodes()
    setDownloads(downloadedEpisodes)
    setLoaded(true)
  }

  const getDownloadedEpisodes = useCallback(async function(){
    const r: (DownloadedEpisode & { podcastCover: string })[] = await db.select(
      `SELECT downloads.*, subscriptions.coverUrl AS podcastCover from downloads
        left join subscriptions_episodes ON subscriptions_episodes.src = downloads.src
        LEFT JOIN subscriptions ON subscriptions_episodes.podcastUrl = subscriptions.feedUrl`)


    return r.map(episode => ({
      ...episode,
      pubDate: new Date(episode.pubDate),
      podcast: { coverUrl: episode.podcastCover }
    }))
  }, [db])

  const getLocalFile = useCallback(async function(episodeUrl: string){
    const r: DownloadedEpisode[] = await db.select(
      "SELECT * from downloads WHERE src = $1", [episodeUrl]
    )

    return r.length > 0 ? r[0].localFile : undefined
  }, [db])

  const addToDownloadList = useCallback(async function(episode: EpisodeData, localFile: string){
    setDownloads(prev => [...prev, { ...episode, localFile }])

    await db.execute(
      `INSERT into downloads (title, description, src, pubDate, duration, size, podcastUrl, coverUrl, localFile) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (src) DO NOTHING`,
      [episode.title, episode.description, episode.src, episode.pubDate, episode.duration, episode.size, episode.podcastUrl, episode.coverUrl, localFile],
    );
  }, [db])

  const removeFromDownloadList = useCallback(async function(episodeSrc: string){
    setDownloads(prev => prev.filter(episode => episode.src != episodeSrc))

    return await db.execute(
      "DELETE FROM downloads WHERE src = $1",
      [episodeSrc],
    )
  }, [db])

  const batchRemoveFromDownloadList = useCallback(async function(episodesSrc: string[]){
    if (!episodesSrc.length) return

    setDownloads(prev => prev.filter(episode => !episodesSrc.includes(episode.src)))

    // delete from db
    const placeholders = episodesSrc.map((_, i) => '$' + (i + 1)).join(',');

    await db.execute(
      `DELETE FROM downloads WHERE src IN (${placeholders})`,
      [...episodesSrc],
    )
  }, [db])

  return {
    downloads,
    loaded,
    includes,
    indexOf,
    getDownloadedEpisodes,
    addToDownloadList,
    getLocalFile,
    removeFromDownloadList,
    batchRemoveFromDownloadList
  }
}
