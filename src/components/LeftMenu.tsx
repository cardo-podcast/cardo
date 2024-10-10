import { NavLink, useNavigate } from 'react-router-dom'
import { useDB } from '../DB/DB'
import { useTranslation } from 'react-i18next'
import { sync, home, settings, queue, download } from '../Icons'
import SubscriptionCard from './SubscriptionCard'
import { useSettings } from '../engines/Settings'
import { useModalBanner } from './ModalBanner'
import { parsePodcastDetails, toastError } from '../utils/utils'
import { useRef } from 'react'
import { useSync } from '../sync/Sync'

function NewSubscriptionButton({ mini = false }: { mini?: boolean }) {
  const { t } = useTranslation()
  const [showBanner, Banner] = useModalBanner()
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    subscriptions,
    misc: { loggedInSync },
  } = useDB()
  const navigate = useNavigate()
  const { performSync } = useSync()

  return (
    <>
      <Banner
        labels={[t('ok'), t('cancel')]}
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
              podcast,
            },
          })
        }}
      >
        <div className="mb-1 flex flex-col gap-2">
          <h1 className="border-b-2 border-primary-8 pb-1 text-lg">{t('add_subscription_url')}</h1>
          <input ref={inputRef} type="url" placeholder={t('feed_url')} autoFocus className="w-96 rounded-md bg-primary-8 px-2 py-1 focus:outline-none" />
        </div>
      </Banner>

      <div className={`group flex gap-2 rounded-md p-1 transition-all hover:bg-primary-8 ${mini ? 'justify-center' : 'justify-between'}`}>
        <button onClick={() => showBanner()} title={t('add_subscription_url')} className={`flex aspect-square h-10 items-center justify-center rounded-md bg-primary-7 hover:bg-accent-7 group-[:not(:hover)]:bg-primary-8`}>
          <span className="-mt-2 text-3xl">+</span>
        </button>

        {!mini && <p className={`h-10 w-full cursor-default text-sm`}>{t('add_subscription_url')}</p>}
      </div>
    </>
  )
}

function LeftMenu() {
  const { subscriptions, subscriptionsEpisodes } = useDB()
  const { t } = useTranslation()
  const [
    {
      ui: { collapsedLeftMenu },
    },
    updateSettings,
  ] = useSettings()

  return (
    <div className="relative flex">
      <div className={`flex h-full flex-col overflow-x-hidden border-r border-primary-8 bg-primary-9 pt-4 ${collapsedLeftMenu ? 'w-16 p-0.5' : 'w-64 p-3 lg:w-80'} `}>
        <div className={`mb-6 flex flex-col font-light uppercase ${collapsedLeftMenu ? 'items-center gap-2' : 'gap-1'}`}>
          <NavLink to="/" className={({ isActive }) => `flex transition-all ${isActive ? 'cursor-default text-primary-4' : 'hover:pl-1 hover:text-accent-5'}`} title={t('home')}>
            {collapsedLeftMenu ? <span className="w-6">{home}</span> : t('home')}
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `flex transition-all ${isActive ? 'cursor-default text-primary-4' : 'hover:pl-1 hover:text-accent-5'}`} title={t('settings')}>
            {collapsedLeftMenu ? <span className="w-6">{settings}</span> : t('settings')}
          </NavLink>
          <NavLink to="/queue" className={({ isActive }) => `flex transition-all ${isActive ? 'cursor-default text-primary-4' : 'hover:pl-1 hover:text-accent-5'}`} title={t('queue')}>
            {collapsedLeftMenu ? <span className="w-6">{queue}</span> : t('queue')}
          </NavLink>
          <NavLink to="/downloads" className={({ isActive }) => `flex transition-all ${isActive ? 'cursor-default text-primary-4' : 'hover:pl-1 hover:text-accent-5'}`} title={t('downloads')}>
            {collapsedLeftMenu ? <span className="w-6">{download}</span> : t('downloads')}
          </NavLink>
        </div>

        <div className={`mb-1 flex items-center gap-2 ${collapsedLeftMenu && 'justify-center'}`}>
          {!collapsedLeftMenu && <h1 className="mb-0.5 uppercase">{t('subscriptions')}</h1>}
          <button className={`flex justify-center hover:text-accent-5 ${subscriptionsEpisodes.updatingFeeds && 'animate-[spin_1.5s_linear_reverse_infinite]'}`} onClick={subscriptionsEpisodes.updateFeeds} title={t('update_subs_feeds')}>
            <span className={`${collapsedLeftMenu ? 'w-6' : 'w-5'}`}>{sync}</span>
          </button>
        </div>

        <div className="flex flex-col gap-1 overflow-y-auto scroll-smooth">
          {subscriptions.subscriptions.map((subscription) => {
            return <SubscriptionCard key={subscription.id} podcast={subscription} mini={collapsedLeftMenu} />
          })}
          <NewSubscriptionButton mini={collapsedLeftMenu} />
        </div>
      </div>

      {/* FOLD MENU TOGGLE ON BORDER */}
      <div
        id="folder"
        className="absolute right-0 my-auto h-full w-2 translate-x-1/2 cursor-w-resize bg-clip-content px-[3px] transition-colors hover:bg-accent-8"
        onDoubleClick={() => {
          updateSettings({ ui: { collapsedLeftMenu: !collapsedLeftMenu } })
        }}
      />
    </div>
  )
}

export default LeftMenu
