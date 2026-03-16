import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { Building2 } from 'lucide-react'
import { useDashboardLogs } from './hooks/useDashboardLogs'
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
  const [activeTab, setActiveTab] = useState<'colaboradores' | 'equipamentos' | 'metas'>(
    'colaboradores',
  )

  const { plants, contracted, locations, goals, employees, equipment } = useMasterData()
  const { logs, monthlyGoals } = useDashboardLogs(dateFrom, dateTo, referenceMonth, plants)

  const { metrics, plantStats, locationStats, equipmentStats, collaboratorStats, goalsData } =
    useDashboardCalculations(
      logs,
      monthlyGoals,
      contracted,
      plants,
      locations,
      employees,
      equipment,
      goals,
      selectedPlants,
      activeTab,
      dateFrom,
      dateTo,
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
        selectedPlants={selectedPlants}
        setSelectedPlants={setSelectedPlants}
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

      {selectedPlants.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 lg:p-16 mt-4 bg-card rounded-xl border border-border shadow-sm">
          <Building2 className="w-12 h-12 lg:w-16 lg:h-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg lg:text-xl font-bold text-foreground">
            Nenhuma planta selecionada
          </h3>
          <p className="text-muted-foreground text-xs lg:text-sm mt-2 text-center max-w-md">
            Selecione uma planta.
          </p>
        </div>
      ) : activeTab !== 'metas' ? (
        <div className="space-y-4 lg:space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <DashboardMetricsCards metrics={metrics} activeTab={activeTab} />
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
