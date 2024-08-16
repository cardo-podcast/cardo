import { Routes, Route, BrowserRouter } from "react-router-dom";
import AudioPlayer, { AudioPlayerProvider } from "./components/AudioPlayer";
import LeftMenu from "./components/LeftMenu";
import TitleBar from "./components/TitleBar";
import HomePage from "./pages/HomePage";
import SearchBar from "./components/SearchBar";
import PodcastPreview from "./pages/PodcastPreview";
import { DBProvider } from "./DB";
import EpisodePreview from "./pages/EpisodePreview";
import { useEffect, useState } from "react";
import Settings from "./pages/Settings";
import { SettingsProvider } from "./Settings";
import QueuePage from "./pages/QueuePage";
import { appWindow } from "@tauri-apps/api/window";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';


const App = () => {
  const [isMaximized, setIsMaximized] = useState(false)

  appWindow.onResized(async () => {
    setIsMaximized(await appWindow.isMaximized())
  })

  // prevent webview context menu
  useEffect(() => {
    document.addEventListener('contextmenu', event => event.preventDefault());

    return () => document.removeEventListener('contextmenu', event => event.preventDefault());
  })

  return (
    <div className={`bg-zinc-900 w-full h-screen flex flex-col border-zinc-600 border-[1px]
                        text-zinc-50 overflow-hidden ${isMaximized ? '' : 'rounded-lg'}`}>
      <BrowserRouter>
        <SettingsProvider>
          <DBProvider>
            <AudioPlayerProvider>
              <TitleBar />
              <ToastContainer />
              <div className="flex justify-start w-full h-full overflow-hidden">
                <LeftMenu />
                <div className="flex flex-col w-full h-ful">
                  <SearchBar />
                  <div className="flex h-full overflow-y-auto">
                    <Routes>
                      <Route path='/' element={<HomePage />} />
                      <Route path='/preview' element={<PodcastPreview />} />
                      <Route path='/episode-preview' element={<EpisodePreview />} />
                      <Route path='/settings' element={<Settings />} />
                      <Route path='/queue' element={<QueuePage />} />
                    </Routes>
                  </div>
                </div>
              </div>
              <AudioPlayer className="w-full h-28 flex-shrink-0" />
            </AudioPlayerProvider>
          </DBProvider>
        </SettingsProvider>
      </BrowserRouter>
    </div>
  );
};

export default App;
