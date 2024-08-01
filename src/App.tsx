import { Routes, Route, BrowserRouter } from "react-router-dom";
import AudioPlayer from "./components/AudioPlayer";
import LeftMenu from "./components/LeftMenu";
import TitleBar from "./components/TitleBar";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";

const App = () => {

  return (
    <div className="bg-zinc-900 w-full h-screen flex flex-col rounded-2xl border-slate-800 border-[1px] text-zinc-50">
      <TitleBar />
      <div className="flex justify-start w-full h-full">
        <BrowserRouter>
          <LeftMenu />
          <div className="flex flex-col w-full h-full">
            <div className="flex w-full h-full p-2">
              <Routes>
                <Route path='/' element={<HomePage />} />
                <Route path='/search' element={<SearchPage />} />
              </Routes>
            </div>
            <AudioPlayer src={import.meta.env.VITE_TEST_SRC} className="w-full" />
          </div>
        </BrowserRouter>
      </div>
    </div>
  );
};

export default App;
