import Database, { QueryResult } from "tauri-plugin-sql-api";
import { path } from "@tauri-apps/api"
import { PodcastData } from ".";

let db: Database;

export async function loadDB(){
  const appDataPath = await path.appDataDir();
  const dbPath = await path.join(appDataPath, "db.sqlite");

  db = await Database.load(dbPath);
}

export async function addFavoritePodcast(podcast: PodcastData) {
  await db.execute(
      "INSERT into favorite_podcasts (podcastName, artistName, coverUrl, coverUrlLarge, feedUrl) VALUES ($1, $2, $3, $4, $5)",
      [podcast.podcastName, podcast.artistName, podcast.coverUrl, podcast.coverUrlLarge, podcast.feedUrl],
    );
}

export async function getFavoritePodcast(feedUrl: string): Promise<PodcastData | undefined> {
  const r: PodcastData[] = await db.select(
    "SELECT * from favorite_podcasts WHERE feedUrl = $1", [feedUrl]
  )

  if (r.length > 0){
    return r[0]
  }
}

export async function getFavoritePodcasts(): Promise<PodcastData[]> {
  const r: PodcastData[] = await db.select(
    "SELECT * from favorite_podcasts")
  
    return r
}

export async function removeFavoritePodcast(feedUrl: string): Promise<QueryResult | undefined> {
  const fav = await getFavoritePodcast(feedUrl)

  if (fav === undefined) return
  
  return await db.execute(
    "DELETE FROM favorite_podcasts WHERE feedUrl = $1",
    [feedUrl],
  );

}