import { os } from "@tauri-apps/api"
import { createContext, ReactNode, useContext, useEffect, useState } from "react"



interface Settings {
  globals: {
    locale: string
  }
}

const DefaultSettings = {
  globals: {
    locale: 'en-US'
  }
}

const SettingsContext = createContext<Settings | undefined>(undefined)

export function useSettings(): Settings {
  return useContext(SettingsContext) as Settings
}


export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DefaultSettings)

  const setOSInfo = async() => {
    const locale: string = await os.locale() || 'en-US'
    setSettings({...settings, globals: {...settings.globals, locale: locale}})
  }

  useEffect(()=>{
    setOSInfo()
  })
  
  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  )

}

