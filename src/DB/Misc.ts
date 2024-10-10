import { useCallback, useState } from 'react'
import Database from 'tauri-plugin-sql-api'
import { EpisodeData } from '..'

export function useMisc(db: Database) {
  const [loggedInSync, setLoggedInSync] = useState<'nextcloud' | 'gpodder' | false>(false)

  // #region COMMON INTERNAL FUNCTIONS
  const getMiscKey = async (key: string): Promise<string | undefined> => {
    const r: { value: string }[] = await db.select(
      `SELECT value from misc
        WHERE description = $1`,
      [key],
    )
    if (r.length > 0) {
      return r[0].value
    }
  }

  const setMiscValue = async (key: string, value: string) => {
    await db.execute(
      `INSERT into misc (description, value)
      VALUES ($1, $2)
      ON CONFLICT (description) DO UPDATE
      SET value = $2
      WHERE description = $1
      `,
      [key, value],
    )
  }

  // #endregion

  const getSyncKey = useCallback(
    async function (): Promise<string | undefined> {
      return await getMiscKey('syncKey')
    },
    [db],
  )

  const setSyncKey = useCallback(
    async function (key: string) {
      return await setMiscValue('syncKey', key)
    },
    [db],
  )

  const getLastSync = useCallback(
    async function (): Promise<number> {
      return Number((await getMiscKey('lastSync')) ?? '0')
    },
    [db],
  )

  const setLastSync = useCallback(
    async function (timestamp: number) {
      return await setMiscValue('lastSync', timestamp.toString())
    },
    [db],
  )

  const getLastPlayed = useCallback(
    async function (): Promise<EpisodeData | undefined> {
      const r: { value: string }[] = await db.select(
        `SELECT value from misc
        WHERE description = "lastPlaying"`,
      )
      if (r.length > 0) {
        if (r[0].value == 'NONE') {
          return
        }

        const parsedEpisode: EpisodeData = JSON.parse(r[0].value)

        return {
          ...parsedEpisode,
          pubDate: new Date(parsedEpisode.pubDate),
        }
      }
    },
    [db],
  )

  const setLastPlaying = useCallback(
    async function (playingEpisode?: EpisodeData) {
      // empty args to set NONE as last played

      const data = playingEpisode ? JSON.stringify(playingEpisode) : 'NONE'

      return await setMiscValue('lastPlaying', data)
    },
    [db],
  )

  const getLastUpdate = useCallback(
    async function () {
      return Number((await getMiscKey('lastUpdate')) ?? '0')
    },
    [db],
  )

  const setLastUpdate = useCallback(
    async function (timestamp: number) {
      return await setMiscValue('lastUpdate', timestamp.toString())
    },
    [db],
  )

  return { getSyncKey, setSyncKey, getLastSync, setLastSync, getLastPlayed, setLastPlaying, getLastUpdate, setLastUpdate, loggedInSync, setLoggedInSync }
}
