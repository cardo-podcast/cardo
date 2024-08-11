import { os } from "@tauri-apps/api"
import { createContext, ReactNode, useContext, useEffect, useState } from "react"
import { appConfigDir, join } from "@tauri-apps/api/path"
import { exists, readTextFile, writeTextFile } from "@tauri-apps/api/fs"
import { Settings } from "."
import { SwitchState } from "./components/Inputs"


export class FilterCriterion {
  played: SwitchState

  constructor() {
    this.played = SwitchState.None
  }
}

export class PodcastSettings {
  filter: FilterCriterion

  constructor() {
    this.filter = new FilterCriterion()
  }

  isDefault = () => {
    return JSON.stringify(this) == JSON.stringify(new PodcastSettings())
  }
}


const SettingsContext = createContext<Settings | undefined>(undefined)

export function useSettings(): Settings {
  return useContext(SettingsContext) as Settings
}


export function SettingsProvider({ children }: { children: ReactNode }) {
  let settingsFile: string;

  const readSettingsFromFile = async(): Promise<Settings> => {
    if (!await exists(settingsFile)) {
      return settings // just leave deffault settings
    }

    return JSON.parse(await readTextFile(settingsFile))
  }

  const writeSettingsFile = async(newSettings : Settings) => {
    writeTextFile(settingsFile, JSON.stringify(newSettings))
  }

  const updateSettings = (newSettings : Settings) => {
    setSettings(newSettings) // trigger rendering
    writeSettingsFile(newSettings) // update json
  }

  const getPodcastSettings = (feedUrl: string) => {
    return settings.podcasts[feedUrl] ?? new PodcastSettings()
  }

  const setPodcastSettings = (feedUrl: string, podcastSettings: PodcastSettings) => {
    const newSettings = {...settings}

    if (podcastSettings.isDefault()){
      // default settings aren't stored
      delete newSettings.podcasts[feedUrl]
    }else{
      newSettings.podcasts[feedUrl] = podcastSettings
    }

    updateSettings(newSettings)
  }


  const [settings, setSettings] = useState<Settings>({
    globals: {locale: 'en-US'},
    podcasts: {},
    getPodcastSettings: getPodcastSettings,
    setPodcastSettings: setPodcastSettings
  })

  const setOSInfo = async() => {
    const locale: string = await os.locale() || 'en-US'
    updateSettings({...settings, globals: {...settings.globals, locale: locale}})
  }

  const init = async() => {
    // store settings file path
    const settingsDir = await appConfigDir()
    settingsFile = await join(settingsDir, 'config.json')

    // reload os info
    await setOSInfo()

    // read settings from file
    await updateSettings(await readSettingsFromFile())
  }

  useEffect(()=>{
    init()
  }, [])
  
  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  )

}

