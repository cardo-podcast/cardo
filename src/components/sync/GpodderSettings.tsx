import { useTranslation } from 'react-i18next'
import { saveCreds, toastError } from '../../utils/utils'
import { useSync } from '../../ContextProviders'
import { useDB } from '../../DB/DB'
import { invoke } from '@tauri-apps/api'
import { login } from '../../sync/Gpodder'

export function GpodderSettings() {
  const { t } = useTranslation()
  const { setLoggedIn } = useSync()
  const {
    misc: { getSyncKey, setSyncKey },
  } = useDB()

  return (
    <div className="flex h-full w-full gap-2 p-1">
      <img className="w-32 shrink-0 p-1" src="https://gpodder.net/static/gpoddernet_228.png" alt="Gpodder logo" />
      <form
        className="flex w-full flex-col items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault()

          const [server, user, password] = e.currentTarget.elements as unknown as HTMLInputElement[]

          if (await login(server.value, user.value, password.value)) {
            /// Encrypt credentials before saving ///

            // get key from db
            let key = await getSyncKey()

            if (key === undefined) {
              const key: string = await invoke('generate_key')
              setSyncKey(key)
            }

            // encrypt user and password with keys and save credentials
            saveCreds('gpodder', {
              server: new URL(server.value).origin,
              loginName: await invoke('encrypt', { text: user.value, base64Key: key }),
              appPassword: await invoke('encrypt', { text: password.value, base64Key: key }),
            })

            setLoggedIn('gpodder')
          } else {
            toastError(t('login_failed'))
          }
        }}
      >
        <div className="flex w-11/12 flex-col items-end gap-2">
          <input id="server" type="url" className="w-full rounded-md bg-primary-8 px-2 py-1 focus:outline-none" placeholder={t('gpodder_server_url')} />
          <div className="flex w-3/4 gap-1.5">
            <input type="text" className="w-full rounded-md bg-primary-8 px-2 py-1 focus:outline-none" placeholder={t('username')} />
            <input type="password" className="w-full rounded-md bg-primary-8 px-2 py-1 focus:outline-none" placeholder={t('password')} />
          </div>
          <button className="w-fit rounded-md bg-accent-6 p-1 px-4 uppercase hover:bg-accent-7">{t('connect')}</button>
        </div>
      </form>
    </div>
  )
}
