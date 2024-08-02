import Database from "tauri-plugin-sql-api";
import { path } from "@tauri-apps/api"

let db: Database;

export async function loadDB(){
  const appDataPath = await path.appDataDir();
  const dbPath = await path.join(appDataPath, "db.sqlite");

  db = await Database.load(dbPath);
}

export async function addFavorite(podcastName: string, artistName: string, coverUrl: string, coverUrlLarge: string, feedUrl: string) {
  await db.execute(
      "INSERT into favorites (podcastName, artistName, coverUrl, coverUrlLarge, feedUrl) VALUES ($1, $2, $3, $4, $5)",
      [podcastName, artistName, coverUrl, coverUrlLarge, feedUrl],
    );
}