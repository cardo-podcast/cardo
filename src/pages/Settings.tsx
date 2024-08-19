import { useTranslation } from "react-i18next"
import { NextcloudSettings } from "../sync/Nextcloud"
import { Checkbox } from "../components/Inputs"
import { useSettings } from "../Settings"



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
        <div>
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
                if (!Number.isNaN(value)){
                  updateSettings({general: {numberOfDaysInNews: value}})
                }
              }}
            />
          </label>
        </div>
      </div>

    </div>
  )
}

export default Settings