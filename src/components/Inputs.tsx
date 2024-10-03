import { useEffect, useRef, useState } from "react"
import { secondsToStr, strToSeconds } from "../utils/utils"
import { DndContext, Modifier, useDraggable } from "@dnd-kit/core"


export enum SwitchState {
  False,
  None,
  True
}


export function Switch({ state, setState, labels }: {
  state: SwitchState,
  setState: (state: SwitchState) => void,
  labels: [string, string]
}) {


  return (
    <div className="grid grid-cols-3 gap-1 uppercase items-center align-middle">
      <p className="text-right">{labels[0]}</p>
      <div className="bg-zinc-300 border-2 border-zinc-800 h-5 rounded-md overflow-hidden flex w-fit mx-auto">
        <input type="radio" checked={state === SwitchState.False} onChange={() => setState(SwitchState.False)}
          className="w-5 h-full appearance-none checked:bg-blue-500" />
        <input type="radio" checked={state === SwitchState.None} onChange={() => setState(SwitchState.None)}
          className="w-5 h-full appearance-none checked:bg-primary-5" />
        <input type="radio" checked={state === SwitchState.True} onChange={() => setState(SwitchState.True)}
          className="w-5 h-full appearance-none checked:bg-green-500" />
      </div>
      <p className="text-left">{labels[1]}</p>
    </div>
  )
}


export function Checkbox({ onChange, defaultChecked = false }: { onChange: (value: boolean) => void, defaultChecked?: boolean }) {


  return (
    <div className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="hidden peer"
        defaultChecked={defaultChecked}
        onChange={(e) => {
          onChange(Boolean(e.target.checked))
        }}
      />
      <span className="text-transparent peer-checked:text-black bg-white text-lg font-bold flex justify-center items-center h-5 w-5 text-center border-2 border-primary-2 transition duration-100 ease-in-out rounded-md m-1">
        ✓
      </span>
    </div>
  )
}


export function AutocompleteInput({ value, callback, options, className }: {
  value: string,
  callback: (value: string) => void,
  options: typeof value[],
  className?: string
}) {

  const inputRef = useRef<HTMLInputElement>(null)
  const [showOptions, setShowOptions] = useState<typeof value[]>([])

  return (
    <div className={'relative flex flex-col items-center ' + className}>
      <input
        ref={inputRef}
        type="text"
        className='bg-primary-8 rounded-md px-2 py-1 focus:outline-none w-full'
        defaultValue={value}
        onChange={e => {
          if (options.includes(e.target.value)) {
            callback(e.target.value)
          }

          setShowOptions(
            options.filter(option => option.includes(e.target.value))
          )
        }}
        onSubmit={() => setShowOptions([])}
      />
      <div className="absolute top-10 flex flex-col items-center w-full rounded-md overflow-hidden h-36 overflow-y-auto">
        {
          showOptions.map(option => (
            <button key={option}
              className='w-full p-1 bg-primary-7 hover:bg-primary-6'
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.value = option
                  callback(option)
                  setShowOptions([])
                }
              }}
            >
              {option}
            </button>
          ))
        }
      </div>
    </div>
  )
}


export function TimeInput({ value, onChange }: { value: number, onChange: (t: number) => void }) {

  return (
    <input
      type="text"
      pattern="^(\d{1,2}:)?(\d{1,2}:)?\d{1,2}$"
      placeholder="hh:mm:ss"
      title="hh:mm:ss / mm:ss / ss"
      maxLength={8}
      className="h-5 text-center bg-primary-8 rounded-md invalid:text-red-600 w-20 px-2 py-1"
      defaultValue={secondsToStr(value, true)}
      onChange={e => {
        if (e.target.validity.valid) {
          const newVal = strToSeconds(e.target.value)
          onChange(newVal)
        }
      }
      }
      onBlur={e => {
        e.target.value = secondsToStr(strToSeconds(e.target.value), true) // formatting
      }
      }
    />
  )
}


function RangeBall({ position, className = '' }: { position: number, className?: string }) {
  const { setNodeRef, attributes, listeners } = useDraggable({ id: 'RangeBall' })


  return (
    <div ref={setNodeRef} className={`absolute top-1/2 -translate-y-1/2 left-0 -translate-x-1/2 bg-primary-3 w-3 h-3 rounded-full ${className}`}
    {...listeners} {...attributes} style={{left: `${position}%`}}
    />
  )
}

const restrictToParentElement: Modifier = ({
  containerNodeRect,
  draggingNodeRect,
  transform,
}) => {



  if (!draggingNodeRect || !containerNodeRect) {
    return transform;
  }

  // ball is visually centered, but value is get from the left side of the ball
  const leftSidePosition = draggingNodeRect.left + transform.x

  if (leftSidePosition <= containerNodeRect.left) {
    transform.x = containerNodeRect.left - draggingNodeRect.left
  } else if (
    leftSidePosition >= containerNodeRect.left + containerNodeRect.width
  ) {
    transform.x = containerNodeRect.left + containerNodeRect.width - draggingNodeRect.left;
  }
  

  return transform
};

export function RangeInput({ min, max, value, onChange, step=undefined, units='s', className }:
  { min: number, max: number, value: number, onChange: (value: number) => void,
    step?: number, units?: 's' | '%', className?: string }) {

  const barRef = useRef<HTMLDivElement>(null)

  const barWidth = barRef.current?.clientWidth ?? 0
  const barOffsetLeft = barRef.current?.offsetLeft ?? 0
  const [position, setPosition] = useState(0) // % of bar width
  const [dragging, setDragging] = useState(false)
  const [startDraggingPos, setStartDraggingPos] = useState(0)

  useEffect(() => {
    if (max - min > 0 && !dragging) {
      setPosition(value / (max - min) * 100)
    }
  }, [value])

  function setTitle(progress: number) {
    if (barRef.current) {
      if (units === 's') {
        barRef.current.title = secondsToStr(progress)
      } else if (units === '%') {
        barRef.current.title = Math.floor(progress * 100) + '%'
      }
    }
  }

  function change(position: number) {
    let newValue = position * (max - min) / 100

    if (step && step > 0) {
      newValue = Math.floor(newValue / step) * step
    }

    onChange(newValue)
  }

  return (
    <div className="group container py-1 w-full flex items-center"> {/* hover window is a bit higher than the bar */}
      <div ref={barRef} className={`relative flex h-1 rounded-md bg-primary-7 ${className}`}
        onMouseMove={e => {
          const progress = (e.clientX - barOffsetLeft) / barWidth * (max - min)
          setTitle(Math.max(min, Math.min(progress, max)))
        }}
        onClick={e => {
          const progress = (e.clientX - barOffsetLeft) / barWidth * (max - min)
          const newPosition = progress / (max - min) * 100
          change(newPosition)
        }}
      >
        <DndContext
          onDragStart={() => {
            setDragging(true)
            setStartDraggingPos(position)
          }}
            onDragMove={e => {
              const newPosition = startDraggingPos + (e.delta.x / barWidth * 100)
              setPosition(newPosition)
              change(newPosition)

            }}
            onDragEnd={(e) => {
              setDragging(false)
              const newPosition = startDraggingPos + (e.delta.x / barWidth * 100)
              change(newPosition)
            }}
            modifiers={[restrictToParentElement]}>
            
          <RangeBall position={position} className={`${!dragging && 'opacity-0'} group-hover:opacity-100 transition-opacity`} />
        </DndContext>

        <div className="bg-accent-6 h-full rounded-md" style={{ width: `${position}%` }} /> {/* progrss is colored */}
      </div>
    </div>
  )
}