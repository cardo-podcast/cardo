import { NavLink, useNavigate } from "react-router-dom";
import { useDB } from "../DB/DB";
import { useTranslation } from "react-i18next";
import { sync, home, settings, queue, download } from '../Icons'
import SubscriptionCard from "./SubscriptionCard";
import { useSettings } from "../engines/Settings";
import { useModalBanner } from "./ModalBanner";
import { parsePodcastDetails, toastError } from "../utils/utils";
import { useRef } from "react";
import { useSync } from "../sync/Nextcloud";


function NewSubscriptionButton({ mini = false }: { mini?: boolean }) {
  const { t } = useTranslation()
  const [showBanner, Banner] = useModalBanner()
  const inputRef = useRef<HTMLInputElement>(null)
  const { subscriptions, misc: { loggedInSync } } = useDB()
  const navigate = useNavigate()
  const { performSync } = useSync()

  return (
    <>

      <Banner labels={[t('ok'), t('cancel')]}
        onAccepted={async () => {
          if (!inputRef.current) return

          if (!inputRef.current.validity.valid) {
            toastError(t('please_indicate_url'))
            return 'error'
          }


          const podcast = await parsePodcastDetails(inputRef.current.value)
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
  const { subscriptions, subscriptionsEpisodes } = useDB()
  const { t } = useTranslation()
  const [{ ui: { collapsedLeftMenu } }, updateSettings] = useSettings()


  return (
    <div className="flex relative">
      <div className={`bg-primary-9 border-r border-primary-8 h-full flex flex-col pt-4 overflow-x-hidden
              ${collapsedLeftMenu ? 'w-16 p-0.5' : 'w-64 lg:w-80 p-3'}
              `}>
        <div className={`flex flex-col uppercase mb-6 font-light  ${collapsedLeftMenu ? 'items-center gap-2' : 'gap-1'}`}>
          <NavLink to='/' className={({ isActive }) => `flex transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5 hover:pl-1'}`}
            title={t('home')}
          >
            {collapsedLeftMenu ? <span className="w-6">{home}</span> : t('home')}
          </NavLink>
          <NavLink to='/settings' className={({ isActive }) => `flex transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5 hover:pl-1'}`}
            title={t('settings')}
          >
            {collapsedLeftMenu ? <span className="w-6">{settings}</span> : t('settings')}
          </NavLink>
          <NavLink to='/queue' className={({ isActive }) => `flex transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5 hover:pl-1'}`}
            title={t('queue')}
          >
            {collapsedLeftMenu ? <span className="w-6">{queue}</span> : t('queue')}
          </NavLink>
          <NavLink to='/downloads' className={({ isActive }) => `flex transition-all ${isActive ? 'text-primary-4 cursor-default' : 'hover:text-accent-5 hover:pl-1'}`}
            title={t('downloads')}
          >
            {collapsedLeftMenu ? <span className="w-6">{download}</span> : t('downloads')}
          </NavLink>
        </div>

        <div className={`flex items-center gap-2 mb-1 ${collapsedLeftMenu && 'justify-center'}`}>
          {!collapsedLeftMenu && <h1 className="uppercase mb-0.5">{t('subscriptions')}</h1>}
          <button className={`flex justify-center hover:text-accent-5 ${subscriptionsEpisodes.updatingFeeds && 'animate-[spin_1.5s_linear_reverse_infinite]'}`}
            onClick={subscriptionsEpisodes.updateFeeds}
            title={t('update_subs_feeds')}
          >
            <span className={`${collapsedLeftMenu? 'w-6': 'w-5'}`}>{sync}</span>
          </button>
        </div>

        <div className="flex flex-col gap-1 overflow-y-auto scroll-smooth">
          {
            subscriptions.subscriptions.map(subscription => {
              return (
                <SubscriptionCard key={subscription.id} podcast={subscription} mini={collapsedLeftMenu} />
              )
            }
            )
          }
          <NewSubscriptionButton mini={collapsedLeftMenu} />
        </div>
      </div>


      {/* FOLD MENU TOGGLE ON BORDER */}
      <div id="folder" className="absolute right-0 translate-x-1/2 h-full my-auto w-2 px-[3px] hover:bg-accent-8 cursor-w-resize bg-clip-content transition-colors" onDoubleClick={() => {
        updateSettings({ ui: { collapsedLeftMenu: !collapsedLeftMenu } })
      }}/>
    </div>
  )
}

export default LeftMenu;