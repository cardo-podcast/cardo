import { useTranslation } from 'react-i18next'
import { checkURLScheme, saveCreds, toastError } from '../../utils/utils'
import { useDB, useSync } from '../../ContextProviders'
import { invoke } from '@tauri-apps/api/core'
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
          const formData = new FormData(e.currentTarget)
          const rawServer = String(formData.get('server') ?? '').trim()
          const server = /^https?:\/\//i.test(rawServer) ? rawServer : `https://${rawServer}`
          const user = String(formData.get('user') ?? '').trim()
          const password = String(formData.get('password') ?? '')

          try {
            if (await login(server, user, password)) {
              /// Encrypt credentials before saving ///
              const parsedServer = new URL(server)
              const normalizedServer = `${parsedServer.origin}${parsedServer.pathname}`.replace(/\/+$/, '')

              // get key from db
              let key = await getSyncKey()

              if (key === undefined) {
                key = await invoke('generate_key')
                if (key)
                  await setSyncKey(key)
              }

              // encrypt user and password with keys and save credentials
              await saveCreds('gpodder', {
                server: normalizedServer,
                loginName: await invoke('encrypt', { text: user, base64Key: key }),
                appPassword: await invoke('encrypt', { text: password, base64Key: key }),
              })

              setLoggedIn('gpodder')
            } else {
              toastError(t('login_failed'))
            }
          } catch (error) {
            toastError((error as Error).message || t('login_failed'))
          }
        }}
      >
        <div className="flex w-11/12 flex-col items-end gap-2">
          <input
            id="server"
            name="server"
            required
            type="url"
            onInput={checkURLScheme}
            className="bg-primary-8 w-full rounded-md px-2 py-1 focus:outline-none"
            placeholder={t('gpodder_server_url')}
          />
          <div className="flex w-3/4 gap-1.5">
            <input
              name="user"
              type="text"
              required
              className="bg-primary-8 w-full rounded-md px-2 py-1 focus:outline-none"
              placeholder={t('username')}
            />
            <input
              name="password"
              type="password"
              required
              className="bg-primary-8 w-full rounded-md px-2 py-1 focus:outline-none"
              placeholder={t('password')}
            />
          </div>
          <button className="filled-button p-1 px-4 uppercase">{t('connect')}</button>
        </div>
      </form>
    </div>
  )
}
