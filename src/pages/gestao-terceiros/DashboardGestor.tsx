import { useState, useEffect, useMemo } from 'react'
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
import DashboardEquipmentTrendChart from './components/DashboardEquipmentTrendChart'
import { useDashboardCalculations } from './hooks/useDashboardCalculations'
import DashboardFilters from './components/DashboardFilters'
import DashboardMetricsCards from './components/DashboardMetricsCards'
import DashboardPlantSummary from './components/DashboardPlantSummary'
import DashboardDetails from './components/DashboardDetails'
import DashboardAureaAI from './components/DashboardAureaAI'
import { useDashboardSchedules } from './hooks/useDashboardSchedules'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'

export default function DashboardGestor() {
  const { activeClient, profile, selectedMasterClient } = useAppStore()
  const brandSecondary = activeClient?.secondaryColor || '#1e3a8a'

  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [referenceMonth, setReferenceMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [selectedPlants, setSelectedPlants] = useState<string[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'colaboradores' | 'equipamentos'>('colaboradores')
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
  const filteredEquipment = equipment || []

  const [nonWorkingDays, setNonWorkingDays] = useState<any[]>([])

  useEffect(() => {
    setSelectedPlants([])
    setSelectedCompanies([])
  }, [selectedMasterClient])

  useEffect(() => {
    async function fetchNWD() {
      if (!activeClient?.id) return
      const { data } = await supabase
        .from('plant_non_working_days')
        .select('*')
        .eq('client_id', activeClient.id)
        .gte('date', dateFrom)
        .lte('date', dateTo + 'T23:59:59.999Z')

      if (data) {
        setNonWorkingDays(data)
      }
    }
    fetchNWD()
  }, [activeClient?.id, dateFrom, dateTo, selectedMasterClient])

  const { logs, monthlyGoals } = useDashboardLogs(dateFrom, dateTo, referenceMonth, filteredPlants)
  const { schedules, areas } = useDashboardSchedules(dateFrom, dateTo, filteredPlants)

  const { filteredEmployees, mappedLogs } = useMemo(() => {
    if (!employees) return { filteredEmployees: [], mappedLogs: logs || [] }

    const uniqueEmpMap = new Map()
    const idToUniqueKey = new Map()
    const logReferenceIds = new Set((logs || []).map((l: any) => l.reference_id))

    employees.forEach((e: any) => {
      const regNum = e.registration_number?.trim()
      const name = e.name?.toLowerCase().trim()
      const key = regNum ? `${regNum}-${e.plant_id}` : `${name}-${e.plant_id}`

      idToUniqueKey.set(e.id, key)
    })

    employees.forEach((e: any) => {
      if (e.status === 'Inativo' && !logReferenceIds.has(e.id)) return

      const key = idToUniqueKey.get(e.id)

      if (!uniqueEmpMap.has(key)) {
        uniqueEmpMap.set(key, e)
      } else {
        const existing = uniqueEmpMap.get(key)
        const eHasLog = logReferenceIds.has(e.id)
        const exHasLog = logReferenceIds.has(existing.id)

        if (eHasLog && !exHasLog) {
          uniqueEmpMap.set(key, e)
        } else if (e.status === 'Ativo' && existing.status !== 'Ativo') {
          uniqueEmpMap.set(key, e)
        }
      }
    })

    const finalFilteredEmployees = Array.from(uniqueEmpMap.values())

    const processedLogs = (logs || []).map((l: any) => {
      if (l.type === 'staff') {
        const key = idToUniqueKey.get(l.reference_id)
        const keptEmp = uniqueEmpMap.get(key)
        if (keptEmp) {
          return { ...l, reference_id: keptEmp.id }
        }
      }
      return l
    })

    return { filteredEmployees: finalFilteredEmployees, mappedLogs: processedLogs }
  }, [employees, logs])

  const {
    metrics,
    plantStats,
    locationStats,
    equipmentStats,
    collaboratorStats,
    goalsData,
    dailyTrend,
    activeLogs,
  } = useDashboardCalculations(
    mappedLogs,
    monthlyGoals,
    filteredContracted,
    filteredPlants,
    filteredLocations,
    filteredEmployees,
    filteredEquipment,
    filteredGoals,
    selectedPlants,
    selectedCompanies,
    activeTab,
    dateFrom,
    dateTo,
    absenteeismTarget,
    schedules,
    areas,
    nonWorkingDays,
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
        plants={filteredPlants}
        employees={filteredEmployees}
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

      {selectedPlants.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 lg:p-16 mt-4 bg-card rounded-xl border border-border shadow-sm">
          <Building2 className="w-12 h-12 lg:w-16 lg:h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg lg:text-xl font-bold text-foreground">
            Nenhuma planta selecionada
          </h3>
          <p className="text-muted-foreground text-xs lg:text-sm mt-2 text-center max-w-md">
            Selecione uma planta.
          </p>
        </div>
      ) : activeTab !== ('metas' as any) ? (
        <div className="space-y-4 lg:space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <DashboardMetricsCards
            metrics={metrics}
            activeTab={activeTab}
            logs={activeLogs}
            employees={filteredEmployees}
            equipment={filteredEquipment}
            selectedPlants={selectedPlants}
            selectedCompanies={selectedCompanies}
          />

          <DashboardAureaAI
            metrics={metrics}
            activeTab={activeTab}
            plantStats={plantStats}
            dailyTrend={dailyTrend}
          />

          {activeTab === 'colaboradores' && (
            <DashboardTrendChart data={dailyTrend} target={absenteeismTarget} />
          )}

          {activeTab === 'equipamentos' && (
            <DashboardEquipmentTrendChart data={dailyTrend} target={absenteeismTarget} />
          )}

          <DashboardPlantSummary
            plantStats={plantStats}
            locationStats={locationStats}
            activeTab={activeTab}
            absenteeismTarget={absenteeismTarget}
            nonWorkingDays={nonWorkingDays}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
          <DashboardDetails
            activeTab={activeTab}
            equipmentStats={equipmentStats}
            collaboratorStats={collaboratorStats}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 lg:p-16 mt-4 bg-card rounded-xl border border-border shadow-sm">
          <h3 className="text-lg lg:text-xl font-bold text-foreground">O Book de Metas mudou!</h3>
          <p className="text-muted-foreground text-xs lg:text-sm mt-2 text-center max-w-md">
            O Book de Metas agora é um módulo independente. Acesse-o através do menu lateral ou
            clique no botão abaixo.
          </p>
          <Button asChild className="mt-6">
            <Link to="/gestao-terceiros/metas">Acessar Book de Metas</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
