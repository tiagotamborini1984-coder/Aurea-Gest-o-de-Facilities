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
  const brandPrimary = activeClient?.primaryColor || '#8b5cf6'

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

          // Filter expanded view to only display days with recorded logs
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

          // Filter expanded view to only display days with recorded logs
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
        .filter((c) => c.history.length > 0) // Only show those who have recorded logs in the period
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
    <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-3xl font-bold tracking-tight text-brand-graphite">
          Dashboard do Gestor
        </h2>
        <p className="text-muted-foreground text-sm">Visão geral do efetivo por período</p>
      </div>

      {/* Global Filters & Tabs */}
      <Card className="shadow-subtle border-none overflow-hidden rounded-xl bg-white">
        <CardContent className="p-0 flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x border border-slate-100">
          {/* Dates */}
          <div className="flex gap-4 items-center p-4 xl:px-6 bg-slate-50/50">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[140px] h-9 text-sm bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[140px] h-9 text-sm bg-white"
              />
            </div>
            {activeTab === 'metas' && (
              <div className="space-y-1.5 ml-4 border-l pl-4">
                <Label className="text-xs text-muted-foreground">Mês de Referência</Label>
                <Input
                  type="month"
                  value={referenceMonth}
                  onChange={(e) => setReferenceMonth(e.target.value)}
                  className="w-[150px] h-9 text-sm bg-white"
                />
              </div>
            )}
          </div>

          {/* Plant Checkboxes */}
          <div className="flex-1 p-4 xl:px-6 flex items-center overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-6 min-w-max">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all-plants"
                  checked={selectedPlants.length > 0 && selectedPlants.length === plants.length}
                  onCheckedChange={toggleAllPlants}
                />
                <label
                  htmlFor="all-plants"
                  className="text-sm font-medium leading-none cursor-pointer"
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
                    className="text-sm text-muted-foreground leading-none cursor-pointer hover:text-foreground"
                  >
                    {p.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-4 xl:px-6 bg-slate-50/50 justify-end items-center">
            <button
              onClick={() => setActiveTab('colaboradores')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'colaboradores'
                  ? 'text-white shadow-sm'
                  : 'bg-white text-muted-foreground border hover:bg-slate-50',
              )}
              style={activeTab === 'colaboradores' ? { backgroundColor: brandPrimary } : {}}
            >
              <Users className="h-4 w-4" /> Colaboradores
            </button>
            <button
              onClick={() => setActiveTab('equipamentos')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'equipamentos'
                  ? 'text-white shadow-sm'
                  : 'bg-white text-muted-foreground border hover:bg-slate-50',
              )}
              style={activeTab === 'equipamentos' ? { backgroundColor: brandPrimary } : {}}
            >
              <Wrench className="h-4 w-4" /> Equipamentos
            </button>
            <button
              onClick={() => setActiveTab('metas')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === 'metas'
                  ? 'text-white shadow-sm'
                  : 'bg-white text-muted-foreground border hover:bg-slate-50',
              )}
              style={activeTab === 'metas' ? { backgroundColor: brandPrimary } : {}}
            >
              <Target className="h-4 w-4" /> Book de Metas
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Empty State vs Main Content */}
      {selectedPlants.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 mt-6 bg-white rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
          <Building2 className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700">Nenhuma planta selecionada</h3>
          <p className="text-slate-500 mt-2 text-center max-w-md">
            Por favor, selecione uma ou mais plantas no filtro acima para visualizar os indicadores
            e relatórios do dashboard.
          </p>
        </div>
      ) : activeTab !== 'metas' ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 lg:gap-6">
            <Card className="shadow-subtle border-slate-200">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="bg-slate-100 p-3 rounded-xl shrink-0">
                  <FileText className="h-6 w-6 text-slate-500" />
                </div>
                <div>
                  <p
                    className="text-xs font-medium text-slate-500 uppercase tracking-wider cursor-help"
                    title="Média diária no período selecionado"
                  >
                    Média Lançada/dia
                  </p>
                  <p className="text-3xl font-bold text-slate-800 mt-0.5">{metrics.lancado}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-subtle border-amber-200">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="bg-amber-100 p-3 rounded-xl shrink-0">
                  <ClipboardCheck className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p
                    className="text-xs font-medium text-amber-600 uppercase tracking-wider cursor-help"
                    title="Média diária de contratação no período"
                  >
                    Média Contratado/dia
                  </p>
                  <p className="text-3xl font-bold text-amber-700 mt-0.5">{metrics.contratado}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-subtle border-green-200">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-xl shrink-0">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p
                    className="text-xs font-medium text-green-600 uppercase tracking-wider cursor-help"
                    title="Média diária no período selecionado"
                  >
                    Média {activeTab === 'colaboradores' ? 'Presentes' : 'Disponíveis'}/dia
                  </p>
                  <p className="text-3xl font-bold text-green-700 mt-0.5">{metrics.presente}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-subtle border-red-200">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="bg-red-100 p-3 rounded-xl shrink-0">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p
                    className="text-xs font-medium text-red-600 uppercase tracking-wider cursor-help"
                    title="Média diária no período selecionado"
                  >
                    Média {activeTab === 'colaboradores' ? 'Ausentes' : 'Indisponíveis'}/dia
                  </p>
                  <p className="text-3xl font-bold text-red-700 mt-0.5">{metrics.ausente}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-subtle border-orange-200 relative overflow-hidden">
              <CardContent className="p-5 flex items-center gap-4 relative z-10">
                <div className="bg-orange-100 p-3 rounded-xl shrink-0">
                  <TrendingDown className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p
                    className="text-xs font-medium text-orange-600 uppercase tracking-wider cursor-help"
                    title="Taxa média geral do período"
                  >
                    {activeTab === 'colaboradores' ? 'Absenteísmo' : 'Indisponibilidade'}
                  </p>
                  <p className="text-3xl font-bold text-orange-700 mt-0.5">
                    {metrics.absenteismo.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Por Planta & Por Local */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-subtle border-slate-200 flex flex-col h-full">
              <CardHeader className="pb-3 border-b border-slate-100 px-6 shrink-0">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-brand-graphite">
                  <Building2 className="h-5 w-5 text-slate-400" /> Resumo por Planta
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                <div className="px-6 py-3 grid grid-cols-12 gap-4 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <div className="col-span-4">Planta</div>
                  <div className="col-span-2 text-center" title="Média Diária">
                    Média Presença
                  </div>
                  <div className="col-span-2 text-center" title="Média Diária">
                    Média Falta
                  </div>
                  <div className="col-span-2 text-center">Contratado</div>
                  <div className="col-span-2 text-right">Taxa / Abs.</div>
                </div>
                <div className="divide-y divide-slate-100 overflow-y-auto custom-scrollbar flex-1 min-h-[250px] max-h-[400px]">
                  {plantStats.map((p) => (
                    <div
                      key={p.id}
                      className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="col-span-4 font-semibold text-brand-graphite">{p.name}</div>
                      <div className="col-span-2 flex justify-center">
                        <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded">
                          {p.presentes}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded">
                          {p.ausentes}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <span className="bg-amber-200 text-amber-800 text-xs font-bold px-4 py-1 rounded-full">
                          {p.contratado}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="font-bold text-sm text-brand-graphite">
                          {p.absenteismo.toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {p.absenteismo.toFixed(1)}% abs.
                        </div>
                      </div>
                    </div>
                  ))}
                  {plantStats.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      Sem dados para exibir.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-subtle border-slate-200 flex flex-col h-full">
              <CardHeader className="pb-3 border-b border-slate-100 px-6 shrink-0">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-brand-graphite">
                  <MapPin className="h-5 w-5 text-slate-400" /> Resumo por Local
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                <div className="px-6 py-3 grid grid-cols-12 gap-4 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50 shrink-0">
                  <div className="col-span-4">Local / Planta</div>
                  <div className="col-span-2 text-center" title="Média Diária">
                    Média Presença
                  </div>
                  <div className="col-span-2 text-center" title="Média Diária">
                    Média Falta
                  </div>
                  <div className="col-span-2 text-center">Contratado</div>
                  <div className="col-span-2 text-right">Taxa / Abs.</div>
                </div>
                <div className="divide-y divide-slate-100 overflow-y-auto custom-scrollbar flex-1 min-h-[250px] max-h-[400px]">
                  {locationStats.map((l) => (
                    <div
                      key={l.id}
                      className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="col-span-4">
                        <p className="font-semibold text-brand-graphite leading-tight">{l.name}</p>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded">
                          {l.presentes}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded">
                          {l.ausentes}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <span className="bg-amber-200 text-amber-800 text-xs font-bold px-4 py-1 rounded-full">
                          {l.contratado}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="font-bold text-sm text-brand-graphite">
                          {l.contratado > 0 ? (100 - l.absenteismo).toFixed(1) : 0}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {l.absenteismo.toFixed(1)}% abs.
                        </div>
                      </div>
                    </div>
                  ))}
                  {locationStats.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      Sem dados de locais associados.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Por Equipamento Details */}
          {activeTab === 'equipamentos' && (
            <Card className="shadow-subtle border-slate-200 animate-in fade-in slide-in-from-bottom-4">
              <CardHeader className="pb-3 border-b border-slate-100 px-6">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-brand-graphite">
                  <Wrench className="h-5 w-5 text-slate-400" /> Por Equipamento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-6 py-3 grid grid-cols-12 gap-4 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                  <div className="col-span-4">Equipamento</div>
                  <div className="col-span-2 text-center">Contratado</div>
                  <div className="col-span-2 text-center">Média Presença</div>
                  <div className="col-span-2 text-center">Média Falta</div>
                  <div className="col-span-2 text-right">Taxa Disp.</div>
                </div>
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {equipmentStats.map((eq) => (
                    <Collapsible key={eq.id}>
                      <CollapsibleTrigger className="w-full group focus-visible:outline-none">
                        <div className="px-6 py-4 grid grid-cols-12 gap-4 items-center group-hover:bg-slate-50/50 transition-colors cursor-pointer text-left">
                          <div className="col-span-4 font-semibold text-brand-graphite flex items-center gap-2">
                            <ChevronRight className="w-4 h-4 text-slate-400 group-data-[state=open]:rotate-90 transition-transform" />
                            {eq.name}
                          </div>
                          <div className="col-span-2 text-center">
                            <Badge
                              variant="outline"
                              className="bg-amber-100 text-amber-800 border-0 font-bold px-3"
                            >
                              {eq.contratado}
                            </Badge>
                          </div>
                          <div className="col-span-2 text-center">
                            <span className="text-green-600 font-bold text-sm">
                              {eq.mediaPresenca.toFixed(1)}
                            </span>
                          </div>
                          <div className="col-span-2 text-center">
                            <span className="text-red-500 font-bold text-sm">
                              {eq.mediaFalta.toFixed(1)}
                            </span>
                          </div>
                          <div className="col-span-2 text-right">
                            <span className="font-bold text-sm text-brand-graphite">
                              {eq.taxaDisp.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-6 py-5 bg-slate-50/80 border-t border-slate-100 shadow-inner">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-slate-400" />
                            Histórico de Lançamentos (Apenas dias com registro)
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {eq.history.length === 0 ? (
                              <span className="text-sm text-slate-500">
                                Sem lançamentos no período.
                              </span>
                            ) : (
                              eq.history.map((day: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex flex-col items-center justify-center bg-white py-1.5 px-3 border border-slate-200 rounded-lg shadow-sm min-w-[70px]"
                                >
                                  <span className="text-[10px] text-slate-400 font-medium mb-0.5">
                                    {format(new Date(day.date + 'T12:00:00Z'), 'dd/MM')}
                                  </span>
                                  {day.status ? (
                                    <div
                                      className="w-2.5 h-2.5 rounded-full bg-green-500"
                                      title="Disponível"
                                    />
                                  ) : (
                                    <div
                                      className="w-2.5 h-2.5 rounded-full bg-red-500"
                                      title="Indisponível"
                                    />
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                  {equipmentStats.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      Nenhum equipamento vinculado às plantas selecionadas com dados neste período.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Por Colaborador Details */}
          {activeTab === 'colaboradores' && (
            <Card className="shadow-subtle border-slate-200 animate-in fade-in slide-in-from-bottom-4">
              <CardHeader className="pb-3 border-b border-slate-100 px-6">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-brand-graphite">
                  <Users className="h-5 w-5 text-slate-400" /> Por Colaborador (Lançamentos no
                  Período)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-6 py-3 grid grid-cols-12 gap-4 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                  <div className="col-span-5">Colaborador / Local</div>
                  <div className="col-span-3 text-center">Total Presenças</div>
                  <div className="col-span-3 text-center">Total Faltas</div>
                  <div className="col-span-1 text-right">Taxa</div>
                </div>
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {collaboratorStats.map((col) => {
                    const total = col.presencas + col.faltas
                    const taxa = total > 0 ? (col.presencas / total) * 100 : 0
                    return (
                      <Collapsible key={col.id}>
                        <CollapsibleTrigger className="w-full group focus-visible:outline-none">
                          <div className="px-6 py-4 grid grid-cols-12 gap-4 items-center group-hover:bg-slate-50/50 transition-colors cursor-pointer text-left">
                            <div className="col-span-5">
                              <div className="font-semibold text-brand-graphite flex items-center gap-2">
                                <ChevronRight className="w-4 h-4 text-slate-400 group-data-[state=open]:rotate-90 transition-transform shrink-0" />
                                <span className="truncate">{col.name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground ml-6 mt-0.5">
                                {col.location}
                              </div>
                            </div>
                            <div className="col-span-3 text-center">
                              <span className="inline-flex items-center justify-center min-w-[32px] h-7 rounded-md bg-green-100 text-green-700 font-bold text-sm px-2">
                                {col.presencas}
                              </span>
                            </div>
                            <div className="col-span-3 text-center">
                              <span className="inline-flex items-center justify-center min-w-[32px] h-7 rounded-md bg-red-100 text-red-700 font-bold text-sm px-2">
                                {col.faltas}
                              </span>
                            </div>
                            <div className="col-span-1 text-right">
                              <span className="font-bold text-sm text-brand-graphite">
                                {taxa.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-6 py-5 bg-slate-50/80 border-t border-slate-100 shadow-inner">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-slate-400" />
                              Histórico de Lançamentos (Apenas dias com registro)
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {col.history.length === 0 ? (
                                <span className="text-sm text-slate-500">
                                  Sem lançamentos no período.
                                </span>
                              ) : (
                                col.history.map((day: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex flex-col items-center justify-center bg-white py-1.5 px-3 border border-slate-200 rounded-lg shadow-sm min-w-[70px]"
                                  >
                                    <span className="text-[10px] text-slate-400 font-medium mb-0.5">
                                      {format(new Date(day.date + 'T12:00:00Z'), 'dd/MM')}
                                    </span>
                                    {day.status ? (
                                      <div
                                        className="w-2.5 h-2.5 rounded-full bg-green-500"
                                        title="Presente"
                                      />
                                    ) : (
                                      <div
                                        className="w-2.5 h-2.5 rounded-full bg-red-500"
                                        title="Falta"
                                      />
                                    )}
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
                    <div className="p-8 text-center text-slate-400 text-sm">
                      Nenhum colaborador com lançamentos registrados no período.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Book de Metas View */
        <div className="space-y-4 max-w-5xl animate-in slide-in-from-bottom-4 duration-500 mt-6">
          {/* Automated Goal 1 */}
          <div
            className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-5 shadow-sm border-l-4"
            style={{ borderLeftColor: brandPrimary }}
          >
            <div>
              <h3 className="font-bold text-brand-graphite text-lg">Absenteísmo</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Automático — absenteísmo &lt; 4% = 100% | ≥ 4% = 0% | Calculado:{' '}
                {metrics.absenteismo.toFixed(1)}%
              </p>
            </div>
            <div
              className={cn(
                'text-3xl font-black',
                goalsData.absAchieved === 100 ? 'text-green-600' : 'text-red-500',
              )}
            >
              {goalsData.absAchieved}%
            </div>
          </div>

          {/* Automated Goal 2 */}
          <div
            className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-5 shadow-sm border-l-4"
            style={{ borderLeftColor: '#eab308' }}
          >
            <div>
              <h3 className="font-bold text-brand-graphite text-lg">
                Disponibilidade de Equipamentos
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Automático — média equipamentos disponíveis / quadro contratado
              </p>
            </div>
            <div className="text-3xl font-black text-amber-500">
              {goalsData.equipDisp.toFixed(0)}%
            </div>
          </div>

          {/* Manual Goals from DB */}
          {goalsData.manualGoals.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-5 shadow-sm border-l-4 border-l-slate-300"
            >
              <div className="pr-4">
                <h3 className="font-bold text-brand-graphite text-lg">{g.name}</h3>
                {g.description && (
                  <p className="text-xs text-muted-foreground mt-1">{g.description}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                {g.avg !== null ? (
                  <div className="text-2xl font-black text-slate-700">
                    {Number(g.avg).toFixed(1)}%
                  </div>
                ) : (
                  <div className="text-sm text-slate-400 font-medium whitespace-nowrap">
                    Sem lançamento
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* General Score */}
          <div
            className="flex items-center justify-between bg-slate-50 border border-slate-300 rounded-lg p-6 shadow-sm mt-8 border-l-8"
            style={{ borderLeftColor: brandPrimary }}
          >
            <div>
              <h3 className="font-black text-brand-graphite text-xl">Nota Geral</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Média de atingimento de todas as metas
              </p>
            </div>
            <div
              className={cn(
                'text-5xl font-black',
                Number(goalsData.notaGeral) >= 80
                  ? 'text-green-600'
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
