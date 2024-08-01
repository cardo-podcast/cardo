import AudioPlayer from "./components/AudioPlayer";

const App = () => {

  return (
    <div>
      <AudioPlayer src={import.meta.env.VITE_TEST_SRC} />
    </div>
  );
};

export default App;
