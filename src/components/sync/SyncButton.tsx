import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { useSync } from "../../ContextProviders"




export function SyncButton() {
  const { t } = useTranslation()
  const { status, error, sync, loggedIn } = useSync()
  const navigate = useNavigate()

  function handleClick() {
    if (!loggedIn) {
      toast.info(t('not_logged_sync'), {
        position: 'top-center',
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'dark',
      })
      navigate('/settings')
      return
    }

    status !== 'synchronizing' && sync()
  }

  return (
    <button className={`w-6 outline-none hover:text-accent-4 ${status === 'synchronizing' && 'animate-[spin_2s_linear_infinite_reverse]'}`} onClick={handleClick} title={error === '' ? t('sync') : error}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-refresh">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
        <circle cx="12" cy="12" r="2" fill={status === 'error' ? 'red' : status === 'ok' ? 'green' : 'none'} stroke="none" />
        <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
      </svg>
    </button>
  )
}