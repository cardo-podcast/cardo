import { useTranslation } from "react-i18next"
import { useSettings } from "../../engines/Settings"
import { removeCreds } from "../../utils/utils"
import { NextcloudSettings } from "./NextcloudSettings"
import { Checkbox } from "../Inputs"
import { useSync } from "../../ContextProviders"



export function SyncSettings() {
  const [{ sync: syncSettings }, updateSettings] = useSettings()
  const { loggedIn, setLoggedIn } = useSync()

  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 p-1">
      {loggedIn && (
        <div className="flex items-center gap-2">
          <img className="h-24 shrink-0" src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Nextcloud_Logo.svg/141px-Nextcloud_Logo.svg.png" alt="Nextcloud logo" /> {/* TODO use proper image for gpodder */}
          <div className="flex flex-col gap-2">
            <p className="text-lg">{t('logged_in')}</p>
            <button
              className="w-fit rounded-md bg-accent-6 p-1 px-4 uppercase hover:bg-accent-7"
              onClick={async () => {
                removeCreds(loggedIn)
                setLoggedIn(null)
              }}
            >
              {t('log_out')}
            </button>
          </div>
        </div>
      )}

      {!loggedIn && <NextcloudSettings />}

      {/* SYNC BEHAVIOUR SETTINGS */}
      <div className="flex flex-col gap-1">
        <h2 className="uppercase">{t('automatic_sync')}</h2>
        <div className="flex gap-3">
          <label className="flex w-fit gap-1">
            {t('when_opening_app')}:
            <Checkbox defaultChecked={syncSettings.syncAfterAppStart} onChange={(value) => updateSettings({ sync: { syncAfterAppStart: value } })} />
          </label>
          <label className="flex w-fit gap-1">
            {t('when_closing_app')}:
            <Checkbox defaultChecked={syncSettings.syncBeforeAppClose} onChange={(value) => updateSettings({ sync: { syncBeforeAppClose: value } })} />
          </label>
        </div>
      </div>
    </div>
  )
}