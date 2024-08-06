import { secondsToStr } from "../utils";


const ProgressBar = ({ position, total }: { position: number, total: number }) => {
  const progressStyle = {
    width: `${(position / total) * 100}%`,
  };

  return (
    <div className="flex w-full items-center gap-1 text-sm">
      <p>{secondsToStr(position)}</p>
      <div className="w-full bg-zinc-600 h-1 rounded">
        <div
          className="bg-amber-500 rounded h-full"
        style={progressStyle}
        />
      </div>
      <p>{secondsToStr(total)}</p>
    </div>

  );
};

export default ProgressBar;