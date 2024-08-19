import { useTranslation } from "react-i18next"
import { NextcloudSettings } from "../sync/Nextcloud"
import { Checkbox } from "../components/Inputs"
import { useSettings } from "../Settings"
import { useEffect, useState } from "react"
import { TailwindColor, TailwindColors } from ".."
import { Settings as SettingsItf } from ".."


type ColorTarget = keyof SettingsItf['general']['colors']
type Tonality = keyof TailwindColor

function ColorSelector({ target, tonality }: { target: ColorTarget, tonality: Tonality }) {

  const [{ general: { colors: colorSettings } }, updateSettings] = useSettings()
  const [showSelector, setShowSelector] = useState(false)
  const [colors, setColors] = useState<TailwindColors[]>(['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'])

  useEffect(() => {
    // move color to head
    const newColors = [...colors]
    const index = colors.indexOf(colorSettings[target])
    const selectedColor = newColors.splice(index, 1, colors[0])[0];
    newColors.splice(0, 1, selectedColor)
    setColors(newColors)
  }, [colorSettings[target]])


  return (
    <div className="relative">

      <button className={`w-16 h-10 rounded-md border-2 border-${colorSettings[target]}-800 bg-${colorSettings[target]}-${tonality}`}
        title={colorSettings[target]}
        onClick={() => setShowSelector(true)}
        />

      {
        showSelector &&
        <div className="grid grid-cols-5 absolute z-10 bg-primary-200 gap-1 rounded-md bottom-0 left-0 p-1 min-w-max">
          {
            colors.map(
              color => (
                <button className={`w-16 h-10 rounded-md bg-${color}-${tonality}`}
                  title={color}
                  key={color}
                  onClick={e => {
                    updateSettings({
                      general: {
                        colors: {
                          [target]: color
                        }
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
  const [{ general }, updateSettings] = useSettings()

  return (
    <div className="p-2 w-full flex flex-col gap-2">
      <div className=" py-4flex flex-col gap-1 border-primary-800 border-[2px] p-2 rounded-md">
        <h1 className="uppercase border-b-2 border-primary-800 mb-2">{t('sync')}</h1>
        <NextcloudSettings />
      </div>

      <div className=" py-4flex flex-col gap-1 border-primary-800 border-[2px] p-2 rounded-md">
        <h1 className="uppercase border-b-2 border-primary-800 mb-2">{t('general')}</h1>
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
              className="py-1 px-2 bg-primary-800 placeholder-primary-500 text-primary-400 rounded-md focus:outline-none"
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
            <div className="flex gap-2">
              <label className=" uppercase flex items-center gap-2">
                {t('primary')}:
                <ColorSelector target="primary" tonality={800} />
              </label>
              <label className=" uppercase flex items-center gap-2">
                {t('accent')}:
                <ColorSelector target="accent" tonality={500} />
              </label>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default Settings