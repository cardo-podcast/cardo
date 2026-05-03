import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { sync, home, settings, queue, download } from '../Icons'
import SubscriptionCard from './SubscriptionCard'
import { useSettings } from '../engines/Settings'
import { useModalBanner } from './ModalBanner'
import { parsePodcastDetails, toastError } from '../utils/utils'
import { useRef, useState } from 'react'
import { useSubscriptions, useSubscriptionsEpisodes } from '../ContextProviders'

const COLLAPSED_WIDTH = 64
const COLLAPSE_THRESHOLD = 100
const MIN_WIDTH = 180
const MAX_WIDTH = 480

function NewSubscriptionButton({ mini = false }: { mini?: boolean }) {
  const { t } = useTranslation()
  const [showBanner, Banner] = useModalBanner()
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  function checkURLScheme() {
    // If no scheme is specified, attempt to append https:// to the URL.
    if (inputRef.current &&
      inputRef.current.value.length >= 3 &&
      !inputRef.current.value.includes('://')) {
        inputRef.current.value = 'https://' + inputRef.current.value;
    }
  }

  return (
    <>
      <Banner
        labels={[t('ok'), t('cancel')]}
        onSubmit={async () => {
          if (!inputRef.current) return
          checkURLScheme()

          if (!inputRef.current.validity.valid) {
            toastError(t('please_indicate_url'))
            return 'error'
          }

          const podcast = await parsePodcastDetails(inputRef.current.value)
          navigate('/preview', {
            state: {
              podcast,
            },
          })
        }}
      >
        <div className="mb-1 flex flex-col gap-2">
          <h1 className="border-b-2 border-primary-8 pb-1 text-lg">{t('add_subscription_url')}</h1>
          <input
            ref={inputRef}
            type="url"
            placeholder={t('feed_url')}
            autoFocus
            className="w-96 rounded-md bg-primary-8 px-2 py-1 focus:outline-none"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                checkURLScheme();
              }
            }}
            onBlur={checkURLScheme}
          />
        </div>
      </Banner>

      <div
        className={`group flex gap-2 rounded-md p-1 transition-all hover:bg-primary-8 ${mini ? 'justify-center' : 'justify-between'}`}
      >
        <button
          onClick={() => showBanner()}
          title={t('add_subscription_url')}
          className={`flex aspect-square h-10 items-center justify-center rounded-md bg-primary-7 hover:bg-accent-7 group-[:not(:hover)]:bg-primary-8`}
        >
          <span className="-mt-2 text-3xl">+</span>
        </button>

        {!mini && <p className={`h-10 w-full cursor-default text-sm`}>{t('add_subscription_url')}</p>}
      </div>
    </>
  )
}

function LeftMenu() {
  const subscriptions = useSubscriptions()
  const subscriptionsEpisodes = useSubscriptionsEpisodes()
  const { t } = useTranslation()
  const [
    {
      ui: { collapsedLeftMenu, leftMenuWidth },
    },
    updateSettings,
  ] = useSettings()
  const dragging = useRef(false)
  const dragDirection = useRef<'left' | 'right'>('right')
  const prevX = useRef(0)
  const [liveWidth, setLiveWidth] = useState<number | null>(null)

  const liveDragging = liveWidth !== null
  const collapsed = liveDragging ? liveWidth! < COLLAPSE_THRESHOLD : collapsedLeftMenu
  const displayWidth = collapsed ? COLLAPSED_WIDTH : (liveWidth ?? leftMenuWidth)

  function onResizeStart(e: React.PointerEvent) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    prevX.current = e.clientX
    dragDirection.current = 'right'
    document.body.style.cursor = 'col-resize'
    setLiveWidth(e.clientX)
  }

  function onResizeMove(e: React.PointerEvent) {
    if (!dragging.current) return
    if (e.clientX !== prevX.current) {
      dragDirection.current = e.clientX > prevX.current ? 'right' : 'left'
      prevX.current = e.clientX
    }
    setLiveWidth(Math.min(MAX_WIDTH, e.clientX))
  }

  function onResizeEnd(e: React.PointerEvent) {
    if (!dragging.current) return
    dragging.current = false
    document.body.style.cursor = ''
    const newWidth = Math.min(MAX_WIDTH, e.clientX)
    if (newWidth < COLLAPSE_THRESHOLD || (newWidth < MIN_WIDTH && dragDirection.current === 'left')) {
      updateSettings({ ui: { collapsedLeftMenu: true } })
    } else {
      updateSettings({ ui: { collapsedLeftMenu: false, leftMenuWidth: Math.max(MIN_WIDTH, newWidth) } })
    }
    setLiveWidth(null)
  }

  return (
    <div className="relative flex" style={{ width: displayWidth }}>
      <div
        className={`flex h-full w-full flex-col overflow-x-hidden border-r border-primary-8 bg-primary-9 pt-4 ${collapsed ? 'items-center p-0.5' : 'p-3'}`}
      >
        <div
          className={`mb-6 flex flex-col font-light uppercase ${collapsed ? 'items-center gap-2' : 'gap-1'}`}
        >
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex transition-all ${isActive ? 'cursor-default text-primary-4' : 'hover:pl-1 hover:text-accent-5'}`
            }
            title={t('home')}
          >
            {collapsed ? <span className="w-6">{home}</span> : t('home')}
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex transition-all ${isActive ? 'cursor-default text-primary-4' : 'hover:pl-1 hover:text-accent-5'}`
            }
            title={t('settings')}
          >
            {collapsed ? <span className="w-6">{settings}</span> : t('settings')}
          </NavLink>
          <NavLink
            to="/queue"
            className={({ isActive }) =>
              `flex transition-all ${isActive ? 'cursor-default text-primary-4' : 'hover:pl-1 hover:text-accent-5'}`
            }
            title={t('queue')}
          >
            {collapsed ? <span className="w-6">{queue}</span> : t('queue')}
          </NavLink>
          <NavLink
            to="/downloads"
            className={({ isActive }) =>
              `flex transition-all ${isActive ? 'cursor-default text-primary-4' : 'hover:pl-1 hover:text-accent-5'}`
            }
            title={t('downloads')}
          >
            {collapsed ? <span className="w-6">{download}</span> : t('downloads')}
          </NavLink>
        </div>

        <div className={`mb-1 flex items-center gap-2 ${collapsed && 'justify-center'}`}>
          {!collapsed && <h1 className="mb-0.5 uppercase">{t('subscriptions')}</h1>}
          <button
            className={`flex justify-center hover:text-accent-5 ${subscriptionsEpisodes.fetchingFeeds.length && 'animate-[spin_1.5s_linear_reverse_infinite]'}`}
            onClick={() => subscriptions.updateFeeds()}
            title={t('update_subs_feeds')}
          >
            <span className={`${collapsed ? 'w-6' : 'w-5'}`}>{sync}</span>
          </button>
        </div>

        <div className="flex flex-col gap-1 overflow-y-auto scroll-smooth">
          {subscriptions.subscriptions.map((subscription) => {
            return <SubscriptionCard key={subscription.id} podcast={subscription} mini={collapsed} />
          })}
          <NewSubscriptionButton mini={collapsed} />
        </div>
      </div>

      {/* RESIZE HANDLE */}
      <div
        className="absolute right-0 my-auto h-full w-2 translate-x-1/2 cursor-w-resize bg-clip-content px-[3px] transition-colors hover:bg-accent-8"
        title={collapsed ? t('double_click_expand') : t('double_click_collapse')}
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        onDoubleClick={() => updateSettings({ ui: { collapsedLeftMenu: !collapsedLeftMenu } })}
      />
    </div>
  )
}

export default LeftMenu
