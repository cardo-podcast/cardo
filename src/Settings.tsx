import { os } from "@tauri-apps/api"
import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useRef, useState } from "react"
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

  public static isDefault = (settings: PodcastSettings) => {
    return JSON.stringify(settings) == JSON.stringify(new PodcastSettings())
  }
}


const SettingsContext = createContext<[Settings, (newSettings: any) => void] | undefined>(undefined)

export function useSettings(): [Settings, (newSettings: any) => void] {
  return useContext(SettingsContext) as [Settings, (newSettings: any) => void]
}


export function usePodcastSettings(feedUrl: string): [PodcastSettings, typeof updatePodcastSettings]{
  const [settings, updateSettings] = useSettings()
  const readSettings = () => {
    return settings.podcasts[feedUrl] ?? new PodcastSettings()
  }

  const [podcastSettings, setPodcastSettingsState] = useState(readSettings())

  useEffect(() => {
    setPodcastSettingsState(readSettings())
  }, [settings])


  const updatePodcastSettings = (newPodcastSettings: any) => {
    const newSettings = {...settings}

    if (PodcastSettings.isDefault(newPodcastSettings)){
      // default settings aren't stored
      delete newSettings.podcasts[feedUrl]
    }else{
      newSettings.podcasts[feedUrl] = podcastSettings
    }

    updateSettings({podcasts: newSettings.podcasts})
  }

  
  return [podcastSettings, updatePodcastSettings]
}


export function SettingsProvider({ children }: { children: ReactNode }) {
  let settingsFile = useRef('');

  const [settings, setSettings] = useState<Settings>({
    globals: {locale: 'en-US'},
    podcasts: {}
  })
  
  const [loaded, setLoaded] = useState(false)

  const updateSettings = (newSettings: any) => {
    setSettings({...settings, ...newSettings})
  }

  useEffect(() => {
    if (!loaded) return

    writeSettingsFile(settings) // update jsonwriteSettingsFile(newSettings) // update json
  }, [settings, loaded])

  const readSettingsFromFile = async(): Promise<Settings | undefined> => {
    try {
      return JSON.parse(await readTextFile(settingsFile.current))
    } catch {
      return undefined
    }
  }

  const writeSettingsFile = async(newSettings : Settings) => {
    if (!settingsFile.current) return

    writeTextFile(settingsFile.current, JSON.stringify(newSettings, null, 2))
  }

  const setOSInfo = async() => {
    const locale: string = await os.locale() || 'en-US'
    updateSettings({globals: {...settings.globals, locale: locale}})
  }

  const init = async() => {
    // store settings file path
    const settingsDir = await appConfigDir()
    settingsFile.current = await join(settingsDir, 'config.json')

    // read settings from file
    const settingsFromFile = await readSettingsFromFile()
    if (settingsFromFile && settingsFromFile.globals){
      updateSettings(settingsFromFile)
    } else {
      // first load write os info (locale)
      await setOSInfo()
    }

    setLoaded(true)
  }

  useEffect(()=>{
    init()
  }, [])
  
  return (
    <SettingsContext.Provider value={[settings, updateSettings]}>
      {children}
    </SettingsContext.Provider>
  )

}

