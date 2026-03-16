import { useState } from 'react'
import { cn } from '@/lib/utils'
import { GripHorizontal } from 'lucide-react'

interface DraggableWidgetProps {
  id: string
  title: string
  children: React.ReactNode
  onReorder: (sourceId: string, targetId: string) => void
}

export function DraggableWidget({ id, title, children, onReorder }: DraggableWidgetProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isOver, setIsOver] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', id)
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(true)
  }

  const handleDragLeave = () => {
    setIsOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    const sourceId = e.dataTransfer.getData('text/plain')
    if (sourceId && sourceId !== id) {
      onReorder(sourceId, id)
    }
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={() => setIsDragging(false)}
      className={cn(
        'bg-card rounded-xl border shadow-sm flex flex-col overflow-hidden transition-all duration-200 h-full',
        isDragging ? 'opacity-50 scale-95 border-primary/50' : 'opacity-100 scale-100',
        isOver && !isDragging ? 'border-primary border-dashed bg-primary/5' : 'border-border',
      )}
    >
      <div className="bg-muted/30 border-b border-border px-4 py-3 flex items-center justify-between cursor-move hover:bg-muted/50 transition-colors">
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        <GripHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="p-4 flex-1 h-full">{children}</div>
    </div>
  )
}
