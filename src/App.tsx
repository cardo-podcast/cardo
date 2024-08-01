import AudioPlayer from "./components/AudioPlayer";
import LeftMenu from "./components/LeftMenu";
import TitleBar from "./components/TitleBar";

const App = () => {

  return (
    <div className="bg-zinc-900 w-full h-screen flex flex-col rounded-2xl border-slate-800 border-[1px]">
      <TitleBar/>
      <div className="flex justify-start w-full h-full">
        <LeftMenu/>
        <div className="flex flex-col w-full h-full text-zinc-50">
          <div className="flex w-full h-full p-2">
            MAIN
          </div>
          <AudioPlayer src={import.meta.env.VITE_TEST_SRC} className="w-full"/>
        </div>
      </div>
    </div>
  );
};

export default App;
