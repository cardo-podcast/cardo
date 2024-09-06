import { ReactNode, useState } from "react"


export function useModalBanner(): [typeof showBanner, typeof Banner] {
  const [showDialog, setShowDialog] = useState(false)

  function showBanner(condition = true) {
    setShowDialog(condition)
  }

  function Banner({ children, onAccepted, labels=['ok', 'cancel'] }:
    { children: ReactNode, onAccepted: () => void | Promise<void>, labels?: [string, string] }){

    return ModalBanner({ children, onAccepted, showDialog, setShowDialog, labels })
  }

  return [ showBanner,  Banner]
}


function ModalBanner({ children, onAccepted, showDialog, setShowDialog, labels }:
  { children: ReactNode, onAccepted: () => void | Promise<void>,
    showDialog: boolean, setShowDialog: (value:boolean) => void,
    labels: [string, string]}) {


  return (
    <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-64 max-w-[70%] bg-primary-9 rounded-md z-40
      border-2 border-primary-6 shadow-md shadow-primary-8 px-3 py-1.5 flex-col gap-1 justify-between transition-all ${showDialog ? 'flex' : 'hidden'}
  `}>
      {children}
      <div className='flex gap-4 justify-center mt-1'>
        <button className='bg-green-600 px-2 py-1 rounded-md uppercase min-w-20'
          onClick={() => {
            setShowDialog(false)
            onAccepted()
          }}
        >
          {labels[0]}
        </button>

        <button className='bg-red-600 px-2 py-1 rounded-md uppercase'
          onClick={() => { setShowDialog(false) }}
        >
          {labels[1]}
        </button>
      </div>
    </div >
  )
}


