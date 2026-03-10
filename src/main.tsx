import ReactDOM from 'react-dom/client'
import App from './App'
import './main.css'
import './engines/translations'
import { error, warn, info, debug, trace } from '@tauri-apps/plugin-log'
import tauriConfig from '../src-tauri/tauri.conf.json'

// tauri-plugin-log writes the logs to:
// Windows: %LOCALAPPDATA%\cardo\logs\
// Mac:     ~/Library/Logs/cardo/
// Linux:   ~/.config/cardo/logs/
if (!(window as any).__cardo_log_init) {
  ;(window as any).__cardo_log_init = true

  function forwardLog(
    fnName: 'log' | 'debug' | 'info' | 'warn' | 'error',
    logger: (message: string) => Promise<void>,
  ) {
    const original = console[fnName]
    console[fnName] = (...args: unknown[]) => {
      original.apply(console, args)
      logger(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
    }
  }

  forwardLog('log', trace)
  forwardLog('debug', debug)
  forwardLog('info', info)
  forwardLog('warn', warn)
  forwardLog('error', error)

  info(`Cardo v${tauriConfig.version} (webview) started`)

  window.addEventListener(
    'error',
    (event) => {
      if (event.target && event.target !== window) {
        const el = event.target as HTMLElement
        const url = (el as HTMLImageElement).src || (el as HTMLLinkElement).href || ''
        error(`Failed to load resource: ${url}`).catch(() => {})
      } else {
        error(`Unhandled error: ${event.error?.stack ?? event.error}`).catch(() => {})
      }
    },
    true,
  )
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    error(
      `Unhandled rejection: ${event.reason instanceof Error ? (event.reason.stack ?? event.reason.message) : String(event.reason)}`,
    ).catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
