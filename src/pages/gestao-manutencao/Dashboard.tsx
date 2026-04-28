import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Activity, Clock, Target, Filter, MapPin, CheckCircle2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportToCSV } from '@/lib/export'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

export default function DashboardManutencao() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, open: 0, planned: 0, completed: 0 })
  const [aderencia, setAderencia] = useState({
    proativo: 0,
    reativo: 0,
    preventiva: 0,
    reparo: 0,
    total: 0,
  })
  const [reparoAderenciaData, setReparoAderenciaData] = useState<any[]>([])
  const [prevAderenciaData, setPrevAderenciaData] = useState<any[]>([])
  const [evolData, setEvolData] = useState<any[]>([])
  const [mttrData, setMttrData] = useState<any[]>([])
  const [rawTickets, setRawTickets] = useState<any[]>([])

  const [plants, setPlants] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [selectedArea, setSelectedArea] = useState<string>('all')

  useEffect(() => {
    loadAuxData()
  }, [])

  useEffect(() => {
    fetchStats()
  }, [selectedPlant, selectedArea])

  const loadAuxData = async () => {
    const [pRes, aRes] = await Promise.all([
      supabase.from('plants').select('id, name').order('name'),
      supabase.from('maintenance_areas').select('id, name, plant_id').order('name'),
    ])
    if (pRes.data) setPlants(pRes.data)
    if (aRes.data) setAreas(aRes.data)
  }

  const fetchStats = async () => {
    setLoading(true)
    try {
      let query = supabase.from('maintenance_tickets').select(
        `id, ticket_number, status_id, planned_start, planned_end, actual_start, actual_end, origin, plant_id, area_id, reported_at, created_at, updated_at,
          status:maintenance_statuses(name, step, is_terminal),
          type:maintenance_types(name),
          priority:maintenance_priorities(sla_hours)`,
      )

      if (selectedPlant !== 'all') query = query.eq('plant_id', selectedPlant)
      if (selectedArea !== 'all') query = query.eq('area_id', selectedArea)

      const { data: tickets } = await query

      if (tickets) {
        setRawTickets(tickets)
        const total = tickets.length
        const open = tickets.filter((t: any) => t.status?.step === 'Aberto' || !t.status).length
        const planned = tickets.filter(
          (t: any) => t.status?.step === 'Planejado' || t.planned_start,
        ).length
        const completed = tickets.filter(
          (t: any) => t.status?.step === 'Concluído' || t.status?.is_terminal,
        ).length
        setStats({ total, open, planned, completed })

        const now = new Date()
        let reparoTotal = 0
        let reparoNoPrazo = 0
        let proativoTotal = 0
        let proativoNoPrazo = 0
        let reativoTotal = 0
        let reativoNoPrazo = 0
        let preventivaTotal = 0
        let preventivaNoPrazo = 0

        const monthlyStats: Record<string, any> = {}
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthName = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          monthlyStats[key] = {
            label: monthName,
            reparoTotal: 0,
            reparoNoPrazo: 0,
            prevTotal: 0,
            prevNoPrazo: 0,
            mttrReparoSoma: 0,
            mttrReparoQtd: 0,
            mttrPrevSoma: 0,
            mttrPrevQtd: 0,
          }
        }

        tickets.forEach((t: any) => {
          const typeName = t.type?.name?.toLowerCase() || ''
          const isPreventiva =
            typeName.includes('preventiva') ||
            typeName.includes('prev') ||
            t.origin === 'Preventiva'
          const isProativo = !isPreventiva && typeName.includes('proativo')
          const isReativo =
            !isPreventiva && (typeName.includes('reativo') || typeName.includes('corr'))

          const isReparo = isProativo || isReativo

          const reportedAt = new Date(t.reported_at || t.created_at)
          const slaHours = t.priority?.sla_hours || 0
          let limitDate = new Date(reportedAt.getTime() + slaHours * 60 * 60 * 1000)

          if (t.planned_end && (isPreventiva || isProativo)) {
            limitDate = new Date(t.planned_end)
          }

          const isTerminal = t.status?.is_terminal || t.status?.step === 'Concluído'
          const endDate = t.actual_end
            ? new Date(t.actual_end)
            : isTerminal
              ? new Date(t.updated_at)
              : now

          const withinSLA = endDate <= limitDate

          if (t.planned_end || slaHours > 0) {
            if (isReparo) {
              reparoTotal++
              if (withinSLA) reparoNoPrazo++

              if (isProativo) {
                proativoTotal++
                if (withinSLA) proativoNoPrazo++
              }
              if (isReativo) {
                reativoTotal++
                if (withinSLA) reativoNoPrazo++
              }
            }
            if (isPreventiva) {
              preventivaTotal++
              if (withinSLA) preventivaNoPrazo++
            }

            const monthKey = `${reportedAt.getFullYear()}-${String(reportedAt.getMonth() + 1).padStart(2, '0')}`
            if (monthlyStats[monthKey]) {
              if (isReparo) {
                monthlyStats[monthKey].reparoTotal++
                if (withinSLA) monthlyStats[monthKey].reparoNoPrazo++
              }
              if (isPreventiva) {
                monthlyStats[monthKey].prevTotal++
                if (withinSLA) monthlyStats[monthKey].prevNoPrazo++
              }
            }
          }

          if (isTerminal) {
            const finalDate = t.actual_end ? new Date(t.actual_end) : new Date(t.updated_at)
            const monthKeyMttr = `${finalDate.getFullYear()}-${String(finalDate.getMonth() + 1).padStart(2, '0')}`
            if (monthlyStats[monthKeyMttr]) {
              const repairHours = (finalDate.getTime() - reportedAt.getTime()) / (1000 * 60 * 60)
              if (isReparo) {
                monthlyStats[monthKeyMttr].mttrReparoSoma += Math.max(0, repairHours)
                monthlyStats[monthKeyMttr].mttrReparoQtd++
              }
              if (isPreventiva) {
                monthlyStats[monthKeyMttr].mttrPrevSoma += Math.max(0, repairHours)
                monthlyStats[monthKeyMttr].mttrPrevQtd++
              }
            }
          }
        })

        const adProativo = proativoTotal > 0 ? (proativoNoPrazo / proativoTotal) * 100 : 0
        const adReativo = reativoTotal > 0 ? (reativoNoPrazo / reativoTotal) * 100 : 0
        const adPrev = preventivaTotal > 0 ? (preventivaNoPrazo / preventivaTotal) * 100 : 0
        const adReparo = reparoTotal > 0 ? (reparoNoPrazo / reparoTotal) * 100 : 0
        const adTotal =
          reparoTotal + preventivaTotal > 0
            ? ((reparoNoPrazo + preventivaNoPrazo) / (reparoTotal + preventivaTotal)) * 100
            : 0
        setAderencia({
          proativo: adProativo,
          reativo: adReativo,
          preventiva: adPrev,
          reparo: adReparo,
          total: adTotal,
        })

        const rData = []
        if (reparoTotal === 0) rData.push({ name: 'Sem dados', value: 1, color: '#e5e7eb' })
        else {
          if (reparoNoPrazo > 0)
            rData.push({ name: 'No Prazo', value: reparoNoPrazo, color: '#10b981' })
          if (reparoTotal - reparoNoPrazo > 0)
            rData.push({ name: 'Atrasado', value: reparoTotal - reparoNoPrazo, color: '#ef4444' })
        }
        setReparoAderenciaData(rData)

        const pData = []
        if (preventivaTotal === 0) pData.push({ name: 'Sem dados', value: 1, color: '#e5e7eb' })
        else {
          if (preventivaNoPrazo > 0)
            pData.push({ name: 'No Prazo', value: preventivaNoPrazo, color: '#10b981' })
          if (preventivaTotal - preventivaNoPrazo > 0)
            pData.push({
              name: 'Atrasado',
              value: preventivaTotal - preventivaNoPrazo,
              color: '#ef4444',
            })
        }
        setPrevAderenciaData(pData)

        const evolDataObj = Object.values(monthlyStats).map((m: any) => ({
          name: m.label.charAt(0).toUpperCase() + m.label.slice(1),
          Reparos:
            m.reparoTotal > 0 ? Number(((m.reparoNoPrazo / m.reparoTotal) * 100).toFixed(1)) : 0,
          Preventivas:
            m.prevTotal > 0 ? Number(((m.prevNoPrazo / m.prevTotal) * 100).toFixed(1)) : 0,
        }))
        setEvolData(evolDataObj)

        const newMttrData = Object.values(monthlyStats).map((m: any) => ({
          name: m.label.charAt(0).toUpperCase() + m.label.slice(1),
          Reparos:
            m.mttrReparoQtd > 0 ? Number((m.mttrReparoSoma / m.mttrReparoQtd).toFixed(1)) : 0,
          Preventivas: m.mttrPrevQtd > 0 ? Number((m.mttrPrevSoma / m.mttrPrevQtd).toFixed(1)) : 0,
        }))
        setMttrData(newMttrData)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!rawTickets || rawTickets.length === 0) return
    const exportData = rawTickets.map((t) => {
      const typeName = t.type?.name?.toLowerCase() || ''
      const isPreventiva =
        typeName.includes('preventiva') || typeName.includes('prev') || t.origin === 'Preventiva'
      const isProativo = !isPreventiva && typeName.includes('proativo')
      const isReativo = !isPreventiva && (typeName.includes('reativo') || typeName.includes('corr'))

      let categoria = 'Outro'
      if (isPreventiva) categoria = 'Preventiva'
      else if (isProativo) categoria = 'Proativo'
      else if (isReativo) categoria = 'Reativo'

      return {
        'Nº Chamado': t.ticket_number || t.id.substring(0, 8),
        Planta: plants.find((p) => p.id === t.plant_id)?.name || '-',
        Área: areas.find((a) => a.id === t.area_id)?.name || '-',
        Status: t.status?.name || t.status?.step || '-',
        Tipo: t.type?.name || '-',
        Categoria: categoria,
        'Data Criação': new Date(t.created_at).toLocaleString('pt-BR'),
        'Data Fechamento': t.actual_end ? new Date(t.actual_end).toLocaleString('pt-BR') : '-',
        'SLA (h)': t.priority?.sla_hours || 0,
      }
    })
    exportToCSV('dashboard_manutencao.csv', exportData)
  }

  const pieConfig = {
    noPrazo: { label: 'No Prazo', color: '#10b981' },
    atrasado: { label: 'Atrasado', color: '#ef4444' },
    semDados: { label: 'Sem dados', color: '#e5e7eb' },
  }

  const lineConfig = {
    Reparos: { label: 'Reparos', color: '#f59e0b' },
    Preventivas: { label: 'Preventivas', color: '#3b82f6' },
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Activity className="h-8 w-8 text-brand-vividBlue" />
            Dashboard de Manutenção
          </h1>
          <p className="text-gray-500 mt-1">Indicadores e KPIs de performance</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Button
            variant="outline"
            className="bg-white"
            onClick={handleExport}
            disabled={loading || rawTickets.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Select
            value={selectedPlant}
            onValueChange={(v) => {
              setSelectedPlant(v)
              setSelectedArea('all')
            }}
          >
            <SelectTrigger className="w-[180px] bg-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Plantas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Plantas</SelectItem>
              {plants.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedArea} onValueChange={setSelectedArea}>
            <SelectTrigger className="w-[180px] bg-white">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Áreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Áreas</SelectItem>
              {areas
                .filter((a) => selectedPlant === 'all' || a.plant_id === selectedPlant)
                .map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total de Chamados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Em Aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.open}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Planejados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.planned}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Concluídos (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-start gap-2">
              <Target className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
              <div className="flex flex-col">
                <span className="leading-tight">Aderência a Programação de OS</span>
                <span className="text-xs text-gray-500 font-normal mt-0.5">
                  (Reparos Pró Ativos e Reativos)
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center p-4">
            {loading ? (
              <div className="text-gray-400">Carregando...</div>
            ) : (
              <ChartContainer config={pieConfig} className="w-full h-full">
                <PieChart>
                  <Pie
                    data={reparoAderenciaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                  >
                    {reparoAderenciaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-start gap-2">
              <Target className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="flex flex-col">
                <span className="leading-tight">Aderência Manutenção Preventiva</span>
                <span className="text-xs text-gray-500 font-normal mt-0.5">
                  (Apenas Preventivas)
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center p-4">
            {loading ? (
              <div className="text-gray-400">Carregando...</div>
            ) : (
              <ChartContainer config={pieConfig} className="w-full h-full">
                <PieChart>
                  <Pie
                    data={prevAderenciaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                  >
                    {prevAderenciaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              Desempenho Detalhado (SLA)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center py-4">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                Carregando...
              </div>
            ) : (
              <div className="flex flex-col space-y-5">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-600">Geral (Todos)</span>
                    <span className={aderencia.total >= 90 ? 'text-green-600' : 'text-amber-600'}>
                      {aderencia.total.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 relative">
                    <div
                      className="absolute top-[-4px] bottom-[-4px] w-[2px] bg-slate-300 z-10"
                      style={{ left: '90%' }}
                      title="Meta: 90%"
                    ></div>
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all duration-500',
                        aderencia.total >= 90 ? 'bg-green-500' : 'bg-amber-500',
                      )}
                      style={{ width: `${Math.min(aderencia.total, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-600">Preventivas</span>
                    <span className="text-blue-600">{aderencia.preventiva.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 relative">
                    <div
                      className="absolute top-[-4px] bottom-[-4px] w-[2px] bg-slate-300 z-10"
                      style={{ left: '90%' }}
                    ></div>
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(aderencia.preventiva, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-600">Reparos Proativos</span>
                    <span className="text-indigo-500">{aderencia.proativo.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 relative">
                    <div
                      className="absolute top-[-4px] bottom-[-4px] w-[2px] bg-slate-300 z-10"
                      style={{ left: '90%' }}
                    ></div>
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(aderencia.proativo, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-600">Reparos Reativos</span>
                    <span className="text-red-500">{aderencia.reativo.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 relative">
                    <div
                      className="absolute top-[-4px] bottom-[-4px] w-[2px] bg-slate-300 z-10"
                      style={{ left: '90%' }}
                    ></div>
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(aderencia.reativo, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-500" />
              Evolução de Aderência ao SLA (%)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                Carregando...
              </div>
            ) : (
              <ChartContainer config={lineConfig} className="w-full h-full min-h-[300px]">
                <LineChart data={evolData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Reparos"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Preventivas"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              MTTR (Tempo Médio de Reparo - horas)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                Carregando...
              </div>
            ) : (
              <ChartContainer config={lineConfig} className="w-full h-full min-h-[300px]">
                <BarChart data={mttrData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="Reparos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Preventivas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
