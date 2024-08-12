import { useTranslation } from "react-i18next"
import { NextcloudSettings } from "../sync/Nextcloud"



function Settings() {
  const {t} = useTranslation()

  return(
    <div className="p-2 w-full flex flex-col gap-2">
      <div className=" py-4flex flex-col gap-1 border-zinc-700 border-2 p-2 rounded-md">
      <h1 className="uppercase border-b-2 border-zinc-700 mb-2">{t('sync')}</h1>
        <p className="pb-2">NEXTCLOUD GPODDER</p>
        <NextcloudSettings/>
      </div>
    </div>
  )
}

export default Settings