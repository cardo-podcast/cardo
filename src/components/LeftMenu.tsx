import { Link, useNavigate } from "react-router-dom";
import { useDB } from "../DB";
import { useTranslation } from "react-i18next";
import * as icons from '../Icons'

function LeftMenu() {
  const { subscriptions, subscriptionsEpisodes: {updateSubscriptionsFeed, updatingFeeds} } = useDB()
  const navigate = useNavigate()
  const { t } = useTranslation();

  return (
    <div className="bg-zinc-900 border-r-2 border-zinc-800 w-56 h-full flex flex-col p-3 pt-4">
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

      <div className="flex items-center gap-2 mb-2">
        <h1 className="uppercase">{t('subscriptions')}</h1>
        <button className={`flex justify-center w-[16px] ${updatingFeeds && 'animate-[spin_1.5s_linear_infinite]'}`}
        onClick={updateSubscriptionsFeed}
        title={t('update_subs_feeds')}
        >
          {icons.reload}
        </button>
      </div>
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