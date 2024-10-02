import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import AudioPlayer, { AudioPlayerProvider } from "./components/AudioPlayer";
import LeftMenu from "./components/LeftMenu";
import TitleBar from "./components/TitleBar";
import HomePage from "./pages/HomePage";
import SearchBar from "./components/SearchBar";
const PodcastPreview = lazy(() => import('./pages/PodcastPreview'));
import { DBProvider } from "./DB/DB";
const EpisodePreview = lazy(() => import('./pages/EpisodePreview'));
const Settings = lazy(() => import('./pages/Settings'));
import { SettingsProvider } from "./engines/Settings";
const QueuePage = lazy(() => import('./pages/QueuePage'));
import { appWindow } from "@tauri-apps/api/window";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { SyncProvider } from "./sync/Nextcloud";
const DownloadsPage = lazy(() => import('./pages/DownloadsPage'));
import { platform } from '@tauri-apps/api/os';


const App = () => {
  const [roundedCorners, setRoundedCorners] = useState(false)

  // handle rounded corners when window is minimized, disabled on mac
  useEffect(() => {
    platform().then(p => {
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
    document.addEventListener('contextmenu', event => event.preventDefault());

    return () => document.removeEventListener('contextmenu', event => event.preventDefault());
  }, [])


  return (
    <div className={`bg-primary-9 w-full h-screen flex flex-col border-primary-7 border-[1px]
                         overflow-hidden ${roundedCorners && 'rounded-lg'}`}>
      <BrowserRouter>
        <SettingsProvider>
          <DBProvider>
            <AudioPlayerProvider>
              <SyncProvider>
                <TitleBar />
                <ToastContainer />
                <div className="flex justify-start w-full h-full overflow-hidden">
                  <LeftMenu />
                  <div className="flex flex-col overflow-y-hidden w-full h-full">
                    <SearchBar />
                    <div className="flex h-full overflow-y-auto scroll-smooth border-t border-primary-8">
                      <Suspense>
                        <Routes>
                          <Route path='/' element={<HomePage />} />
                          <Route path='/preview' element={<PodcastPreview />} />
                          <Route path='/episode-preview' element={<EpisodePreview />} />
                          <Route path='/settings' element={<Settings />} />
                          <Route path='/queue' element={<QueuePage />} />
                          <Route path='/downloads' element={<DownloadsPage />} />
                        </Routes>
                      </Suspense>
                    </div>
                  </div>
                </div>
                <AudioPlayer className="w-full h-28 flex-shrink-0" />
              </SyncProvider>
            </AudioPlayerProvider>
          </DBProvider>
        </SettingsProvider>
      </BrowserRouter>
    </div>
  );
};

export default App;
