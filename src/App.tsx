import { Routes, Route, BrowserRouter } from "react-router-dom";
import AudioPlayer from "./components/AudioPlayer";
import LeftMenu from "./components/LeftMenu";
import TitleBar from "./components/TitleBar";
import HomePage from "./pages/HomePage";
import SearchBar from "./components/SearchBar";
import PodcastPreview from "./pages/PodcastPreview";

const App = () => {

  return (
    <div className="bg-zinc-900 w-full h-screen flex flex-col rounded-2xl border-zinc-600 border-[1px] text-zinc-50 overflow-hidden">
      <TitleBar />
      <div className="flex justify-start w-full h-full overflow-hidden">
        <BrowserRouter>
          <LeftMenu />
          <div className="flex flex-col w-full h-full">
            <SearchBar/>
            <div className="flex h-full overflow-y-auto">
              <Routes>
                <Route path='/' element={<HomePage />} />
                <Route path='/preview' element={<PodcastPreview />} />
              </Routes>
            </div>
            <AudioPlayer src={import.meta.env.VITE_TEST_SRC} className="w-full min-h-[70px] flex-shrink-0" />
          </div>
        </BrowserRouter>
      </div>
    </div>
  );
};

export default App;
