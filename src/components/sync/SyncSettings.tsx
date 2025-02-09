import { useTranslation } from 'react-i18next'
import { useSettings } from '../../engines/Settings'
import { removeCreds } from '../../utils/utils'
import { NextcloudSettings } from './NextcloudSettings'
import { Checkbox } from '../Inputs'
import { useSync } from '../../ContextProviders'
import { GpodderSettings } from './GpodderSettings'

export function SyncSettings() {
  const [{ sync: syncSettings }, updateSettings] = useSettings()
  const { loggedIn, setLoggedIn } = useSync()

  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 p-1">
      {loggedIn && (
        <div className="flex items-center gap-2">
          {loggedIn === 'nextcloud' && (
            <img
              className="w-32 shrink-0"
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Nextcloud_Logo.svg/141px-Nextcloud_Logo.svg.png"
              alt="Nextcloud logo"
            />
          )}
          {loggedIn === 'gpodder' && (
            <img className="w-32 shrink-0" src="https://gpodder.net/static/gpoddernet_228.png" alt="Gpodder logo" />
          )}

          <div className="flex flex-col gap-2">
            <p className="text-lg">{t('logged_in')}</p>
            <button
              className="filled-button uppercase"
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

      {!loggedIn && (
        <div className="flex flex-col gap-3">
          <NextcloudSettings />
          <div className="border-t-2 border-primary-8" />
          <GpodderSettings />
        </div>
      )}

      {loggedIn && (
        <>
          <div className="border-t-2 border-primary-8" />
          {/* SYNC BEHAVIOUR SETTINGS */}
          <div className="flex flex-col gap-1">
            <h2 className="uppercase">{t('automatic_sync')}</h2>
            <div className="flex gap-3">
              <label className="flex w-fit gap-1">
                {t('when_opening_app')}:
                <Checkbox
                  defaultChecked={syncSettings.syncAfterAppStart}
                  onChange={(value) => updateSettings({ sync: { syncAfterAppStart: value } })}
                />
              </label>
              <label className="flex w-fit gap-1">
                {t('when_closing_app')}:
                <Checkbox
                  defaultChecked={syncSettings.syncBeforeAppClose}
                  onChange={(value) => updateSettings({ sync: { syncBeforeAppClose: value } })}
                />
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
