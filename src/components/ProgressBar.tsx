import { secondsToStr } from "../utils";


const ProgressBar = ({ position, total, showTime=true, className }:
              { position: number, total: number, showTime?: boolean, className?: {div?: string, bar?: string, innerBar?: string} }) => {
  const progressStyle = {
    width: `${(position / total) * 100}%`,
  };

  return (
    <div className={"flex w-full items-center gap-1 text-sm " + className?.div}>
      {showTime && <p>{secondsToStr(position)}</p>}
      <div className={"w-full h-full bg-primary-700 " + className?.bar}>
        <div
          className={"bg-accent-500 h-full " + className?.innerBar}
        style={progressStyle}
        />
      </div>
      {showTime && <p>{secondsToStr(total)}</p>}
    </div>

  );
};

export default ProgressBar;