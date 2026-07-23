import { useState, useEffect, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { getAccessibleColors } from '@/lib/contrast-utils'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
  const brandSecondary = useMemo(
    () =>
      getAccessibleColors(activeClient?.primaryColor || null, activeClient?.secondaryColor || null)
        .secondary,
    [activeClient?.primaryColor, activeClient?.secondaryColor],
  )

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
  const isLoading = !plants && !employees

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
        .lte('date', dateTo)
      if (data) setNonWorkingDays(data)
    }
    fetchNWD()
  }, [activeClient?.id, dateFrom, dateTo, selectedMasterClient])

  const { logs, monthlyGoals } = useDashboardLogs(dateFrom, dateTo, referenceMonth, filteredPlants)
  const { schedules, areas } = useDashboardSchedules(dateFrom, dateTo, filteredPlants)

  const { filteredEmployees } = useMemo(() => {
    if (!employees) return { filteredEmployees: [] }
    const uniqueEmpGroups = new Map<string, any[]>()
    const logReferenceIds = new Set((logs || []).map((l: any) => l.reference_id))

    employees.forEach((e: any) => {
      if (e.status === 'Inativo' && !logReferenceIds.has(e.id)) return
      const regNum = e.registration_number?.trim()
      const name = e.name?.toLowerCase().trim()
      const groupKey = regNum ? `${regNum}-${e.plant_id}` : `${name}-${e.plant_id}`
      if (!uniqueEmpGroups.has(groupKey)) uniqueEmpGroups.set(groupKey, [])
      uniqueEmpGroups.get(groupKey)!.push(e)
    })

    const finalFilteredEmployees: any[] = []
    uniqueEmpGroups.forEach((group) => {
      const activeMembers = group.filter((e) => e.status === 'Ativo')
      if (activeMembers.length > 0) {
        const primaryActive =
          activeMembers.find((am) => logReferenceIds.has(am.id)) || activeMembers[0]
        finalFilteredEmployees.push(primaryActive)
      } else {
        const memberWithLog = group.find((im) => logReferenceIds.has(im.id)) || group[0]
        finalFilteredEmployees.push(memberWithLog)
      }
    })
    return { filteredEmployees: finalFilteredEmployees }
  }, [employees, logs])

  const dashboardData = useDashboardCalculations(
    logs,
    monthlyGoals,
    filteredContracted,
    filteredPlants,
    filteredLocations,
    employees,
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

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-4 lg:space-y-6 pb-12 animate-fade-in">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 lg:space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
          Dashboard do Gestor
        </h2>
        <p className="text-sm text-muted-foreground">Visão geral do efetivo por período</p>
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
        <Card className="flex flex-col items-center justify-center p-8 sm:p-12 lg:p-16 mt-4 shadow-sm">
          <Building2 className="w-12 h-12 lg:w-16 lg:h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg lg:text-xl font-semibold text-foreground text-center">
            Nenhuma planta selecionada
          </h3>
          <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
            Selecione uma planta para visualizar os dados do dashboard.
          </p>
        </Card>
      ) : activeTab !== ('metas' as any) ? (
        <div className="space-y-4 lg:space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <DashboardMetricsCards
            metrics={dashboardData.metrics}
            activeTab={activeTab}
            logs={dashboardData.activeLogs}
            employees={employees}
            equipment={filteredEquipment}
            selectedPlants={selectedPlants}
            selectedCompanies={selectedCompanies}
          />

          <DashboardAureaAI
            metrics={dashboardData.metrics}
            activeTab={activeTab}
            plantStats={dashboardData.plantStats}
            dailyTrend={dashboardData.dailyTrend}
          />

          {activeTab === 'colaboradores' && (
            <DashboardTrendChart data={dashboardData.dailyTrend} target={absenteeismTarget} />
          )}

          {activeTab === 'equipamentos' && (
            <DashboardEquipmentTrendChart
              data={dashboardData.dailyTrend}
              target={absenteeismTarget}
            />
          )}

          <DashboardPlantSummary
            plantStats={dashboardData.plantStats}
            locationStats={dashboardData.locationStats}
            activeTab={activeTab}
            absenteeismTarget={absenteeismTarget}
            nonWorkingDays={nonWorkingDays}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
          <DashboardDetails
            activeTab={activeTab}
            equipmentStats={dashboardData.equipmentStats}
            collaboratorStats={dashboardData.collaboratorStats}
          />
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-8 sm:p-12 lg:p-16 mt-4 shadow-sm">
          <h3 className="text-lg lg:text-xl font-semibold text-foreground text-center">
            O Book de Metas mudou!
          </h3>
          <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
            O Book de Metas agora é um módulo independente. Acesse-o através do menu lateral ou
            clique no botão abaixo.
          </p>
          <Button asChild className="mt-6">
            <Link to="/gestao-terceiros/metas">Acessar Book de Metas</Link>
          </Button>
        </Card>
      )}
    </div>
  )
}
