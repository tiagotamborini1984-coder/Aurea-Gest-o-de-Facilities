import { useState, useEffect, useMemo, useRef } from 'react'
import { format, subDays } from 'date-fns'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { usePersistentScreenFilters } from '@/hooks/use-persistent-screen-filters'
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
import DashboardSnapshotWriter from '@/components/DashboardSnapshotWriter'
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

  const getCuiabaDateStr = (date: Date = new Date()) => {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Cuiaba',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date)
      const y = parts.find((p) => p.type === 'year')?.value
      const m = parts.find((p) => p.type === 'month')?.value
      const d = parts.find((p) => p.type === 'day')?.value
      if (y && m && d) return `${y}-${m}-${d}`
    } catch {
      // fallback
    }
    return format(date, 'yyyy-MM-dd')
  }

  // Filtros persistidos por tela: sobrevivem a recarga (F5), troca de janela e remount.
  const {
    values: { dateFrom, dateTo, referenceMonth, selectedPlants, selectedCompanies, activeTab },
    set: setPersistedFilters,
  } = usePersistentScreenFilters('gestao-terceiros:dashboard-gestor', {
    dateFrom: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    dateTo: getCuiabaDateStr(new Date()),
    referenceMonth: getCuiabaDateStr(new Date()).substring(0, 7),
    selectedPlants: [] as string[],
    selectedCompanies: [] as string[],
    activeTab: 'colaboradores' as 'colaboradores' | 'equipamentos',
  })

  // Wrappers tolerantes a Dispatch<SetStateAction>: o DashboardFilters usa o
  // formato funcional (setSelectedPlants((prev) => ...)) — gravar o updater
  // direto como valor do filtro derrubava a tela ao aplicar/remover filtro.
  const setDateFrom = (v: string | ((prev: string) => string)) =>
    setPersistedFilters((prev) => ({
      dateFrom: typeof v === 'function' ? v(prev.dateFrom) : v,
    }))
  const setDateTo = (v: string | ((prev: string) => string)) =>
    setPersistedFilters((prev) => ({ dateTo: typeof v === 'function' ? v(prev.dateTo) : v }))
  const setReferenceMonth = (v: string | ((prev: string) => string)) =>
    setPersistedFilters((prev) => ({
      referenceMonth: typeof v === 'function' ? v(prev.referenceMonth) : v,
    }))
  const setSelectedPlants = (v: string[] | ((prev: string[]) => string[])) =>
    setPersistedFilters((prev) => ({
      selectedPlants: Array.isArray(v) ? v : v(prev.selectedPlants),
    }))
  const setSelectedCompanies = (v: string[] | ((prev: string[]) => string[])) =>
    setPersistedFilters((prev) => ({
      selectedCompanies: Array.isArray(v) ? v : v(prev.selectedCompanies),
    }))
  const setActiveTab = (v: 'colaboradores' | 'equipamentos') =>
    setPersistedFilters({ activeTab: v })

  const [absenteeismTarget, setAbsenteeismTarget] = useState<number>(() => {
    const saved = localStorage.getItem('aurea_absenteeism_target')
    return saved ? Number(saved) : 4
  })

  useEffect(() => {
    localStorage.setItem('aurea_absenteeism_target', absenteeismTarget.toString())
  }, [absenteeismTarget])

  const { plants, contracted, locations, goals, employees, equipment } = useMasterData()
  const activeClientId = activeClient?.id || (profile as any)?.client_id

  // "hasLoadedOnce" só é declarado depois do hook de logs; placeholder vira
  // estado de "primeira carga em andamento" via render abaixo.

  const filteredPlants = plants || []
  const filteredContracted = contracted || []
  const filteredLocations = locations || []
  const filteredGoals = goals || []
  const filteredEquipment = equipment || []
  const isLoading = !plants && !employees

  const [nonWorkingDays, setNonWorkingDays] = useState<any[]>([])

  useEffect(() => {
    if (!selectedMasterClient || selectedMasterClient === 'all') return
    // Troca de cliente (Master): volta ao padrão para não misturar dados de outro cliente.
    setPersistedFilters({
      selectedPlants: [],
      selectedCompanies: [],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMasterClient])

  useEffect(() => {
    async function fetchNWD() {
      if (!activeClient?.id) return
      const allNwd: any[] = []
      const pageSize = 1000
      let page = 0
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('plant_non_working_days')
          .select('*')
          .eq('client_id', activeClient.id)
          .gte('date', dateFrom)
          .lte('date', dateTo)
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) {
          console.error('Erro ao buscar dias não úteis:', error.message)
          hasMore = false
          break
        }

        if (data && data.length > 0) {
          allNwd.push(...data)
          page++
        }

        if (!data || data.length < pageSize) {
          hasMore = false
        }
      }

      setNonWorkingDays(allNwd)
    }

    fetchNWD()
  }, [activeClient?.id, dateFrom, dateTo])

  const safeFilteredPlants = useMemo(
    () => (filteredPlants.length > 0 ? filteredPlants : [{ id: 'none', name: 'Nenhuma' }]),
    [filteredPlants],
  )

  const {
    logs,
    monthlyGoals,
    isLoading: isLogsLoading,
    error: logsError,
    reload: reloadLogs,
  } = useDashboardLogs(dateFrom, dateTo, referenceMonth, safeFilteredPlants)

  const { schedules, areas } = useDashboardSchedules(dateFrom, dateTo, safeFilteredPlants)

  // Primeira carga concluída: depois dela o dashboard NÃO volta mais para o
  // skeleton quando um filtro dispara novo fetch — era isso que fazia a tela
  // "apagar e voltar" a cada filtro aplicado (isLogsLoading pisca true/false).
  const hasLoadedOnceRef = useRef(false)
  if (!isLogsLoading) hasLoadedOnceRef.current = true
  const showSkeleton = (isLoading || isLogsLoading) && !hasLoadedOnceRef.current

  const { filteredEmployees } = useMemo(() => {
    if (!employees) return { filteredEmployees: [] }
    const uniqueEmpGroups = new Map<string, any[]>()
    const logReferenceIds = new Set((logs || []).map((l: any) => l.reference_id))

    employees.forEach((e: any) => {
      const regNum = e.registration_number?.trim()
      const name = e.name?.toLowerCase().trim()
      const groupKey = regNum ? `${regNum}-${e.plant_id}` : `${name}-${e.plant_id}`
      if (!uniqueEmpGroups.has(groupKey)) uniqueEmpGroups.set(groupKey, [])
      uniqueEmpGroups.get(groupKey)!.push(e)
    })

    const finalFilteredEmployees: any[] = []
    uniqueEmpGroups.forEach((group) => {
      // Sort: most recent version by reference_month DESC, then created_at DESC
      group.sort((a, b) => {
        const timeDiff =
          new Date(b.reference_month || 0).getTime() - new Date(a.reference_month || 0).getTime()
        if (timeDiff !== 0) return timeDiff
        const createdDiff =
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        if (createdDiff !== 0) return createdDiff
        const aActive = a.status?.trim().toUpperCase() === 'ATIVO' ? 0 : 1
        const bActive = b.status?.trim().toUpperCase() === 'ATIVO' ? 0 : 1
        return aActive - bActive
      })

      const best = group[0]
      const bestIsActive = best.status?.trim().toUpperCase() === 'ATIVO'
      if (bestIsActive) {
        finalFilteredEmployees.push(best)
      } else {
        // If inactive, only keep if there's historical log in this period for filtering
        const memberWithLog = group.find((m) => logReferenceIds.has(m.id))
        if (memberWithLog) {
          finalFilteredEmployees.push(memberWithLog)
        }
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

  if (showSkeleton) {
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
        <p className="text-sm text-muted-foreground">
          Acompanhe os indicadores de Terceiros por planta e período.
        </p>
      </div>

      <DashboardFilters
        plants={filteredPlants}
        employees={employees || []}
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

      <DashboardMetricsCards
        metrics={dashboardData.metrics}
        activeTab={activeTab}
        logs={logs}
        employees={filteredEmployees}
        equipment={filteredEquipment}
        selectedPlants={selectedPlants}
        selectedCompanies={selectedCompanies}
      />

      <DashboardPlantSummary
        plantStats={dashboardData.plantStats}
        locationStats={dashboardData.locationStats}
        activeTab={activeTab}
        absenteeismTarget={absenteeismTarget}
        nonWorkingDays={nonWorkingDays}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />

      <DashboardTrendChart data={dashboardData.dailyTrend} target={absenteeismTarget} />
      <DashboardEquipmentTrendChart data={dashboardData.dailyTrend} target={absenteeismTarget} />

      <DashboardSnapshotWriter
        metrics={dashboardData.metrics}
        plantStats={dashboardData.plantStats}
        dateFrom={dateFrom}
        dateTo={dateTo}
        activeTab={activeTab}
        clientId={activeClientId}
      />

      <DashboardDetails
        activeTab={activeTab}
        equipmentStats={dashboardData.equipmentStats}
        collaboratorStats={dashboardData.collaboratorStats}
      />

      <DashboardAureaAI
        metrics={dashboardData.metrics}
        activeTab={activeTab}
        plantStats={dashboardData.plantStats}
      />
    </div>
  )
}
