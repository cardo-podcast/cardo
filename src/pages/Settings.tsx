import { useTranslation } from "react-i18next"
import { NextcloudSettings } from "../sync/Nextcloud"
import { Checkbox } from "../components/Inputs"
import { getColor, useSettings } from "../Settings"
import { useState } from "react"
import { TailwindBaseColor } from ".."
import { DefaultTheme, DefaultThemes, BasicColors } from "../DefaultThemes"



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
  const [{ general, colors: colorSettings }, updateSettings] = useSettings()

  return (
    <div className="p-2 w-full flex flex-col gap-2">
      <div className=" py-4flex flex-col gap-1 border-primary-8 border-[2px] p-2 rounded-md">
        <h1 className="uppercase border-b-2 border-primary-8 mb-2">{t('sync')}</h1>
        <NextcloudSettings />
      </div>

      <div className=" py-4flex flex-col gap-1 border-primary-8 border-[2px] p-2 rounded-md">
        <h1 className="uppercase border-b-2 border-primary-8 mb-2">{t('general')}</h1>
        <div className="flex flex-col gap-2">
          <label className="w-fit flex gap-1">
            {t('fetch_subscriptions_startup')}:
            <Checkbox defaultChecked={general.fetchSubscriptionsAtStartup}
              onChange={(value) => updateSettings({ general: { fetchSubscriptionsAtStartup: value } })} />
          </label>

          <label className="w-full flex gap-1 flex-col">
            {t('number_days_news', { n: general.numberOfDaysInNews })}
            <input
              type="text"
              className="py-1 px-2 bg-primary-8 rounded-md focus:outline-none"
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

    </div>
  )
}

export default Settings