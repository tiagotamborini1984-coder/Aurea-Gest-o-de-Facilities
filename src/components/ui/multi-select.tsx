import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Option {
  label: string
  value: string
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Selecione...',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {selected.length > 0 ? `${selected.length} selecionado(s)` : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <ScrollArea className="h-[200px]">
          <div className="p-1">
            {options.map((opt) => (
              <div
                key={opt.value}
                className="flex items-center gap-2 p-2 rounded-sm hover:bg-accent cursor-pointer text-sm"
                onClick={() => toggle(opt.value)}
              >
                <div
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-sm border',
                    selected.includes(opt.value) ? 'bg-primary border-primary' : 'border-input',
                  )}
                >
                  {selected.includes(opt.value) && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                {opt.label}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
