import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { Target, Settings2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDashboardLogs } from './hooks/useDashboardLogs'
import { useDashboardCalculations } from './hooks/useDashboardCalculations'
import { useDashboardSchedules } from './hooks/useDashboardSchedules'
import DashboardGoals from './components/DashboardGoals'

export default function BookMetas() {
  const { activeClient, profile } = useAppStore()
  const brandSecondary = activeClient?.secondaryColor || '#1e3a8a'

  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [referenceMonth, setReferenceMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [selectedPlants, setSelectedPlants] = useState<string[]>([])

  const [absenteeismTarget, setAbsenteeismTarget] = useState<number>(() => {
    const saved = localStorage.getItem('aurea_absenteeism_target')
    return saved ? Number(saved) : 4
  })

  useEffect(() => {
    localStorage.setItem('aurea_absenteeism_target', absenteeismTarget.toString())
  }, [absenteeismTarget])

  const { plants, contracted, locations, goals, employees, equipment } = useMasterData()

  const filteredPlants = plants || []
  const filteredContracted = contracted || []
  const filteredLocations = locations || []
  const filteredGoals = goals || []
  const filteredEmployees = employees || []
  const filteredEquipment = equipment || []

  const { logs, monthlyGoals } = useDashboardLogs(dateFrom, dateTo, referenceMonth, filteredPlants)
  const { schedules, areas } = useDashboardSchedules(dateFrom, dateTo, filteredPlants)

  const { metrics, goalsData } = useDashboardCalculations(
    logs,
    monthlyGoals,
    filteredContracted,
    filteredPlants,
    filteredLocations,
    filteredEmployees,
    filteredEquipment,
    filteredGoals,
    selectedPlants,
    [],
    'metas',
    dateFrom,
    dateTo,
    absenteeismTarget,
    schedules,
    areas,
  )

  if (!profile) return null

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 lg:space-y-5 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Target className="w-8 h-8 text-brand-vividBlue" />
          Book de Metas
        </h2>
        <p className="text-muted-foreground text-xs lg:text-sm">
          Acompanhamento consolidado de indicadores operacionais e metas
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-end bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Data Inicial
            </Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 focus-visible:ring-1 focus-visible:ring-brand-vividBlue"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Data Final
            </Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 focus-visible:ring-1 focus-visible:ring-brand-vividBlue"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Mês de Referência (Metas Manuais)
            </Label>
            <Input
              type="month"
              value={referenceMonth}
              onChange={(e) => setReferenceMonth(e.target.value)}
              className="h-9 focus-visible:ring-1 focus-visible:ring-brand-vividBlue"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2">
              <Settings2 className="w-4 h-4" />
              Configurar Metas
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Configuração de Metas (KPIs)</h4>
              <div className="space-y-2">
                <Label htmlFor="abs-target">Meta de Absenteísmo Aceitável (%)</Label>
                <Input
                  id="abs-target"
                  type="number"
                  min="0"
                  step="0.1"
                  value={absenteeismTarget}
                  onChange={(e) => setAbsenteeismTarget(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  O índice ficará verde se for menor ou igual à meta, e vermelho se ultrapassar.
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <DashboardGoals goalsData={goalsData} metrics={metrics} brandSecondary={brandSecondary} />
    </div>
  )
}
