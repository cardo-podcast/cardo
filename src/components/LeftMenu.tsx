import { NavLink } from "react-router-dom";
import { useDB } from "../engines/DB";
import { useTranslation } from "react-i18next";
import { sync, home, settings, queue, download } from '../Icons'
import SubscriptionCard from "./SubscriptionCard";
import { useSettings } from "../engines/Settings";


function LeftMenu() {
  const { subscriptions, subscriptionsEpisodes: { updateSubscriptionsFeed, updatingFeeds } } = useDB()
  const { t } = useTranslation()
  const [{ui: {collapsedLeftMenu}}, updateSettings] = useSettings()


  return (
    <div className="flex">
      {
        collapsedLeftMenu &&

        <div className="bg-primary-9 border-r-2 border-primary-8 w-16 lg:w-80 h-full flex flex-col p-0.5 pt-4 overflow-x-hidden">
          <div className="flex flex-col gap-2 uppercase mb-6 font-thin items-center">
            <NavLink to='/' className={({ isActive }) => `w-6 transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5 '}`}
            title={t('home')}
            >
              {home}
            </NavLink>
            <NavLink to='/settings' className={({ isActive }) => `w-6 transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5'}`}
            title={t('settings')}
            >
              {settings}
            </NavLink>
            <NavLink to='/queue' className={({ isActive }) => `w-6 transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5'}`}
            title={t('queue')}
            >
              {queue}
            </NavLink>
            <NavLink to='/downloads' className={({ isActive }) => `w-6 transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5'}`}
            title={t('downloads')}
            >
              {download}
            </NavLink>
          </div>

          <button className={`flex justify-center hover:text-accent-5 p-1 ${updatingFeeds && 'animate-[spin_1.5s_linear_reverse_infinite]'}`}
              onClick={updateSubscriptionsFeed}
              title={t('update_subs_feeds')}
            >
              <span className="w-5">{sync}</span>
           </button>

          <div className="flex flex-col gap-1 overflow-y-auto">
            {
              subscriptions.subscriptions.map(subscription => {
                return (
                  <SubscriptionCard key={subscription.id} podcast={subscription} mini={true}/>
                )
              }
              )
            }
          </div>
        </div>
      }

      {
        !collapsedLeftMenu &&

        <div className="bg-primary-9 border-r-2 border-primary-8 w-64 lg:w-80 h-full flex flex-col p-3 pt-4 overflow-x-hidden">
          <div className="flex flex-col gap-1 uppercase mb-6 font-thin">
            <NavLink to='/' className={({ isActive }) => `transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5 hover:pl-1'}`}>
              {t('home')}
            </NavLink>
            <NavLink to='/settings' className={({ isActive }) => `transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5 hover:pl-1'}`}>
              {t('settings')}
            </NavLink>
            <NavLink to='/queue' className={({ isActive }) => `transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5 hover:pl-1'}`}>
              {t('queue')}
            </NavLink>
            <NavLink to='/downloads' className={({ isActive }) => `transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5 hover:pl-1'}`}>
              {t('downloads')}
            </NavLink>
          </div>

          <div className="flex items-center gap-1 mb-2">
            <h1 className="uppercase">{t('subscriptions')}</h1>
            <button className={`flex items-center hover:text-accent-5 h-full aspect-square p-1 ${updatingFeeds && 'animate-[spin_1.5s_linear_reverse_infinite]'}`}
              onClick={updateSubscriptionsFeed}
              title={t('update_subs_feeds')}
            >
              {sync}
            </button>
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto">
            {
              subscriptions.subscriptions.map(subscription => {
                return (
                  <SubscriptionCard key={subscription.id} podcast={subscription} />
                )
              }
              )
            }
          </div>
        </div>
      }

      <div id="folder" className="h-full w-1 -ml-0.5 hover:bg-accent-6 cursor-w-resize" onDoubleClick={() => {
        updateSettings({ui: {collapsedLeftMenu: !collapsedLeftMenu}})
      }} />
    </div>
  )
}

export default LeftMenu;