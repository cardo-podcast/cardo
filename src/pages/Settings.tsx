import { NextcloudSettings } from "../sync/Nextcloud"



function Settings() {

  return(
    <div className="p-2 w-full flex flex-col gap-2">
      <h1>SYNC</h1>
      <div className=" bg-zinc-500 py-4 px-2 rounded-md flex flex-col gap-1">
        <p>NEXTCLOUD GPODDER</p>
        <NextcloudSettings/>
      </div>
    </div>
  )
}

export default Settings