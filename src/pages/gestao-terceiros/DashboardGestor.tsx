import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { Building2, Settings2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDashboardLogs } from './hooks/useDashboardLogs'
import DashboardTrendChart from './components/DashboardTrendChart'
import { useDashboardCalculations } from './hooks/useDashboardCalculations'
import DashboardFilters from './components/DashboardFilters'
import DashboardMetricsCards from './components/DashboardMetricsCards'
import DashboardPlantSummary from './components/DashboardPlantSummary'
import DashboardDetails from './components/DashboardDetails'
import DashboardGoals from './components/DashboardGoals'

export default function DashboardGestor() {
  const { activeClient, profile } = useAppStore()
  const brandSecondary = activeClient?.secondaryColor || '#1e3a8a'

  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [referenceMonth, setReferenceMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [selectedPlants, setSelectedPlants] = useState<string[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'colaboradores' | 'equipamentos' | 'metas'>(
    'colaboradores',
  )
  const [absenteeismTarget, setAbsenteeismTarget] = useState<number>(() => {
    const saved = localStorage.getItem('aurea_absenteeism_target')
    return saved ? Number(saved) : 4
  })

  useEffect(() => {
    localStorage.setItem('aurea_absenteeism_target', absenteeismTarget.toString())
  }, [absenteeismTarget])

  const { plants, contracted, locations, goals, employees, equipment } = useMasterData()
  const { logs, monthlyGoals } = useDashboardLogs(dateFrom, dateTo, referenceMonth, plants)

  const {
    metrics,
    plantStats,
    locationStats,
    equipmentStats,
    collaboratorStats,
    goalsData,
    dailyTrend,
  } = useDashboardCalculations(
    logs,
    monthlyGoals,
    contracted,
    plants,
    locations,
    employees,
    equipment,
    goals,
    selectedPlants,
    selectedCompanies,
    activeTab,
    dateFrom,
    dateTo,
    absenteeismTarget,
  )

  if (!profile) return null

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 lg:space-y-5 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
          Dashboard do Gestor
        </h2>
        <p className="text-muted-foreground text-xs lg:text-sm">
          Visão geral do efetivo por período
        </p>
      </div>

      <DashboardFilters
        plants={plants}
        employees={employees}
        selectedPlants={selectedPlants}
        setSelectedPlants={setSelectedPlants}
        selectedCompanies={selectedCompanies}
        setSelectedCompanies={setSelectedCompanies}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        referenceMonth={referenceMonth}
        setReferenceMonth={setReferenceMonth}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        brandSecondary={brandSecondary}
      />

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

      {selectedPlants.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 lg:p-16 mt-4 bg-card rounded-xl border border-border shadow-sm">
          <Building2 className="w-12 h-12 lg:w-16 lg:h-16 text-slate-400 mb-4" />
          <h3 className="text-lg lg:text-xl font-bold text-foreground">
            Nenhuma planta selecionada
          </h3>
          <p className="text-slate-600 text-xs lg:text-sm mt-2 text-center max-w-md">
            Selecione uma planta.
          </p>
        </div>
      ) : activeTab !== 'metas' ? (
        <div className="space-y-4 lg:space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <DashboardMetricsCards
            metrics={metrics}
            activeTab={activeTab}
            logs={logs}
            employees={employees}
            equipment={equipment}
            selectedPlants={selectedPlants}
            selectedCompanies={selectedCompanies}
          />

          {activeTab === 'colaboradores' && (
            <DashboardTrendChart data={dailyTrend} target={absenteeismTarget} />
          )}

          <DashboardPlantSummary plantStats={plantStats} locationStats={locationStats} />
          <DashboardDetails
            activeTab={activeTab}
            equipmentStats={equipmentStats}
            collaboratorStats={collaboratorStats}
          />
        </div>
      ) : (
        <DashboardGoals goalsData={goalsData} metrics={metrics} brandSecondary={brandSecondary} />
      )}
    </div>
  )
}
