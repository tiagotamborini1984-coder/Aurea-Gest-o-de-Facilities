import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Wrench,
  Target,
  FileText,
  ClipboardCheck,
  Building2,
  MapPin,
  XCircle,
  TrendingDown,
  ChevronRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { format, subDays, eachDayOfInterval } from 'date-fns'
import { useAppStore } from '@/store/AppContext'
import { cn } from '@/lib/utils'

export default function DashboardGestor() {
  const { activeClient } = useAppStore()
  const brandPrimary = activeClient?.primaryColor || '#1f2937'
  const brandSecondary = activeClient?.secondaryColor || '#1e3a8a'

  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [referenceMonth, setReferenceMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [selectedPlants, setSelectedPlants] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'colaboradores' | 'equipamentos' | 'metas'>(
    'colaboradores',
  )

  const { plants, contracted, locations, goals, employees, equipment } = useMasterData()
  const [logs, setLogs] = useState<any[]>([])
  const [monthlyGoals, setMonthlyGoals] = useState<any[]>([])

  useEffect(() => {
    const fetchLogs = async () => {
      if (plants.length === 0) return
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .gte('date', dateFrom)
        .lte('date', dateTo)
      setLogs(data || [])
    }
    fetchLogs()
  }, [dateFrom, dateTo, plants])

  useEffect(() => {
    const fetchGoals = async () => {
      if (plants.length === 0) return
      const mFrom = `${referenceMonth}-01`
      const y = parseInt(referenceMonth.split('-')[0])
      const m = parseInt(referenceMonth.split('-')[1])
      const lastDay = new Date(y, m, 0).getDate()
      const mTo = `${referenceMonth}-${lastDay}`

      const { data: mg } = await supabase
        .from('monthly_goals_data')
        .select('*')
        .gte('reference_month', mFrom)
        .lte('reference_month', mTo)
      setMonthlyGoals(mg || [])
    }
    fetchGoals()
  }, [referenceMonth, plants])

  const togglePlant = (id: string) => {
    setSelectedPlants((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  const toggleAllPlants = () => {
    if (selectedPlants.length === plants.length) {
      setSelectedPlants([])
    } else {
      setSelectedPlants(plants.map((p) => p.id))
    }
  }

  // Calculate Metrics
  const { metrics, plantStats, locationStats, equipmentStats, collaboratorStats } = useMemo(() => {
    const validPlants = selectedPlants
    const filteredLogs = logs.filter(
      (l) => validPlants.includes(l.plant_id) && l.date >= dateFrom && l.date <= dateTo,
    )

    const typeLog = activeTab === 'colaboradores' ? 'staff' : 'equipment'
    const typeCont = activeTab === 'colaboradores' ? 'colaborador' : 'equipamento'

    const dFrom = new Date(`${dateFrom}T12:00:00Z`)
    const dTo = new Date(`${dateTo}T12:00:00Z`)
    const daysIntervalArray =
      dFrom <= dTo
        ? eachDayOfInterval({ start: dFrom, end: dTo }).map((d) => format(d, 'yyyy-MM-dd'))
        : []
    const totalPeriodDays = Math.max(1, daysIntervalArray.length)

    const activeLogs = filteredLogs.filter((l) => l.type === typeLog)

    const avgLancado = activeLogs.length / totalPeriodDays
    const avgPresente = activeLogs.filter((l) => l.status).length / totalPeriodDays
    const avgAusente = activeLogs.filter((l) => !l.status).length / totalPeriodDays

    const contratado = contracted
      .filter((c) => c.type === typeCont && validPlants.includes(c.plant_id))
      .reduce((a, b) => a + b.quantity, 0)

    const absenteismo =
      contratado > 0 ? Math.max(0, ((contratado - avgPresente) / contratado) * 100) : 0

    const formatStr = (num: number) => (Number.isInteger(num) ? num.toString() : num.toFixed(1))

    // Plant Breakdowns
    const pStats = plants
      .filter((p) => validPlants.includes(p.id))
      .map((plant) => {
        const pLogs = activeLogs.filter((l) => l.plant_id === plant.id)
        const pPres = pLogs.filter((l) => l.status).length / totalPeriodDays
        const pAbs = pLogs.filter((l) => !l.status).length / totalPeriodDays
        const pCont = contracted
          .filter((c) => c.plant_id === plant.id && c.type === typeCont)
          .reduce((sum, c) => sum + c.quantity, 0)
        const pRate = pCont > 0 ? ((pCont - pPres) / pCont) * 100 : 0
        return {
          id: plant.id,
          name: plant.name,
          presentes: formatStr(pPres),
          ausentes: formatStr(pAbs),
          contratado: pCont,
          absenteismo: Math.max(0, pRate),
        }
      })

    // Location Breakdowns
    const lStats = locations
      .filter((loc) => validPlants.includes(loc.plant_id))
      .map((loc) => {
        const empIds = employees.filter((e) => e.location_id === loc.id).map((e) => e.id)
        const lLogs = activeLogs.filter((l) => empIds.includes(l.reference_id))
        const lPres = lLogs.filter((l) => l.status).length / totalPeriodDays
        const lAbs = lLogs.filter((l) => !l.status).length / totalPeriodDays
        const lCont = contracted
          .filter((c) => c.location_id === loc.id && c.type === typeCont)
          .reduce((sum, c) => sum + c.quantity, 0)
        const lRate = lCont > 0 ? ((lCont - lPres) / lCont) * 100 : 0
        return {
          id: loc.id,
          name: loc.name,
          plantName: plants.find((p) => p.id === loc.plant_id)?.name,
          presentes: formatStr(lPres),
          ausentes: formatStr(lAbs),
          contratado: lCont,
          absenteismo: Math.max(0, lRate),
        }
      })
      .filter((l) => l.contratado > 0 || parseFloat(l.presentes) > 0)

    // Equipment Specific Stats
    let eqStats: any[] = []
    if (activeTab === 'equipamentos') {
      const eqList = equipment.filter((e) => validPlants.includes(e.plant_id))

      eqStats = eqList
        .map((eq) => {
          const eqContratado =
            contracted
              .filter((c) => c.equipment_id === eq.id && c.type === 'equipamento')
              .reduce((sum, c) => sum + c.quantity, 0) || eq.quantity

          const eqLogs = logs
            .filter((l) => l.type === 'equipment' && l.reference_id === eq.id)
            .sort((a, b) => a.date.localeCompare(b.date))

          const history = eqLogs.map((log) => ({ date: log.date, status: log.status }))
          let presCount = eqLogs.filter((l) => l.status).length
          let absCount = eqLogs.filter((l) => !l.status).length

          const mediaPresenca = (presCount / totalPeriodDays) * eqContratado
          const mediaFalta = (absCount / totalPeriodDays) * eqContratado
          const taxaDisp = eqContratado > 0 ? (mediaPresenca / eqContratado) * 100 : 0

          return {
            id: eq.id,
            name: eq.name,
            contratado: eqContratado,
            mediaPresenca,
            mediaFalta,
            taxaDisp,
            history,
          }
        })
        .filter((eq) => eq.history.length > 0 || eq.contratado > 0)
    }

    // Collaborator Specific Stats
    let colStats: any[] = []
    if (activeTab === 'colaboradores') {
      const empList = employees.filter((e) => validPlants.includes(e.plant_id))
      colStats = empList
        .map((emp) => {
          const empLogs = logs
            .filter((l) => l.type === 'staff' && l.reference_id === emp.id)
            .sort((a, b) => a.date.localeCompare(b.date))

          const history = empLogs.map((log) => ({ date: log.date, status: log.status }))
          const presCount = empLogs.filter((l) => l.status).length
          const absCount = empLogs.filter((l) => !l.status).length

          return {
            id: emp.id,
            name: emp.name,
            presencas: presCount,
            faltas: absCount,
            history,
            location: locations.find((l) => l.id === emp.location_id)?.name || 'N/A',
          }
        })
        .filter((c) => c.history.length > 0)
    }

    return {
      metrics: {
        lancado: formatStr(avgLancado),
        presente: formatStr(avgPresente),
        ausente: formatStr(avgAusente),
        contratado,
        absenteismo,
      },
      plantStats: pStats,
      locationStats: lStats,
      equipmentStats: eqStats,
      collaboratorStats: colStats,
    }
  }, [
    logs,
    contracted,
    selectedPlants,
    plants,
    activeTab,
    dateFrom,
    dateTo,
    employees,
    locations,
    equipment,
  ])

  const equipDisp = Math.max(0, 100 - metrics.absenteismo)

  const getGoalsData = () => {
    let sum = 0
    let count = 0

    const absAchieved = metrics.absenteismo < 4 ? 100 : 0
    sum += absAchieved
    count++

    sum += equipDisp
    count++

    const validPlants = selectedPlants.length > 0 ? selectedPlants : plants.map((p) => p.id)

    const manualGoals = goals
      .filter((g) => g.is_active)
      .map((g) => {
        const gData = monthlyGoals.filter(
          (m) => m.goal_id === g.id && validPlants.includes(m.plant_id),
        )
        const avg =
          gData.length > 0 ? gData.reduce((a, b) => a + Number(b.value), 0) / gData.length : null
        if (avg !== null) {
          sum += avg
          count++
        }
        return { ...g, avg }
      })

    const notaGeral = count > 0 ? (sum / count).toFixed(1) : '0.0'

    return { absAchieved, equipDisp, manualGoals, notaGeral }
  }

  const goalsData = getGoalsData()

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

      {/* 1. Top Section: Plant Selector */}
      <Card className="shadow-subtle border-border bg-card">
        <CardHeader className="py-3 px-4 lg:px-6 bg-muted/30 border-b border-border">
          <CardTitle className="text-xs lg:text-sm font-semibold flex items-center gap-2 text-foreground/90">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Seleção de Plantas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 lg:px-6">
          <div className="flex flex-wrap items-center gap-4 lg:gap-6">
            <div className="flex items-center space-x-2 bg-background border border-border px-3 py-1.5 rounded-md shadow-sm">
              <Checkbox
                id="all-plants"
                checked={selectedPlants.length > 0 && selectedPlants.length === plants.length}
                onCheckedChange={toggleAllPlants}
              />
              <label
                htmlFor="all-plants"
                className="text-xs lg:text-sm font-medium leading-none cursor-pointer"
              >
                Todas as plantas
              </label>
            </div>
            {plants.map((p) => (
              <div key={p.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`plant-${p.id}`}
                  checked={selectedPlants.includes(p.id)}
                  onCheckedChange={() => togglePlant(p.id)}
                />
                <label
                  htmlFor={`plant-${p.id}`}
                  className="text-xs lg:text-sm text-muted-foreground leading-none cursor-pointer hover:text-foreground transition-colors"
                >
                  {p.name}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Middle Section: Dates & Tabs */}
      <Card className="shadow-subtle border-border overflow-hidden rounded-xl bg-card">
        <CardContent className="p-0 flex flex-col xl:flex-row divide-y border-border xl:divide-y-0 xl:divide-x">
          {/* Dates */}
          <div className="flex gap-4 items-center p-3 lg:p-4 xl:px-6 bg-muted/20">
            <div className="space-y-1.5">
              <Label className="text-[10px] lg:text-xs text-muted-foreground uppercase tracking-wider">
                De
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[130px] lg:w-[140px] h-8 lg:h-9 text-xs lg:text-sm bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] lg:text-xs text-muted-foreground uppercase tracking-wider">
                Até
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[130px] lg:w-[140px] h-8 lg:h-9 text-xs lg:text-sm bg-background border-border"
              />
            </div>
            {activeTab === 'metas' && (
              <div className="space-y-1.5 ml-2 lg:ml-4 border-l border-border pl-4">
                <Label className="text-[10px] lg:text-xs text-muted-foreground uppercase tracking-wider">
                  Mês Ref.
                </Label>
                <Input
                  type="month"
                  value={referenceMonth}
                  onChange={(e) => setReferenceMonth(e.target.value)}
                  className="w-[140px] lg:w-[150px] h-8 lg:h-9 text-xs lg:text-sm bg-background border-border"
                />
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex-1 flex gap-2 p-3 lg:p-4 xl:px-6 bg-muted/20 justify-start xl:justify-end items-center overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('colaboradores')}
              className={cn(
                'flex items-center gap-1.5 lg:gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all border whitespace-nowrap',
                activeTab === 'colaboradores'
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted',
              )}
              style={activeTab === 'colaboradores' ? { backgroundColor: brandSecondary } : {}}
            >
              <Users className="h-3.5 w-3.5 lg:h-4 lg:w-4" /> Colaboradores
            </button>
            <button
              onClick={() => setActiveTab('equipamentos')}
              className={cn(
                'flex items-center gap-1.5 lg:gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all border whitespace-nowrap',
                activeTab === 'equipamentos'
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted',
              )}
              style={activeTab === 'equipamentos' ? { backgroundColor: brandSecondary } : {}}
            >
              <Wrench className="h-3.5 w-3.5 lg:h-4 lg:w-4" /> Equipamentos
            </button>
            <button
              onClick={() => setActiveTab('metas')}
              className={cn(
                'flex items-center gap-1.5 lg:gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all border whitespace-nowrap',
                activeTab === 'metas'
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted',
              )}
              style={activeTab === 'metas' ? { backgroundColor: brandSecondary } : {}}
            >
              <Target className="h-3.5 w-3.5 lg:h-4 lg:w-4" /> Metas
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Empty State vs Main Content */}
      {selectedPlants.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 lg:p-16 mt-4 bg-card rounded-xl border border-border shadow-sm animate-in fade-in">
          <Building2 className="w-12 h-12 lg:w-16 lg:h-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg lg:text-xl font-bold text-foreground">
            Nenhuma planta selecionada
          </h3>
          <p className="text-muted-foreground text-xs lg:text-sm mt-2 text-center max-w-md">
            Por favor, selecione uma ou mais plantas no filtro acima para visualizar os indicadores
            e relatórios do dashboard.
          </p>
        </div>
      ) : activeTab !== 'metas' ? (
        <div className="space-y-4 lg:space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Top Metrics Cards - Optimized for Notebooks */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4">
            <Card className="shadow-subtle border-border">
              <CardContent className="p-3 lg:p-4 flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 lg:p-3 rounded-lg shrink-0 border border-blue-500/10">
                  <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-blue-500" />
                </div>
                <div>
                  <p
                    className="text-[10px] lg:text-xs font-medium text-blue-500 uppercase tracking-wider"
                    title="Média diária no período"
                  >
                    Média Lançada
                  </p>
                  <p className="text-xl lg:text-2xl font-bold text-foreground mt-0.5">
                    {metrics.lancado}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-subtle border-border">
              <CardContent className="p-3 lg:p-4 flex items-center gap-3">
                <div className="bg-amber-500/10 p-2 lg:p-3 rounded-lg shrink-0 border border-amber-500/10">
                  <ClipboardCheck className="h-4 w-4 lg:h-5 lg:w-5 text-amber-500" />
                </div>
                <div>
                  <p
                    className="text-[10px] lg:text-xs font-medium text-amber-500 uppercase tracking-wider"
                    title="Média de contratação"
                  >
                    Média Contratado
                  </p>
                  <p className="text-xl lg:text-2xl font-bold text-foreground mt-0.5">
                    {metrics.contratado}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-subtle border-border">
              <CardContent className="p-3 lg:p-4 flex items-center gap-3">
                <div className="bg-green-500/10 p-2 lg:p-3 rounded-lg shrink-0 border border-green-500/10">
                  <Users className="h-4 w-4 lg:h-5 lg:w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-[10px] lg:text-xs font-medium text-green-500 uppercase tracking-wider">
                    {activeTab === 'colaboradores' ? 'Presentes' : 'Disponíveis'}
                  </p>
                  <p className="text-xl lg:text-2xl font-bold text-foreground mt-0.5">
                    {metrics.presente}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-subtle border-border">
              <CardContent className="p-3 lg:p-4 flex items-center gap-3">
                <div className="bg-red-500/10 p-2 lg:p-3 rounded-lg shrink-0 border border-red-500/10">
                  <XCircle className="h-4 w-4 lg:h-5 lg:w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] lg:text-xs font-medium text-red-500 uppercase tracking-wider">
                    {activeTab === 'colaboradores' ? 'Ausentes' : 'Indisponíveis'}
                  </p>
                  <p className="text-xl lg:text-2xl font-bold text-foreground mt-0.5">
                    {metrics.ausente}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-subtle border-border relative overflow-hidden col-span-2 md:col-span-1 xl:col-span-1">
              <CardContent className="p-3 lg:p-4 flex items-center gap-3 relative z-10">
                <div className="bg-orange-500/10 p-2 lg:p-3 rounded-lg shrink-0 border border-orange-500/10">
                  <TrendingDown className="h-4 w-4 lg:h-5 lg:w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-[10px] lg:text-xs font-medium text-orange-500 uppercase tracking-wider">
                    {activeTab === 'colaboradores' ? 'Absenteísmo' : 'Indisp.'}
                  </p>
                  <p className="text-xl lg:text-2xl font-bold text-foreground mt-0.5">
                    {metrics.absenteismo.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Por Planta & Por Local */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <Card className="shadow-subtle border-border flex flex-col h-full bg-card">
              <CardHeader className="pb-2 lg:pb-3 border-b border-border/50 px-4 lg:px-5 shrink-0">
                <CardTitle className="text-sm lg:text-base font-semibold flex items-center gap-2 text-foreground/90">
                  <Building2 className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground/80" /> Resumo
                  por Planta
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                <div className="px-4 lg:px-5 py-2 lg:py-3 grid grid-cols-12 gap-2 lg:gap-4 text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/30 shrink-0">
                  <div className="col-span-4">Planta</div>
                  <div className="col-span-2 text-center" title="Média Presença">
                    Pres.
                  </div>
                  <div className="col-span-2 text-center" title="Média Falta">
                    Falta
                  </div>
                  <div className="col-span-2 text-center">Contrat.</div>
                  <div className="col-span-2 text-right">Taxa</div>
                </div>
                <div className="divide-y divide-border/50 overflow-y-auto custom-scrollbar flex-1 min-h-[200px] max-h-[350px]">
                  {plantStats.map((p) => (
                    <div
                      key={p.id}
                      className="px-4 lg:px-5 py-2.5 lg:py-3 grid grid-cols-12 gap-2 lg:gap-4 items-center hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className="col-span-4 font-semibold text-xs lg:text-sm text-foreground truncate"
                        title={p.name}
                      >
                        {p.name}
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <span className="bg-green-500/10 text-green-600 border border-green-500/20 text-[10px] lg:text-xs font-bold px-1.5 lg:px-2 py-0.5 rounded">
                          {p.presentes}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <span className="bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] lg:text-xs font-bold px-1.5 lg:px-2 py-0.5 rounded">
                          {p.ausentes}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] lg:text-xs font-bold px-2 lg:px-3 py-0.5 rounded-full">
                          {p.contratado}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="font-bold text-xs lg:text-sm text-foreground">
                          {p.absenteismo.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                  {plantStats.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground/80 text-xs lg:text-sm">
                      Sem dados para exibir.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-subtle border-border flex flex-col h-full bg-card">
              <CardHeader className="pb-2 lg:pb-3 border-b border-border/50 px-4 lg:px-5 shrink-0">
                <CardTitle className="text-sm lg:text-base font-semibold flex items-center gap-2 text-foreground/90">
                  <MapPin className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground/80" /> Resumo por
                  Local
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                <div className="px-4 lg:px-5 py-2 lg:py-3 grid grid-cols-12 gap-2 lg:gap-4 text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/30 shrink-0">
                  <div className="col-span-4">Local</div>
                  <div className="col-span-2 text-center" title="Média Presença">
                    Pres.
                  </div>
                  <div className="col-span-2 text-center" title="Média Falta">
                    Falta
                  </div>
                  <div className="col-span-2 text-center">Contrat.</div>
                  <div className="col-span-2 text-right">Taxa</div>
                </div>
                <div className="divide-y divide-border/50 overflow-y-auto custom-scrollbar flex-1 min-h-[200px] max-h-[350px]">
                  {locationStats.map((l) => (
                    <div
                      key={l.id}
                      className="px-4 lg:px-5 py-2.5 lg:py-3 grid grid-cols-12 gap-2 lg:gap-4 items-center hover:bg-muted/50 transition-colors"
                    >
                      <div className="col-span-4">
                        <p
                          className="font-semibold text-xs lg:text-sm text-foreground truncate"
                          title={l.name}
                        >
                          {l.name}
                        </p>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <span className="bg-green-500/10 text-green-600 border border-green-500/20 text-[10px] lg:text-xs font-bold px-1.5 lg:px-2 py-0.5 rounded">
                          {l.presentes}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <span className="bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] lg:text-xs font-bold px-1.5 lg:px-2 py-0.5 rounded">
                          {l.ausentes}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] lg:text-xs font-bold px-2 lg:px-3 py-0.5 rounded-full">
                          {l.contratado}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="font-bold text-xs lg:text-sm text-foreground">
                          {l.contratado > 0 ? (100 - l.absenteismo).toFixed(1) : 0}%
                        </div>
                      </div>
                    </div>
                  ))}
                  {locationStats.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground/80 text-xs lg:text-sm">
                      Sem dados de locais.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Por Equipamento Details */}
          {activeTab === 'equipamentos' && (
            <Card className="shadow-subtle border-border bg-card animate-in fade-in slide-in-from-bottom-4">
              <CardHeader className="pb-2 lg:pb-3 border-b border-border/50 px-4 lg:px-5">
                <CardTitle className="text-sm lg:text-base font-semibold flex items-center gap-2 text-foreground/90">
                  <Wrench className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground/80" /> Por
                  Equipamento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-4 lg:px-5 py-2.5 grid grid-cols-12 gap-2 lg:gap-4 text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/30">
                  <div className="col-span-4 lg:col-span-5">Equipamento</div>
                  <div className="col-span-2 text-center">Contratado</div>
                  <div className="col-span-2 text-center">Presença</div>
                  <div className="col-span-2 text-center">Falta</div>
                  <div className="col-span-2 lg:col-span-1 text-right">Disp.</div>
                </div>
                <div className="divide-y divide-border/50 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {equipmentStats.map((eq) => (
                    <Collapsible key={eq.id}>
                      <CollapsibleTrigger className="w-full group focus-visible:outline-none">
                        <div className="px-4 lg:px-5 py-3 grid grid-cols-12 gap-2 lg:gap-4 items-center group-hover:bg-muted/50 transition-colors cursor-pointer text-left">
                          <div className="col-span-4 lg:col-span-5 font-semibold text-xs lg:text-sm text-foreground flex items-center gap-1.5 lg:gap-2">
                            <ChevronRight className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-muted-foreground/80 group-data-[state=open]:rotate-90 transition-transform shrink-0" />
                            <span className="truncate" title={eq.name}>
                              {eq.name}
                            </span>
                          </div>
                          <div className="col-span-2 text-center">
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold px-2 py-0.5 text-[10px] lg:text-xs"
                            >
                              {eq.contratado}
                            </Badge>
                          </div>
                          <div className="col-span-2 text-center">
                            <span className="text-green-600 font-bold text-xs lg:text-sm">
                              {eq.mediaPresenca.toFixed(1)}
                            </span>
                          </div>
                          <div className="col-span-2 text-center">
                            <span className="text-red-600 font-bold text-xs lg:text-sm">
                              {eq.mediaFalta.toFixed(1)}
                            </span>
                          </div>
                          <div className="col-span-2 lg:col-span-1 text-right">
                            <span className="font-bold text-xs lg:text-sm text-foreground">
                              {eq.taxaDisp.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-5 lg:px-6 py-4 bg-muted/20 border-t border-border/50 shadow-inner">
                          <h4 className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase mb-2.5 flex items-center gap-1.5">
                            <TrendingDown className="w-3.5 h-3.5 text-muted-foreground/80" />{' '}
                            Histórico
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {eq.history.length === 0 ? (
                              <span className="text-xs text-muted-foreground/80">
                                Sem lançamentos.
                              </span>
                            ) : (
                              eq.history.map((day: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex flex-col items-center justify-center bg-background py-1 px-2 lg:px-2.5 border border-border rounded shadow-sm min-w-[50px] lg:min-w-[60px]"
                                >
                                  <span className="text-[9px] lg:text-[10px] text-muted-foreground/80 font-medium mb-0.5">
                                    {format(new Date(day.date + 'T12:00:00Z'), 'dd/MM')}
                                  </span>
                                  <div
                                    className={cn(
                                      'w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full',
                                      day.status ? 'bg-green-500' : 'bg-red-500',
                                    )}
                                  />
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                  {equipmentStats.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground/80 text-xs lg:text-sm">
                      Sem dados neste período.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Por Colaborador Details */}
          {activeTab === 'colaboradores' && (
            <Card className="shadow-subtle border-border bg-card animate-in fade-in slide-in-from-bottom-4">
              <CardHeader className="pb-2 lg:pb-3 border-b border-border/50 px-4 lg:px-5">
                <CardTitle className="text-sm lg:text-base font-semibold flex items-center gap-2 text-foreground/90">
                  <Users className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground/80" /> Por
                  Colaborador
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-4 lg:px-5 py-2.5 grid grid-cols-12 gap-2 lg:gap-4 text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/30">
                  <div className="col-span-5 lg:col-span-6">Colaborador / Local</div>
                  <div className="col-span-3 text-center">Presenças</div>
                  <div className="col-span-2 text-center">Faltas</div>
                  <div className="col-span-2 lg:col-span-1 text-right">Taxa</div>
                </div>
                <div className="divide-y divide-border/50 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {collaboratorStats.map((col) => {
                    const total = col.presencas + col.faltas
                    const taxa = total > 0 ? (col.presencas / total) * 100 : 0
                    return (
                      <Collapsible key={col.id}>
                        <CollapsibleTrigger className="w-full group focus-visible:outline-none">
                          <div className="px-4 lg:px-5 py-3 grid grid-cols-12 gap-2 lg:gap-4 items-center group-hover:bg-muted/50 transition-colors cursor-pointer text-left">
                            <div className="col-span-5 lg:col-span-6 overflow-hidden">
                              <div className="font-semibold text-xs lg:text-sm text-foreground flex items-center gap-1.5 lg:gap-2">
                                <ChevronRight className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-muted-foreground/80 group-data-[state=open]:rotate-90 transition-transform shrink-0" />
                                <span className="truncate" title={col.name}>
                                  {col.name}
                                </span>
                              </div>
                              <div className="text-[10px] lg:text-xs text-muted-foreground ml-5 lg:ml-6 mt-0.5 truncate">
                                {col.location}
                              </div>
                            </div>
                            <div className="col-span-3 text-center">
                              <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-md bg-green-500/10 text-green-600 border border-green-500/20 font-bold text-xs lg:text-sm px-1.5">
                                {col.presencas}
                              </span>
                            </div>
                            <div className="col-span-2 text-center">
                              <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-md bg-red-500/10 text-red-600 border border-red-500/20 font-bold text-xs lg:text-sm px-1.5">
                                {col.faltas}
                              </span>
                            </div>
                            <div className="col-span-2 lg:col-span-1 text-right">
                              <span className="font-bold text-xs lg:text-sm text-foreground">
                                {taxa.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-5 lg:px-6 py-4 bg-muted/20 border-t border-border/50 shadow-inner">
                            <h4 className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase mb-2.5 flex items-center gap-1.5">
                              <TrendingDown className="w-3.5 h-3.5 text-muted-foreground/80" />{' '}
                              Histórico
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {col.history.length === 0 ? (
                                <span className="text-xs text-muted-foreground/80">
                                  Sem lançamentos.
                                </span>
                              ) : (
                                col.history.map((day: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex flex-col items-center justify-center bg-background py-1 px-2 lg:px-2.5 border border-border rounded shadow-sm min-w-[50px] lg:min-w-[60px]"
                                  >
                                    <span className="text-[9px] lg:text-[10px] text-muted-foreground/80 font-medium mb-0.5">
                                      {format(new Date(day.date + 'T12:00:00Z'), 'dd/MM')}
                                    </span>
                                    <div
                                      className={cn(
                                        'w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full',
                                        day.status ? 'bg-green-500' : 'bg-red-500',
                                      )}
                                    />
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}
                  {collaboratorStats.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground/80 text-xs lg:text-sm">
                      Sem lançamentos.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Book de Metas View */
        <div className="space-y-4 max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500 mt-6">
          <div
            className="flex items-center justify-between bg-card border border-border rounded-lg p-4 lg:p-5 shadow-sm border-l-4"
            style={{ borderLeftColor: brandSecondary }}
          >
            <div>
              <h3 className="font-bold text-foreground text-base lg:text-lg">Absenteísmo</h3>
              <p className="text-[10px] lg:text-xs text-muted-foreground mt-1">
                Automático — absenteísmo &lt; 4% = 100% | ≥ 4% = 0% | Calc:{' '}
                {metrics.absenteismo.toFixed(1)}%
              </p>
            </div>
            <div
              className={cn(
                'text-2xl lg:text-3xl font-black',
                goalsData.absAchieved === 100 ? 'text-green-500' : 'text-red-500',
              )}
            >
              {goalsData.absAchieved}%
            </div>
          </div>

          <div
            className="flex items-center justify-between bg-card border border-border rounded-lg p-4 lg:p-5 shadow-sm border-l-4"
            style={{ borderLeftColor: '#eab308' }}
          >
            <div>
              <h3 className="font-bold text-foreground text-base lg:text-lg">
                Disponibilidade de Equipamentos
              </h3>
              <p className="text-[10px] lg:text-xs text-muted-foreground mt-1">
                Automático — média disponíveis / contratado
              </p>
            </div>
            <div className="text-2xl lg:text-3xl font-black text-amber-500">
              {goalsData.equipDisp.toFixed(0)}%
            </div>
          </div>

          {goalsData.manualGoals.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between bg-card border border-border rounded-lg p-4 lg:p-5 shadow-sm border-l-4 border-l-muted"
            >
              <div className="pr-4">
                <h3 className="font-bold text-foreground text-base lg:text-lg">{g.name}</h3>
                {g.description && (
                  <p className="text-[10px] lg:text-xs text-muted-foreground mt-1">
                    {g.description}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                {g.avg !== null ? (
                  <div className="text-xl lg:text-2xl font-black text-foreground">
                    {Number(g.avg).toFixed(1)}%
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground/80 font-medium whitespace-nowrap">
                    Sem lançamento
                  </div>
                )}
              </div>
            </div>
          ))}

          <div
            className="flex items-center justify-between bg-muted/50 border border-border rounded-lg p-5 lg:p-6 shadow-sm mt-6 lg:mt-8 border-l-[6px] lg:border-l-8"
            style={{ borderLeftColor: brandSecondary }}
          >
            <div>
              <h3 className="font-black text-foreground text-lg lg:text-xl">Nota Geral</h3>
              <p className="text-xs lg:text-sm text-muted-foreground mt-1">Média de atingimento</p>
            </div>
            <div
              className={cn(
                'text-4xl lg:text-5xl font-black',
                Number(goalsData.notaGeral) >= 80
                  ? 'text-green-500'
                  : Number(goalsData.notaGeral) >= 50
                    ? 'text-amber-500'
                    : 'text-red-500',
              )}
            >
              {goalsData.notaGeral}%
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
