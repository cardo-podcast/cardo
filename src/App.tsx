import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, BrowserRouter } from 'react-router-dom'
import AudioPlayer, { AudioPlayerProvider } from './components/AudioPlayer'
import LeftMenu from './components/LeftMenu'
import TitleBar from './components/TitleBar'
import HomePage from './pages/HomePage'
import SearchBar from './components/SearchBar'
import { DBProvider } from './DB/DB'
import { SettingsProvider } from './engines/Settings'
import { appWindow } from '@tauri-apps/api/window'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { SyncProvider } from './sync/Sync'
import { platform } from '@tauri-apps/api/os'
const PodcastPreview = lazy(() => import('./pages/PodcastPreview'))
const EpisodePreview = lazy(() => import('./pages/EpisodePreview'))
const Settings = lazy(() => import('./pages/Settings'))
const QueuePage = lazy(() => import('./pages/QueuePage'))
const DownloadsPage = lazy(() => import('./pages/DownloadsPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))

const App = () => {
  const [roundedCorners, setRoundedCorners] = useState(false)

  // handle rounded corners when window is minimized, disabled on mac
  useEffect(() => {
    platform().then((p) => {
      if (p === 'darwin') {
        return // no rounded corners on mac (https://github.com/agmmnn/tauri-controls/issues/10)
      } else {
        async function handleResize() {
          const isMaximized = await appWindow.isMaximized()
          setRoundedCorners(!isMaximized)
        }

        appWindow.onResized(handleResize)
        handleResize()
      }
    })
  }, [appWindow])

  // prevent webview context menu
  useEffect(() => {
    document.addEventListener('contextmenu', (event) => event.preventDefault())

    return () => document.removeEventListener('contextmenu', (event) => event.preventDefault())
  }, [])

  return (
    <div
      className={`flex h-screen w-full flex-col overflow-hidden border-[1px] border-primary-7 bg-primary-9 ${roundedCorners && 'rounded-lg'}`}
    >
      <BrowserRouter>
        <SettingsProvider>
          <DBProvider>
            <AudioPlayerProvider>
              <SyncProvider>
                <TitleBar />
                <ToastContainer />
                <div className="flex h-full w-full justify-start overflow-hidden">
                  <LeftMenu />
                  <div className="flex h-full w-full flex-col overflow-y-hidden">
                    <SearchBar />
                    <div className="flex h-full overflow-y-auto scroll-smooth border-t border-primary-8">
                      <Suspense>
                        <Routes>
                          <Route path="/" element={<HomePage />} />
                          <Route path="/preview" element={<PodcastPreview />} />
                          <Route path="/episode-preview" element={<EpisodePreview />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/queue" element={<QueuePage />} />
                          <Route path="/downloads" element={<DownloadsPage />} />
                          <Route path="/history" element={<HistoryPage />} />
                        </Routes>
                      </Suspense>
                    </div>
                  </div>
                </div>
                <AudioPlayer className="h-28 w-full flex-shrink-0" />
              </SyncProvider>
            </AudioPlayerProvider>
          </DBProvider>
        </SettingsProvider>
      </BrowserRouter>
    </div>
  )
}

export default App
