import { usePlayerPosition } from '../ContextProviders'
import { secondsToStr } from '../utils/utils'

type ProgressBarProps = {
  position: number
  total: number
  showTime?: boolean
  className?: { div?: string; bar?: string; innerBar?: string }
}

const ProgressBar = ({
  position,
  total,
  showTime = true,
  className,
}: ProgressBarProps) => {
  const progressStyle = {
    width: `${(position / total) * 100}%`,
  }

  return (
    <div className={'flex w-full items-center gap-1 text-sm ' + className?.div}>
      {showTime && <p>{secondsToStr(position)}</p>}
      <div className={'h-full w-full bg-primary-7 ' + className?.bar}>
        <div className={'h-full bg-accent-5 ' + className?.innerBar} style={progressStyle} />
      </div>
      {showTime && <p>{secondsToStr(total)}</p>}
    </div>
  )
}

export function LiveProgressBar(props: Omit<ProgressBarProps, 'position'>) {
  const position = usePlayerPosition()
  return <ProgressBar {...props} position={position} />
}

export default ProgressBar
