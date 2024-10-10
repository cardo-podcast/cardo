import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { grip } from '../Icons'
import { ReactNode } from 'react'

export default function SortEpisodeGrip({ id, children }: { id: number; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div className="flex cursor-default rounded-md transition-colors hover:bg-primary-8" style={style} {...attributes}>
      <div ref={setNodeRef} className="flex items-center" {...listeners}>
        <div className={`w-6 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}>{grip}</div>
      </div>
      {children}
    </div>
  )
}
