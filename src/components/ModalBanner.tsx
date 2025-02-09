import { ReactNode, useState } from 'react'

export function useModalBanner(): [typeof showBanner, typeof Banner] {
  const [showDialog, setShowDialog] = useState(false)

  function showBanner(condition = true) {
    setShowDialog(condition)
  }

  function Banner({
    children,
    onAccepted,
    labels = ['ok', 'cancel'],
  }: {
    children: ReactNode
    onAccepted: () => void | Promise<void | 'error'>
    labels?: [string, string]
  }) {
    return ModalBanner({ children, onAccepted, showDialog, setShowDialog, labels })
  }

  return [showBanner, Banner]
}

function ModalBanner({
  children,
  onAccepted,
  showDialog,
  setShowDialog,
  labels,
}: {
  children: ReactNode
  onAccepted: () => void | Promise<void | 'error'>
  showDialog: boolean
  setShowDialog: (value: boolean) => void
  labels: [string, string]
}) {
  return (
    <div
      className={`fixed left-1/2 top-1/2 z-40 min-w-64 max-w-[70%] -translate-x-1/2 -translate-y-1/2 flex-col justify-between gap-1 rounded-md border-2 border-primary-6 bg-primary-9 px-3 py-1.5 shadow-md shadow-primary-8 transition-all ${showDialog ? 'flex' : 'hidden'} `}
    >
      {children}
      <div className="mt-1 flex justify-center gap-4">
        <button
          className="min-w-20 rounded-md bg-green-600 px-2 py-1 uppercase"
          onClick={async () => {
            const error = await onAccepted()
            if (!error) {
              setShowDialog(false)
            }
          }}
        >
          {labels[0]}
        </button>

        <button
          className="rounded-md bg-red-600 px-2 py-1 uppercase"
          onClick={() => {
            setShowDialog(false)
          }}
        >
          {labels[1]}
        </button>
      </div>
    </div>
  )
}
