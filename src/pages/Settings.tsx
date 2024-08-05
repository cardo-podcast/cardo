import { NextcloudSettings } from "../sync/Nextcloud"



function Settings() {

  return(
    <div className="p-2 w-full flex flex-col">
      <h1>SYNC</h1>
      <h2>NEXTCLOUD GPODDER</h2>
      <NextcloudSettings/>
    </div>
  )
}

export default Settings