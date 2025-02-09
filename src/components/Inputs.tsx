import { useEffect, useRef, useState } from 'react'
import { secondsToStr, strToSeconds } from '../utils/utils'
import { DndContext, Modifier, useDraggable } from '@dnd-kit/core'

export enum SwitchState {
  False,
  None,
  True,
}

export function Switch({
  state,
  setState,
  labels,
}: {
  state: SwitchState
  setState: (state: SwitchState) => void
  labels: [string, string]
}) {
  return (
    <div className="grid grid-cols-3 items-center gap-1 align-middle uppercase">
      <p className="text-right">{labels[0]}</p>
      <div className="mx-auto flex h-5 w-fit overflow-hidden rounded-md border-2 border-zinc-800 bg-zinc-300">
        <input
          type="radio"
          checked={state === SwitchState.False}
          onChange={() => setState(SwitchState.False)}
          className="h-full w-5 appearance-none checked:bg-blue-500"
        />
        <input
          type="radio"
          checked={state === SwitchState.None}
          onChange={() => setState(SwitchState.None)}
          className="h-full w-5 appearance-none checked:bg-primary-5"
        />
        <input
          type="radio"
          checked={state === SwitchState.True}
          onChange={() => setState(SwitchState.True)}
          className="h-full w-5 appearance-none checked:bg-green-500"
        />
      </div>
      <p className="text-left">{labels[1]}</p>
    </div>
  )
}

export function Checkbox({
  onChange,
  defaultChecked = false,
}: {
  onChange: (value: boolean) => void
  defaultChecked?: boolean
}) {
  return (
    <div className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        className="peer hidden"
        defaultChecked={defaultChecked}
        onChange={(e) => {
          onChange(Boolean(e.target.checked))
        }}
      />
      <span className="m-1 flex h-5 w-5 items-center justify-center rounded-md border-2 border-primary-2 bg-white text-center text-lg font-bold text-transparent transition duration-100 ease-in-out peer-checked:text-black">
        ✓
      </span>
    </div>
  )
}

export function AutocompleteInput({
  value,
  callback,
  options,
  className,
}: {
  value: string
  callback: (value: string) => void
  options: (typeof value)[]
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showOptions, setShowOptions] = useState<(typeof value)[]>([])

  return (
    <div className={'relative flex flex-col items-center ' + className}>
      <input
        ref={inputRef}
        type="text"
        className="w-full rounded-md bg-primary-8 px-2 py-1 focus:outline-none"
        defaultValue={value}
        onChange={(e) => {
          if (options.includes(e.target.value)) {
            callback(e.target.value)
          }

          setShowOptions(options.filter((option) => option.includes(e.target.value)))
        }}
        onSubmit={() => setShowOptions([])}
      />
      <div className="absolute top-10 flex h-36 w-full flex-col items-center overflow-hidden overflow-y-auto rounded-md">
        {showOptions.map((option) => (
          <button
            key={option}
            className="w-full bg-primary-7 p-1 hover:bg-primary-6"
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
        ))}
      </div>
    </div>
  )
}

export function TimeInput({ value, onChange }: { value: number; onChange: (t: number) => void }) {
  return (
    <input
      type="text"
      pattern="^(\d{1,2}:)?(\d{1,2}:)?\d{1,2}$"
      placeholder="hh:mm:ss"
      title="hh:mm:ss / mm:ss / ss"
      maxLength={8}
      className="h-5 w-20 rounded-md bg-primary-8 px-2 py-1 text-center invalid:text-red-600"
      defaultValue={secondsToStr(value, true)}
      onChange={(e) => {
        if (e.target.validity.valid) {
          const newVal = strToSeconds(e.target.value)
          onChange(newVal)
        }
      }}
      onBlur={(e) => {
        e.target.value = secondsToStr(strToSeconds(e.target.value), true) // formatting
      }}
    />
  )
}

function RangeBall({ position, className = '' }: { position: number; className?: string }) {
  const { setNodeRef, attributes, listeners } = useDraggable({ id: 'RangeBall' })

  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-3 ${className}`}
      {...listeners}
      {...attributes}
      style={{ left: `${position}%` }}
    />
  )
}

const restrictToParentElement: Modifier = ({ containerNodeRect, draggingNodeRect, transform }) => {
  if (!draggingNodeRect || !containerNodeRect) {
    return transform
  }

  // ball is visually centered, but value is get from the left side of the ball
  const leftSidePosition = draggingNodeRect.left + transform.x

  if (leftSidePosition <= containerNodeRect.left) {
    transform.x = containerNodeRect.left - draggingNodeRect.left
  } else if (leftSidePosition >= containerNodeRect.left + containerNodeRect.width) {
    transform.x = containerNodeRect.left + containerNodeRect.width - draggingNodeRect.left
  }

  return transform
}

export function RangeInput({
  min,
  max,
  value,
  onChange,
  step = undefined,
  units = 's',
  className,
}: {
  min: number
  max: number
  value: number
  onChange: (value: number) => void
  step?: number
  units?: 's' | '%'
  className?: string
}) {
  const barRef = useRef<HTMLDivElement>(null)

  const barWidth = barRef.current?.clientWidth ?? 0
  const barOffsetLeft = barRef.current?.offsetLeft ?? 0
  const [position, setPosition] = useState(0) // % of bar width
  const [dragging, setDragging] = useState(false)
  const [startDraggingPos, setStartDraggingPos] = useState(0)

  useEffect(() => {
    if (max - min > 0 && !dragging) {
      setPosition((value / (max - min)) * 100)
    }
  }, [value, max, min])

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
    let newValue = (position * (max - min)) / 100

    if (step && step > 0) {
      newValue = Math.floor(newValue / step) * step
    }

    onChange(newValue)
  }

  return (
    <div className="group container flex w-full items-center py-1">
      {' '}
      {/* hover window is a bit higher than the bar */}
      <div
        ref={barRef}
        className={`relative flex h-1 rounded-md bg-primary-7 ${className}`}
        onMouseMove={(e) => {
          const progress = ((e.clientX - barOffsetLeft) / barWidth) * (max - min)
          setTitle(Math.max(min, Math.min(progress, max)))
        }}
        onClick={(e) => {
          const progress = ((e.clientX - barOffsetLeft) / barWidth) * (max - min)
          const newPosition = (progress / (max - min)) * 100
          change(newPosition)
        }}
      >
        <DndContext
          onDragStart={() => {
            setDragging(true)
            setStartDraggingPos(position)
          }}
          onDragMove={(e) => {
            const newPosition = startDraggingPos + (e.delta.x / barWidth) * 100
            setPosition(newPosition)
            change(newPosition)
          }}
          onDragEnd={(e) => {
            setDragging(false)
            const newPosition = startDraggingPos + (e.delta.x / barWidth) * 100
            change(newPosition)
          }}
          modifiers={[restrictToParentElement]}
        >
          <RangeBall
            position={position}
            className={`${!dragging && 'opacity-0'} transition-opacity group-hover:opacity-100`}
          />
        </DndContext>
        <div className="h-full rounded-md bg-accent-6" style={{ width: `${position}%` }} /> {/* progrss is colored */}
      </div>
    </div>
  )
}
