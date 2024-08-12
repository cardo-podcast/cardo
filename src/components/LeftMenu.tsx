import { Link, useNavigate } from "react-router-dom";
import { useDB } from "../DB";
import { useTranslation } from "react-i18next";

function LeftMenu() {
  const { subscriptions } = useDB()
  const navigate = useNavigate()
  const { t } = useTranslation();

  return (
    <div className="bg-zinc-900 border-r-2 border-zinc-800 mr-1 w-56 h-full flex flex-col p-3 pt-4">
      <div className="flex flex-col gap-1 uppercase mb-6">
        <Link to='/'>
          {t('home')}
        </Link>
        <Link to='/settings'>
          {t('settings')}
        </Link>
        <Link to='/queue'>
          {t('queue')}
        </Link>
      </div>

      <h1 className="uppercase mb-2">{t('subscriptions')}</h1>
      <div className="flex flex-col gap-1 overflow-y-auto">
        {
          subscriptions.subscriptions.map((fav, i) => {
            return (
              <div key={i} className="p-1 rounded-md flex gap-2 justify-between cursor-pointer hover:bg-zinc-500"
                onClick={() => navigate('/preview', {
                  state: {
                    podcast: fav
                  }
                })}
              >
                <img
                  className="h-10 bg-zinc-700 aspect-square rounded-md"
                  src={fav.coverUrl}
                  alt=''
                />
                <p className=" h-10 text-sm w-full truncate">{fav.podcastName}</p>
              </div>
            )
          }
          )
        }
      </div>
    </div>
  )
}

export default LeftMenu;