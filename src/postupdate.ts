import { appConfigDir, join } from "@tauri-apps/api/path";
import config from '../src-tauri/tauri.conf.json'
import { exists, readTextFile, writeTextFile } from "@tauri-apps/api/fs";


// migrations in ascending order
const migrations: { [version: string]: () => Promise<void> } = {
  '1.3.0': async function () {
    console.log('Hey you just updated to v1.3.0!')
  }
}


export async function postupdate() {
  const updatesFile = await join(await appConfigDir(), 'updates.json')
  const version = config.package.version

  const appliedUpdates: string[] = await exists(updatesFile) ?
    JSON.parse(await readTextFile(updatesFile)) : []

  if (appliedUpdates.includes(version)) return // this is not the first time this version runs, just open the app

  // check thought all previous versions to apply 
  for (const migration of Object.keys(migrations)) {
    if (!appliedUpdates.includes(migration)) {
      await migrations[migration]()
      appliedUpdates.push(migration)
    }
  }

  if (!appliedUpdates.includes(version)) {
    // append this version to the array even when it didn't apply nothing
    appliedUpdates.push(version)
  }

  await writeTextFile(updatesFile, JSON.stringify(appliedUpdates))

}