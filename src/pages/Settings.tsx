import { useTranslation } from "react-i18next"
import { NextcloudSettings } from "../sync/Nextcloud"
import { Checkbox } from "../components/Inputs"
import { getColor, useSettings } from "../Settings"
import { useEffect, useState } from "react"
import { TailwindBaseColor } from ".."
import { DefaultTheme, DefaultThemes, BasicColors } from "../DefaultThemes"
import appIcon from '../../src-tauri/icons/icon.png'
import { shell } from "@tauri-apps/api"
import { resolveResource } from '@tauri-apps/api/path';
import { readDir } from '@tauri-apps/api/fs';
import tauriConfig from '../../src-tauri/tauri.conf.json'



function AccentColorSelector() {

  const [{ colors: { accent } }, updateSettings] = useSettings()
  const [showSelector, setShowSelector] = useState(false)


  const selectedColor = getColor(accent)
  return (
    <div className="relative">

      <button className={`w-16 h-10 rounded-md border-2 border-${selectedColor[4]}-800 bg-${selectedColor[5]}`}
        onClick={() => setShowSelector(true)}
      />

      {
        showSelector &&
        <div className="grid grid-cols-5 absolute z-10 bg-primary-2 gap-1 rounded-md bottom-0 left-0 p-1 min-w-max">
          {
            BasicColors.map(
              color => (
                <button className={`w-16 h-10 rounded-md bg-${color}-500`}
                  title={color}
                  key={color}
                  onClick={e => {
                    updateSettings({
                      colors: {
                        accent: color
                      }
                    })
                    setShowSelector(false)
                    e.preventDefault()
                  }}
                />
              )
            )
          }
        </div>
      }
    </div>
  )
}


function Settings() {
  const { t } = useTranslation()
  const [{ globals, general, colors: colorSettings, playback, ui }, updateSettings] = useSettings()
  const [languages, setLanguages] = useState<string[]>()

  useEffect(() => {
    const loadLocales = async () => {
      const translationsDir = await resolveResource(`_up_/resources/translations`)
      setLanguages((await readDir(translationsDir)).map(file => file.name?.split('.')[0] ?? ''))
    }

    loadLocales()
  }, [])

  return (
    <div className="p-2 w-full flex flex-col gap-2">
      <div className=" py-4flex flex-col gap-1 border-primary-8 border-[2px] p-2 rounded-md">
        <h1 className="uppercase border-b-2 border-primary-8 mb-2">{t('sync')}</h1>
        <NextcloudSettings />
      </div>

      <div className=" py-4 flex flex-col gap-1 border-primary-8 border-[2px] p-2 rounded-md">
        <h1 className="uppercase border-b-2 border-primary-8 mb-2">{t('general')}</h1>

        <div className="flex flex-col gap-1">

          <label className=" uppercase flex items-center gap-2 mb-1">
            {t('language')}:
            <select className="px-2 py-[1px] text-center bg-primary-8 rounded-md outline-none"
              onChange={({ target: { value } }) => updateSettings({
                globals: {
                  language: value as string
                }
              })
              }
              value={globals.language}
            >
              {
                languages?.map(language => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))
              }

            </select>
          </label>

          <label className="w-fit flex gap-1">
            {t('fetch_subscriptions_startup')}:
            <Checkbox defaultChecked={general.fetchSubscriptionsAtStartup}
              onChange={(value) => updateSettings({ general: { fetchSubscriptionsAtStartup: value } })} />
          </label>

          <label className="w-fit flex gap-1">
            {t('check_updates')}:
            <Checkbox defaultChecked={general.checkUpdates}
              onChange={(value) => updateSettings({ general: { checkUpdates: value } })} />
          </label>

          <label className="w-full flex gap-2 items-center">
            {t('number_days_news')}:
            <input
              type="text"
              className="py-1 px-2 bg-primary-8 rounded-md focus:outline-none w-14"
              value={general.numberOfDaysInNews}
              onChange={e => {
                const value = Number(e.target.value)
                if (!Number.isNaN(value)) {
                  updateSettings({ general: { numberOfDaysInNews: value } })
                }
              }}
            />
          </label>

          <div className="">
            <h2 className="uppercase">{t('theme')}</h2>
            <div className="flex gap-10">
              <label className=" uppercase flex items-center gap-2">
                {t('base')}:
                <select className="px-2 py-[1px] text-center bg-primary-8 rounded-md outline-none"
                  onChange={({ target: { value } }) => updateSettings({
                    colors: {
                      primary: value as TailwindBaseColor | DefaultTheme
                    }
                  })
                  }
                  defaultValue={(colorSettings.primary as string in DefaultThemes
                    || BasicColors.includes(colorSettings.primary as TailwindBaseColor)) ?
                    colorSettings.primary as string : 'CUSTOM'
                  }
                >
                  <option value='dark'>DARK</option>
                  <option value='light'>LIGHT</option>
                  <option value='slate'>SLATE</option>
                </select>
              </label>
              <label className=" uppercase flex items-center gap-2">
                {t('accent')}:
                <AccentColorSelector />
              </label>
            </div>
          </div>

        </div>
      </div>

      <div className=" py-4flex flex-col gap-1 border-primary-8 border-[2px] p-2 rounded-md">
        <h1 className="uppercase border-b-2 border-primary-8 mb-2">{t('playback')}</h1>
        <div className="flex gap-6">
          <label className="w-fit flex gap-2 items-center">
            {t('step_backwards')}:
            <input
              type="text"
              className="py-1 px-2 bg-primary-8 rounded-md focus:outline-none w-12"
              value={playback.stepBackwards}
              onChange={e => {
                const value = Number(e.target.value)
                if (!Number.isNaN(value)) {
                  updateSettings({ playback: { stepBackwards: value } })
                }
              }}
            />
            <p className="-ml-1">s</p>
          </label>
          <label className="w-fit flex gap-2 items-center">
            {t('step_forward')}:
            <input
              type="text"
              className="py-1 px-2 bg-primary-8 rounded-md focus:outline-none w-12"
              value={playback.stepForward}
              onChange={e => {
                const value = Number(e.target.value)
                if (!Number.isNaN(value)) {
                  updateSettings({ playback: { stepForward: value } })
                }
              }}
            />
            <p className="-ml-1">s</p>
          </label>
        </div>
      </div>

      <div className=" py-4flex flex-col gap-1 border-primary-8 border-[2px] p-2 rounded-md">
        <h1 className="uppercase border-b-2 border-primary-8 mb-2">UI</h1>
        <div>
          <label className="w-fit flex gap-1">
            {t('show_pinWindow_button')}:
            <Checkbox defaultChecked={ui.showPinWindowButton}
              onChange={(value) => updateSettings({ ui: { showPinWindowButton: value } })} />
          </label>
        </div>
      </div>

      <div className=" py-4flex flex-col gap-1 border-primary-8 border-[2px] p-2 rounded-md">
        <h1 className="uppercase border-b-2 border-primary-8 mb-2">{t('about')}</h1>
        <div className="flex gap-2">
          <img
            className="w-28"
            src={appIcon}
          />
          <div className="flex flex-col gap-2">
            <h1 className="UPPERCASE">Cardo - {t('podcast_player')} (v{tauriConfig.package.version})</h1>
            <h1>{t('author')}: n0vella</h1>
            <div className="flex gap-1 h-fit items-center">
              <p>{t('source_code')}: </p>
              <img
                className="w-5 bg-white rounded-full p-[1px] cursor-pointer"
                src='https://github.githubassets.com/favicons/favicon.png'
                alt='Github'
                title="https://github.com/n0vella/cardo"
                onClick={() => shell.open("https://github.com/n0vella/cardo")}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default Settings