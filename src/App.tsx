import { Routes, Route, BrowserRouter } from "react-router-dom";
import AudioPlayer, { AudioPlayerRef } from "./components/AudioPlayer";
import LeftMenu from "./components/LeftMenu";
import TitleBar from "./components/TitleBar";
import HomePage from "./pages/HomePage";
import SearchBar from "./components/SearchBar";
import PodcastPreview from "./pages/PodcastPreview";
import { DBProvider } from "./DB";
import EpisodePreview from "./pages/EpisodePreview";
import { useRef } from "react";
import Settings from "./pages/Settings";
import { EpisodeData } from ".";
import { SettingsProvider } from "./sync/Settings";


const App = () => {
  const playerRef = useRef<AudioPlayerRef>(null)

  const play = (episode?: EpisodeData | undefined, podcastUrl?: string) => {
    if (playerRef.current !== null) {
      playerRef.current.play(episode, podcastUrl)
    }
  }


  return (
    <div className="bg-zinc-900 w-full h-screen flex flex-col rounded-2xl border-zinc-600 border-[1px] text-zinc-50 overflow-hidden">
      <SettingsProvider>
        <DBProvider>
          <TitleBar />
          <div className="flex justify-start w-full h-full overflow-hidden">
            <BrowserRouter>
              <LeftMenu />
              <div className="flex flex-col w-full h-full">
                <SearchBar />
                <div className="flex h-full overflow-y-auto">
                  <Routes>
                    <Route path='/' element={<HomePage />} />
                    <Route path='/preview' element={<PodcastPreview play={play} />} />
                    <Route path='/episode-preview' element={<EpisodePreview play={play} />} />
                    <Route path='/settings' element={<Settings />} />
                  </Routes>
                </div>
                <AudioPlayer ref={playerRef} className="w-full min-h-[70px] flex-shrink-0" />
              </div>
            </BrowserRouter>
          </div>
        </DBProvider>
      </SettingsProvider>
    </div>
  );
};

export default App;
