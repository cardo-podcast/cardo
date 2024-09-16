import { NavLink, useNavigate } from "react-router-dom";
import { useDB } from "../DB/DB";
import { useTranslation } from "react-i18next";
import { sync, home, settings, queue, download } from '../Icons'
import SubscriptionCard from "./SubscriptionCard";
import { useSettings } from "../engines/Settings";
import { useModalBanner } from "./ModalBanner";
import { parseXML } from "../utils/utils";
import { useRef } from "react";
import { useSync } from "../sync/Nextcloud";
import { toast } from "react-toastify";


function NewSubscriptionButton({ mini = false }: { mini?: boolean }) {
  const { t } = useTranslation()
  const [showBanner, Banner] = useModalBanner()
  const inputRef = useRef<HTMLInputElement>(null)
  const {subscriptions, misc: { loggedInSync } } = useDB()
  const navigate = useNavigate()
  const { performSync } = useSync()

  return (
    <>

      <Banner labels={[t('ok'), t('cancel')]}
        onAccepted={async () => {
          if (!inputRef.current) return

          if (!inputRef.current.validity.valid) {
            toast.error(t('please_indicate_url'), {
              position: "top-center",
              autoClose: 3000,
              hideProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "dark",
            });
            
            return 'error'
          }

          const [_episodes, podcast] = await parseXML(inputRef.current.value)
          loggedInSync && performSync({ add: [podcast.feedUrl] })
          subscriptions.add(podcast)
          navigate('/preview', {
              state: {
                podcast
              }
            }
          )

        }}>
          <div className="flex flex-col gap-2 mb-1">
            <h1 className='text-lg border-b-2 border-primary-8 pb-1'>{t('add_subscription_url')}</h1>
            <input
              ref={inputRef}
              type="url"
              placeholder={t('feed_url')}
              autoFocus
              className="bg-primary-8 w-96 rounded-md px-2 py-1 focus:outline-none"
              />
          </div>
        </Banner>

        <div className={`group p-1 rounded-md flex gap-2 transition-all hover:bg-primary-8 ${mini ? 'justify-center' : 'justify-between'}`}
        >
          <button
          onClick={() => showBanner()}
            title={t('add_subscription_url')}
            className={`group-[:not(:hover)]:bg-primary-8 bg-primary-7 hover:bg-accent-7 h-10 aspect-square rounded-md
                flex items-center justify-center`}
          >
            <span className="text-3xl -mt-2">+</span>
          </button>

          {!mini && <p className={`h-10 text-sm w-full cursor-default`}>{t('add_subscription_url')}</p>}
        </div>
      </>
      )
}


      function LeftMenu() {
  const {subscriptions, subscriptionsEpisodes} = useDB()
      const {t} = useTranslation()
      const [{ui: {collapsedLeftMenu} }, updateSettings] = useSettings()


      return (
      <div className="flex">
        {
          collapsedLeftMenu &&

          <div className="bg-primary-9 border-r-2 border-primary-8 w-16 h-full flex flex-col p-0.5 pt-4 overflow-x-hidden">
            <div className="flex flex-col gap-2 uppercase mb-6 font-thin items-center">
              <NavLink to='/' className={({ isActive }) => `w-7 p-0.5 transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5 hover:p-0'}`}
                title={t('home')}
              >
                {home}
              </NavLink>
              <NavLink to='/settings' className={({ isActive }) => `w-7 p-0.5 transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5 hover:p-0'}`}
                title={t('settings')}
              >
                {settings}
              </NavLink>
              <NavLink to='/queue' className={({ isActive }) => `w-7 p-0.5 transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5 hover:p-0'}`}
                title={t('queue')}
              >
                {queue}
              </NavLink>
              <NavLink to='/downloads' className={({ isActive }) => `w-7 p-0.5 transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5 hover:p-0'}`}
                title={t('downloads')}
              >
                {download}
              </NavLink>
            </div>

            <button className={`flex justify-center hover:text-accent-5 mb-1 ${subscriptionsEpisodes.updatingFeeds && 'animate-[spin_1.5s_linear_reverse_infinite]'}`}
              onClick={subscriptionsEpisodes.updateFeeds}
              title={t('update_subs_feeds')}
            >
              <span className="w-6 p-0.5 hover:p-0">{sync}</span>
            </button>

            <div className="flex flex-col gap-1 overflow-y-auto">
              {
                subscriptions.subscriptions.map(subscription => {
                  return (
                    <SubscriptionCard key={subscription.id} podcast={subscription} mini={true} />
                  )
                }
                )
              }
              <NewSubscriptionButton mini={true} />
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
              <button className={`flex items-center hover:text-accent-5 h-full aspect-square p-1 ${subscriptionsEpisodes.updatingFeeds && 'animate-[spin_1.5s_linear_reverse_infinite]'}`}
                onClick={subscriptionsEpisodes.updateFeeds}
                title={t('update_subs_feeds')}
              >
                {sync}
              </button>
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto">
              {
                subscriptions.subscriptions.map(subscription => {
                  return (
                    <SubscriptionCard key={subscription.feedUrl} podcast={subscription} />
                  )
                }
                )
              }
              <NewSubscriptionButton />

            </div>
          </div>
        }

        <div id="folder" className="h-full w-2 -ml-1 opacity-0 hover:opacity-100 cursor-w-resize" onDoubleClick={() => {
          updateSettings({ ui: { collapsedLeftMenu: !collapsedLeftMenu } })
        }}>
          <div className=" h-full w-0.5 bg-accent-8 m-auto" />
        </div>
      </div>
      )
}

      export default LeftMenu;