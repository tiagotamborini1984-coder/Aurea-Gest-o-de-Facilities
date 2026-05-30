import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Eraser } from 'lucide-react'

interface SignaturePadProps {
  onChange: (signature: string | null) => void
  value?: string | null
  label?: string
}

export function SignaturePad({ onChange, value, label = 'Assinatura' }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  useEffect(() => {
    if (value && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        const img = new Image()
        img.src = value
        img.onload = () => {
          ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
          ctx.drawImage(img, 0, 0)
        }
      }
    }
  }, [value])

  const getCoordinates = (canvas: HTMLCanvasElement, e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    }
  }

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(canvas, e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000'
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(canvas, e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      const canvas = canvasRef.current
      if (canvas) {
        onChange(canvas.toDataURL('image/png'))
      }
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      onChange(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div className="border border-input rounded-md overflow-hidden bg-background">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="w-full h-[150px] cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => {
            e.preventDefault()
            startDrawing(e)
          }}
          onTouchMove={(e) => {
            e.preventDefault()
            draw(e)
          }}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          className="text-muted-foreground h-8"
        >
          <Eraser className="w-4 h-4 mr-2" />
          Limpar
        </Button>
      </div>
    </div>
  )
}
