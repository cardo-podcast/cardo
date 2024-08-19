import { os } from "@tauri-apps/api"
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react"
import { appConfigDir, join } from "@tauri-apps/api/path"
import { readTextFile, writeTextFile } from "@tauri-apps/api/fs"
import { RecursivePartial, Settings, SortCriterion, TailwindColors } from "."
import { SwitchState } from "./components/Inputs"
import { changeLanguage } from "./translations"
import merge from "lodash/merge"
import colors from "tailwindcss/colors"


export class FilterCriterion {
  played: SwitchState

  constructor() {
    this.played = SwitchState.None
  }
}

export class PodcastSettings {
  filter: FilterCriterion
  sort: SortCriterion

  constructor() {
    this.filter = new FilterCriterion()
    this.sort = { criterion: 'date', mode: 'desc' }
  }

  public static isDefault = (settings: PodcastSettings) => {

    return JSON.stringify(settings) == JSON.stringify(new PodcastSettings())
  }
}


const SettingsContext = createContext<[Settings, (newSettings: RecursivePartial<Settings>) => void] | undefined>(undefined)


export function useSettings(): [Settings, (newSettings: RecursivePartial<Settings>) => void] {
  return useContext(SettingsContext) as [Settings, (newSettings: any) => void]
}


export function usePodcastSettings(feedUrl: string): [PodcastSettings, typeof updatePodcastSettings] {
  const [settings, updateSettings] = useSettings()
  const readSettings = () => {
    return settings.podcasts[feedUrl] ?? new PodcastSettings()
  }


  const [podcastSettings, setPodcastSettingsState] = useState(readSettings())

  useEffect(() => {
    setPodcastSettingsState(readSettings())
  }, [settings, feedUrl])


  const updatePodcastSettings = (newPodcastSettings: RecursivePartial<PodcastSettings>) => {
    const newSettings = { ...settings }

    if (!newSettings.podcasts[feedUrl]) {
      newSettings.podcasts[feedUrl] = new PodcastSettings()
    }

    merge(newSettings.podcasts[feedUrl], newPodcastSettings)

    if (PodcastSettings.isDefault((newSettings.podcasts[feedUrl]))) {
      // default settings aren't stored
      delete newSettings.podcasts[feedUrl]
    }

    updateSettings({ podcasts: newSettings.podcasts })
  }


  return [podcastSettings, updatePodcastSettings]
}


export function SettingsProvider({ children }: { children: ReactNode }) {
  let settingsFile = useRef('');

  const [settings, setSettings] = useState<Settings>({
    globals: { locale: 'en-US', language: 'en' },
    podcasts: {},
    sync: {
      syncAfterAppStart: false,
      syncBeforeAppClose: false
    },
    general: {
      numberOfDaysInNews: 15,
      fetchSubscriptionsAtStartup: true,
      colors: {
        primary: 'neutral',
        accent: 'red'
      }
    }
  })

  // #region Load Colors

  const loadColor = (color: 'primary' | 'accent', twColor: TailwindColors) => {

    for (const tonality of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
      document.documentElement.style.setProperty(`--color-${color}-${tonality}`, (colors as any)[twColor][tonality])
    }
  }

  useEffect(() => {
    loadColor('primary', settings.general.colors.primary)
  }, [settings.general.colors.primary])

  useEffect(() => {
    loadColor('accent', settings.general.colors.accent)
  }, [settings.general.colors.accent])

  // #endregion

  useEffect(() => {
    changeLanguage(settings.globals.language)
  }, [settings.globals.language])

  const [loaded, setLoaded] = useState(false)

  const updateSettings = (newSettings: RecursivePartial<Settings>) => {
    let settingsClone = { ...settings }
    merge(settingsClone, newSettings)

    setSettings(settingsClone)
  }

  useEffect(() => {
    if (!loaded) return

    writeSettingsFile(settings) // update jsonwriteSettingsFile(newSettings) // update json
  }, [settings, loaded])

  const readSettingsFromFile = async (): Promise<Settings | undefined> => {
    try {
      return JSON.parse(await readTextFile(settingsFile.current))
    } catch {
      return undefined
    }
  }

  const writeSettingsFile = async (newSettings: Settings) => {
    if (!settingsFile.current) return

    writeTextFile(settingsFile.current, JSON.stringify(newSettings, null, 2))
  }

  const setOSInfo = async () => {
    const locale: string = await os.locale() || 'en-US'

    settings.globals.locale = locale
    settings.globals.language = locale.split('-')[0]

    updateSettings(settings)
  }

  const init = async () => {
    // store settings file path
    const settingsDir = await appConfigDir()
    settingsFile.current = await join(settingsDir, 'config.json')

    // read settings from file
    const settingsFromFile = await readSettingsFromFile()
    if (settingsFromFile && settingsFromFile.globals) {
      updateSettings(settingsFromFile)
    } else {
      // first load write os info (locale)
      await setOSInfo()
    }

    setLoaded(true)
  }

  useEffect(() => {
    init()
  }, [])

  return (
    <SettingsContext.Provider value={[settings, updateSettings]}>
      {children}
    </SettingsContext.Provider>
  )

}

