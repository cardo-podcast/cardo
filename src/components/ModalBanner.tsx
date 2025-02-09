import { FormEvent, ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function useModalBanner(): [typeof showBanner, typeof Banner] {
  const [showDialog, setShowDialog] = useState(false)

  function showBanner(condition = true) {
    setShowDialog(condition)
  }

  function Banner({
    children,
    onSubmit,
    labels = ['ok', 'cancel'],
  }: {
    children: ReactNode
    onSubmit: () => void | Promise<void | 'error'>
    labels?: [string, string]
  }) {
    return ModalBanner({ children, onSubmit: onSubmit, showDialog, setShowDialog, labels })
  }

  return [showBanner, Banner]
}

function ModalBanner({
  children,
  onSubmit,
  showDialog,
  setShowDialog,
  labels,
}: {
  children: ReactNode
  onSubmit: (e: FormEvent) => void | Promise<void | 'error'>
  showDialog: boolean
  setShowDialog: (value: boolean) => void
  labels?: [string, string]
}) {
  const { t } = useTranslation()

  if (!labels) {
    labels = [t('ok'), t('cancel')]
  }
  return (
    <form
      className={`fixed left-1/2 top-1/2 z-40 min-w-64 max-w-[70%] -translate-x-1/2 -translate-y-1/2 flex-col justify-between gap-1 rounded-md border-2 border-primary-6 bg-primary-9 px-3 py-1.5 shadow-md shadow-primary-8 transition-all ${showDialog ? 'flex' : 'hidden'} `}
      onSubmit={async (e) => {
        e.preventDefault()
        const error = await onSubmit(e)
        if (!error) {
          setShowDialog(false)
        }
      }}
    >
      {children}
      <div className="mt-1 flex justify-center gap-4">
        <button className="min-w-20 rounded-md bg-green-600 px-2 py-1 uppercase">{labels[0]}</button>

        <button
          className="rounded-md bg-red-600 px-2 py-1 uppercase"
          onClick={() => {
            setShowDialog(false)
          }}
        >
          {labels[1]}
        </button>
      </div>
    </form>
  )
}
