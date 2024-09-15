import { os } from "@tauri-apps/api"
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react"
import { appConfigDir, join } from "@tauri-apps/api/path"
import { readTextFile, writeTextFile } from "@tauri-apps/api/fs"
import { RecursivePartial, Settings, SortCriterion, TailwindBaseColor, ColorTheme } from ".."
import { SwitchState } from "../components/Inputs"
import { changeLanguage } from "./translations"
import merge from "lodash/merge"
import colors from "tailwindcss/colors"
import { DefaultTheme, DefaultThemes } from "../DefaultThemes"


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

  const updatePodcastSettings = (newPodcastSettings: RecursivePartial<PodcastSettings>) => {
    const newSettings = settings.podcasts

    if (!newSettings[feedUrl]) {
      newSettings[feedUrl] = new PodcastSettings()
    }

    merge(newSettings[feedUrl], newPodcastSettings)

    if (PodcastSettings.isDefault((newSettings[feedUrl]))) {
      // default settings aren't stored on json
      delete newSettings[feedUrl]
    }

    updateSettings({ podcasts: newSettings })
  }


  return [settings.podcasts[feedUrl] ?? new PodcastSettings(), updatePodcastSettings]
}

export function getColor(settingsColor: TailwindBaseColor | ColorTheme | DefaultTheme): ColorTheme {
  // figure if settings come as a tailwind color of a complete defined theme
  if (typeof settingsColor === 'string') {
    if (settingsColor in DefaultThemes) {
      // settings refer to a default theme (that could refer to a default tailwind color)
      return getColor(DefaultThemes[settingsColor])
    } else {
      // settings refer to a tailwind base color.
      return {
        DEFAULT: settingsColor + '-50',
        1: settingsColor + '-100',
        2: settingsColor + '-200',
        3: settingsColor + '-300',
        4: settingsColor + '-400',
        5: settingsColor + '-500',
        6: settingsColor + '-600',
        7: settingsColor + '-700',
        8: settingsColor + '-800',
        9: settingsColor + '-900',
        10: settingsColor + '-950',
      }
    }
  } else {
    // settings define a complete color palette
    return settingsColor as unknown as ColorTheme

  }
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
      checkUpdates: true
    },
    colors: {
      primary: 'dark',
      accent: 'purple'
    },
    playback: {
      stepForward: 30,
      stepBackwards: 10,
      resumeBefore: 5,
      displayRemainingTime: false,
      rateChangeStep: 0.05,
      playbackRate: 1,
      playbackRatePresets: [1, 1.25, 1.50, 2]
    },
    ui: {
      showPinWindowButton: false,
      collapsedLeftMenu: false
    }
  })

  // #region colors
  useEffect(() => {
    loadColor('primary')
  }, [settings.colors.primary])

  useEffect(() => {
    loadColor('accent')
  }, [settings.colors.accent])

  const loadColor = (target: keyof Settings['colors']) => {
    const color = getColor(settings.colors[target])

    const [baseColor, tonality] = (color.DEFAULT as string).split('-')
    document.documentElement.style.setProperty(`--color-${target}`, (colors as any)[baseColor][tonality])

    for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const [baseColor, tonality] = color[i as keyof ColorTheme].split('-')
      document.documentElement.style.setProperty(`--color-${target}-${i}`, (colors as any)[baseColor][tonality])
    }
  }
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

