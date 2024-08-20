import { Link, useNavigate } from "react-router-dom";
import { useDB } from "../DB";
import { useTranslation } from "react-i18next";
import * as icons from '../Icons'


function LeftMenu() {
  const { subscriptions, subscriptionsEpisodes: {updateSubscriptionsFeed, updatingFeeds} } = useDB()
  const navigate = useNavigate()
  const { t } = useTranslation();

  return (
    <div className="bg-primary-9 border-r-2 border-primary-8 w-56 h-full flex flex-col p-3 pt-4">
      <div className="flex flex-col gap-1 uppercase mb-6">
        <Link to='/' className="hover:text-accent-5 hover:pl-1">
          {t('home')}
        </Link>
        <Link to='/settings' className="hover:text-accent-5 hover:pl-1">
          {t('settings')}
        </Link>
        <Link to='/queue' className="hover:text-accent-5 hover:pl-1">
          {t('queue')}
        </Link>
      </div>

      <div className="flex items-center gap-1 mb-2">
        <h1 className="uppercase">{t('subscriptions')}</h1>
        <button className={`flex items-center hover:text-accent-5 h-full aspect-square p-1 ${updatingFeeds && 'animate-[spin_1.5s_linear_reverse_infinite]'}`}
        onClick={updateSubscriptionsFeed}
        title={t('update_subs_feeds')}
        >
          {icons.sync}
        </button>
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto">
        {
          subscriptions.subscriptions.map((fav, i) => {
            return (
              <div key={i} className="p-1 rounded-md flex gap-2 justify-between cursor-pointer hover:bg-primary-8 hover:pl-2"
                onClick={() => navigate('/preview', {
                  state: {
                    podcast: fav
                  }
                })}
              >
                <img
                  className="h-10 bg-primary-7 aspect-square rounded-md"
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