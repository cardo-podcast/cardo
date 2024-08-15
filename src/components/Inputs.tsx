import { useState } from "react"



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
    <div className="flex gap-2 items-center uppercase text-sm">
      <p>{labels[0]}</p>
      <div className="bg-zinc-300 h-5 rounded-md overflow-hidden flex">
        <input type="radio" name="toggle" checked={state === SwitchState.False} onChange={() => setState(SwitchState.False)}
          className="w-5 h-full appearance-none checked:bg-blue-500" />
        <input type="radio" name="toggle" checked={state === SwitchState.None} onChange={() => setState(SwitchState.None)}
          className="w-5 h-full appearance-none checked:bg-zinc-400" />
        <input type="radio" name="toggle" checked={state === SwitchState.True} onChange={() => setState(SwitchState.True)}
          className="w-5 h-full appearance-none checked:bg-green-500" />
      </div>
      <p>{labels[1]}</p>
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
      <span className="text-transparent peer-checked:text-zinc-900 text-lg font-bold flex justify-center items-center h-5 w-5 text-center bg-zinc-200 transition duration-100 ease-in-out rounded-md m-1">
        ✓
      </span>
    </div>
  )
}
