import { DateRange } from 'react-day-picker'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Palette, Filter } from 'lucide-react'
import { Label } from '@/components/ui/label'

interface BIFiltersProps {
  dateRange: DateRange | undefined
  setDateRange: (d: DateRange | undefined) => void
  selectedPlantId: string
  setSelectedPlantId: (id: string) => void
  authorizedPlants: any[]
  colors: { primary: string; secondary: string; tertiary: string }
  setColors: (c: any) => void
}

export function BIFilters({
  dateRange,
  setDateRange,
  selectedPlantId,
  setSelectedPlantId,
  authorizedPlants,
  colors,
  setColors,
}: BIFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground ml-1" />
        <DatePickerWithRange date={dateRange} setDate={setDateRange} className="w-[240px]" />
      </div>

      <div className="w-[1px] h-6 bg-border mx-1" />

      <Select value={selectedPlantId} onValueChange={setSelectedPlantId}>
        <SelectTrigger className="w-[200px] h-10 bg-background shadow-sm">
          <SelectValue placeholder="Todas as Plantas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Plantas</SelectItem>
          {authorizedPlants.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-[1px] h-6 bg-border mx-1" />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 shadow-sm">
            <Palette className="h-4 w-4 mr-2" /> Personalizar Cores
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Paleta de Cores</h4>
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="color-primary" className="text-xs">
                  Cor Principal (Positivos)
                </Label>
                <input
                  id="color-primary"
                  type="color"
                  value={colors.primary}
                  onChange={(e) => setColors({ ...colors, primary: e.target.value })}
                  className="h-8 w-14 rounded cursor-pointer border-0 p-0"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="color-secondary" className="text-xs">
                  Cor Secundária (Negativos)
                </Label>
                <input
                  id="color-secondary"
                  type="color"
                  value={colors.secondary}
                  onChange={(e) => setColors({ ...colors, secondary: e.target.value })}
                  className="h-8 w-14 rounded cursor-pointer border-0 p-0"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="color-tertiary" className="text-xs">
                  Cor Terciária (Neutros)
                </Label>
                <input
                  id="color-tertiary"
                  type="color"
                  value={colors.tertiary}
                  onChange={(e) => setColors({ ...colors, tertiary: e.target.value })}
                  className="h-8 w-14 rounded cursor-pointer border-0 p-0"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
