import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  const [inputValue, setInputValue] = useState(String(currentPage))

  useEffect(() => {
    setInputValue(String(currentPage))
  }, [currentPage])

  const handleJump = useCallback(() => {
    const parsed = parseInt(inputValue, 10)
    if (isNaN(parsed) || parsed < 1) {
      onPageChange(1)
      setInputValue('1')
    } else if (parsed > totalPages) {
      onPageChange(totalPages)
      setInputValue(String(totalPages))
    } else if (parsed !== currentPage) {
      onPageChange(parsed)
    } else {
      setInputValue(String(currentPage))
    }
  }, [inputValue, totalPages, currentPage, onPageChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleJump()
      e.currentTarget.blur()
    }
  }

  const handleBlur = () => {
    if (inputValue !== String(currentPage)) {
      handleJump()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setInputValue(val)
  }

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1)
  }

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1)
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          disabled={currentPage <= 1}
          className="h-8 w-8 shrink-0"
          aria-label="Voltar para página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Página
          </span>
          <Input
            type="text"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-14 h-8 text-center px-1"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={`Ir para página, de 1 a ${totalPages}`}
            maxLength={4}
          />
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            de {totalPages}
          </span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          className="h-8 w-8 shrink-0"
          aria-label="Avançar para próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
