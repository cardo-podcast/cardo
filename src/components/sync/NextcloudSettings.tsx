import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNextcloud } from '../../sync/Nextcloud'
import { toastError } from '../../utils/utils'
import { useSync } from '../../ContextProviders'


export function NextcloudSettings() {
  const urlRef = useRef<HTMLInputElement>(null)
  const interval = useRef(0)
  const { t } = useTranslation()
  const { loggedIn, setLoggedIn } = useSync()
  const { login } = useNextcloud(loggedIn, setLoggedIn)

  useEffect(() => {
    return () => clearInterval(interval.current)
  }, [])

  return (
    <div className="flex h-full w-full gap-2 p-1">
      <img className="h-24 shrink-0" src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Nextcloud_Logo.svg/141px-Nextcloud_Logo.svg.png" alt="Nextcloud logo" />
      <form
        className="flex w-full flex-col items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (urlRef.current) {
            try {
              interval.current = await login(urlRef.current.value)
            } catch (e) {
              toastError((e as Error).message)
            }
          }
        }}
      >
        <label className="flex w-full flex-col gap-1">
          {t('nextcloud_server_url')}
          <input type="url" className="rounded-md bg-primary-8 px-2 py-1 focus:outline-none" ref={urlRef} placeholder={t('nextcloud_server_url_example')} />
        </label>

        <button className="w-fit rounded-md bg-accent-6 p-1 px-4 uppercase hover:bg-accent-7">{t('connect')}</button>
      </form>
    </div>
  )
}