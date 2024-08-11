import { Link, useNavigate } from "react-router-dom";
import { useDB } from "../DB";
import { useTranslation } from "react-i18next";

function LeftMenu() {
  const { subscriptions } = useDB()
  const navigate = useNavigate()
  const { t } = useTranslation();

  return (
    <div className="bg-zinc-800 w-56 h-full flex flex-col rounded-md p-2 gap-6">
      <div className="flex flex-col gap-1 uppercase">
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

      <div className="flex flex-col gap-1 overflow-y-auto">
        {
          subscriptions.subscriptions.map((fav, i) => {
            return (
              <div key={i} className="bg-zinc-600 p-1 rounded-md flex gap-2 justify-between cursor-pointer hover:bg-zinc-500"
                onClick={() => navigate('/preview', {
                  state: {
                    podcast: fav
                  }
                })}
              >
                <img
                  className="bg-zinc-700 h-10 aspect-square rounded-md"
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