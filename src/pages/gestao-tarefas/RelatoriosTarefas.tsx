import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Printer, Loader2, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { format, subDays, differenceInSeconds } from 'date-fns'
import { exportToCSV } from '@/lib/export'
import { calculateSLA } from '@/lib/sla-utils'
import { cn } from '@/lib/utils'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'

const SemiCircleGauge = ({
  value,
  label,
  size = 180,
  color,
}: {
  value: number
  label: string
  size?: number
  color?: string
}) => {
  const data = [
    { name: 'Aderência', value: value },
    { name: 'Falta', value: 100 - value < 0 ? 0 : 100 - value },
  ]
  const fillColor = color || (value >= 80 ? '#22c55e' : value >= 50 ? '#f59e0b' : '#ef4444')
  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: size, height: size * 0.65 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="85%"
            startAngle={180}
            endAngle={0}
            innerRadius="70%"
            outerRadius="100%"
            dataKey="value"
            stroke="none"
            isAnimationActive={true}
          >
            <Cell key="cell-0" fill={fillColor} />
            <Cell key="cell-1" fill="#f1f5f9" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="text-3xl font-black" style={{ color: fillColor }}>
          {value.toFixed(1)}%
        </span>
        <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
          {label}
        </span>
      </div>
    </div>
  )
}

export default function RelatoriosTarefas() {
  const { profile } = useAppStore()
  const { plants } = useMasterData()
  const hasAccess = useHasAccess('Gestão de Tarefas:Relatórios')

  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [filterPlant, setFilterPlant] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')

  const [tasks, setTasks] = useState<any[]>([])
  const [timelines, setTimelines] = useState<any[]>([])
  const [taskTypes, setTaskTypes] = useState<any[]>([])
  const [taskStatuses, setTaskStatuses] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    if (!profile?.client_id) return
    setLoading(true)

    const [tRes, sRes, uRes] = await Promise.all([
      supabase.from('task_types').select('*').eq('client_id', profile.client_id),
      supabase.from('task_statuses').select('*').eq('client_id', profile.client_id),
      supabase.from('profiles').select('id, name, email, role').eq('client_id', profile.client_id),
    ])

    setTaskTypes(tRes.data || [])
    setTaskStatuses(sRes.data || [])
    setUsers(uRes.data || [])

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('client_id', profile.client_id)
      .gte('created_at', `${dateFrom}T00:00:00.000Z`)
      .lte('created_at', `${dateTo}T23:59:59.999Z`)
      .order('created_at', { ascending: false })

    if (filterPlant !== 'all') query = query.eq('plant_id', filterPlant)
    if (filterStatus !== 'all') query = query.eq('status_id', filterStatus)
    if (filterAssignee !== 'all') query = query.eq('assignee_id', filterAssignee)

    const { data } = await query
    setTasks(data || [])

    if (data && data.length > 0) {
      const taskIds = data.map((t: any) => t.id)
      const tlData: any[] = []
      const chunkSize = 150
      for (let i = 0; i < taskIds.length; i += chunkSize) {
        const chunk = taskIds.slice(i, i + chunkSize)
        const { data: chunkData } = await supabase
          .from('task_timeline')
          .select('*')
          .in('task_id', chunk)
        if (chunkData) tlData.push(...chunkData)
      }
      setTimelines(tlData)
    } else {
      setTimelines([])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [profile, dateFrom, dateTo, filterPlant, filterStatus, filterAssignee])

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  const handleExport = () => {
    if (tasks.length === 0) return
    const exportData = tasks.map((task) => {
      const type = taskTypes.find((t) => t.id === task.type_id)
      const status = taskStatuses.find((s) => s.id === task.status_id)
      const assignee = users.find((u) => u.id === task.assignee_id)
      const requester = users.find((u) => u.id === task.requester_id)
      const plant = plants.find((p) => p.id === task.plant_id)
      const sla = calculateSLA(task, status)

      return {
        Protocolo: task.task_number,
        'Data de Abertura': format(new Date(task.created_at), 'dd/MM/yyyy HH:mm'),
        'Data de Fechamento': task.closed_at
          ? format(new Date(task.closed_at), 'dd/MM/yyyy HH:mm')
          : '-',
        Planta: plant?.name || '-',
        Tipo: type?.name || '-',
        Status: status?.name || '-',
        Solicitante: requester?.name || '-',
        Responsável: assignee?.name || '-',
        SLA: sla.text,
        'Aderência SLA (%)': sla.percentage.toFixed(1) + '%',
      }
    })
    exportToCSV(`Relatorio_Chamados_${format(new Date(), 'yyyyMMdd')}.csv`, exportData)
  }

  const buildMetrics = (groupKeyFn: (t: any) => string, nameFn: (id: string) => string) => {
    const groups: Record<string, any> = {}

    tasks.forEach((task) => {
      const key = groupKeyFn(task)
      if (!key) return
      if (!groups[key]) {
        groups[key] = {
          id: key,
          name: nameFn(key),
          total: 0,
          closed: 0,
          late: 0,
          onTime: 0,
          totalElapsedHours: 0,
        }
      }

      groups[key].total++
      if (task.closed_at) groups[key].closed++

      const tType = taskTypes.find((t) => t.id === task.type_id)
      if (tType && tType.sla_hours > 0) {
        const start = new Date(task.created_at)
        const end = task.closed_at ? new Date(task.closed_at) : new Date()
        const frozenSecs = (task.frozen_time_minutes || 0) * 60
        let elapsedSecs = differenceInSeconds(end, start) - frozenSecs
        if (elapsedSecs < 0) elapsedSecs = 0

        groups[key].totalElapsedHours += elapsedSecs / 3600

        const slaSecs = tType.sla_hours * 3600
        if (elapsedSecs > slaSecs) {
          groups[key].late++
        } else {
          groups[key].onTime++
        }
      }
    })

    return Object.values(groups)
      .map((g: any) => {
        const totalSlaTasks = g.late + g.onTime
        const adherence = totalSlaTasks > 0 ? (g.onTime / totalSlaTasks) * 100 : 100
        const avgSlaHours = g.total > 0 ? g.totalElapsedHours / g.total : 0
        return { ...g, adherence, totalSlaTasks, avgSlaHours }
      })
      .sort((a, b) => b.total - a.total)
  }

  const metricsByRequester = buildMetrics(
    (t) => t.requester_id,
    (id) => users.find((u) => u.id === id)?.name || 'Desconhecido',
  )
  const metricsByAssignee = buildMetrics(
    (t) => t.assignee_id,
    (id) => users.find((u) => u.id === id)?.name || 'Desconhecido',
  )
  const metricsByPlant = buildMetrics(
    (t) => t.plant_id,
    (id) => plants.find((p) => p.id === id)?.name || 'Desconhecido',
  )
  const metricsByType = buildMetrics(
    (t) => t.type_id,
    (id) => taskTypes.find((x) => x.id === id)?.name || 'Desconhecido',
  )

  const getTaskDiffs = (task: any, timelines: any[], taskStatuses: any[]) => {
    const taskTl = timelines
      .filter((tl) => tl.task_id === task.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const abertoDate = new Date(task.created_at)

    let rcDate: Date | null = task.rc_created_date ? new Date(task.rc_created_date) : null
    const tlRc = taskTl.find(
      (tl) =>
        tl.content.toLowerCase().includes('requisição criada') ||
        tl.content.toLowerCase().includes('requisicao criada'),
    )
    if (!rcDate && tlRc) rcDate = new Date(tlRc.created_at)

    let poDate: Date | null = task.po_generated_date ? new Date(task.po_generated_date) : null
    const tlPo = taskTl.find((tl) => tl.content.toLowerCase().includes('pedido gerado'))
    if (!poDate && tlPo) poDate = new Date(tlPo.created_at)

    let closedDate: Date | null = task.closed_at ? new Date(task.closed_at) : null
    const tlClosed = taskTl.find((tl) => tl.content.toLowerCase().includes('finalizado'))
    if (!closedDate && tlClosed) closedDate = new Date(tlClosed.created_at)

    const currentStatus =
      taskStatuses.find((s) => s.id === task.status_id)?.name.toLowerCase() || ''
    if (!rcDate && (currentStatus === 'requisição criada' || currentStatus === 'requisicao criada'))
      rcDate = new Date(task.status_updated_at)
    if (!poDate && currentStatus === 'pedido gerado') poDate = new Date(task.status_updated_at)
    if (!closedDate && currentStatus === 'finalizado') closedDate = new Date(task.status_updated_at)

    let diffRC: number | null = null
    let diffPO: number | null = null
    let diffDelivery: number | null = null

    if (rcDate) {
      diffRC = Math.max(0, differenceInSeconds(rcDate, abertoDate) / 86400)
    }

    if (poDate && rcDate) {
      diffPO = Math.max(0, differenceInSeconds(poDate, rcDate) / 86400)
    } else if (poDate) {
      diffPO = Math.max(0, differenceInSeconds(poDate, abertoDate) / 86400)
    }

    if (closedDate && poDate) {
      diffDelivery = Math.max(0, differenceInSeconds(closedDate, poDate) / 86400)
    }

    return { diffRC, diffPO, diffDelivery }
  }

  const comprasTasks = tasks.filter((task) => {
    const type = taskTypes.find((t) => t.id === task.type_id)
    if (!type) return false
    const name = type.name.toLowerCase()
    return (
      name.includes('compra de materiais') ||
      name.includes('compra de serviço') ||
      name.includes('compra de servico')
    )
  })

  const buildComprasMetrics = () => {
    let sumToRC = 0
    let countToRC = 0

    let sumToPO = 0
    let countToPO = 0

    let sumToDelivery = 0
    let countToDelivery = 0

    comprasTasks.forEach((task) => {
      const { diffRC, diffPO, diffDelivery } = getTaskDiffs(task, timelines, taskStatuses)

      if (diffRC !== null) {
        sumToRC += diffRC
        countToRC++
      }

      if (diffPO !== null) {
        sumToPO += diffPO
        countToPO++
      }

      if (diffDelivery !== null) {
        sumToDelivery += diffDelivery
        countToDelivery++
      }
    })

    return {
      avgToRC: countToRC > 0 ? sumToRC / countToRC : 0,
      avgToPO: countToPO > 0 ? sumToPO / countToPO : 0,
      avgToDelivery: countToDelivery > 0 ? sumToDelivery / countToDelivery : 0,
      countToRC,
      countToPO,
      countToDelivery,
    }
  }

  const comprasMetrics = buildComprasMetrics()

  const formatDays = (days: number) => {
    if (days === 0) return '0.0'
    if (days > 0 && days < 1) return (days * 24).toFixed(1)
    return days.toFixed(1)
  }

  const formatUnit = (days: number) => {
    if (days > 0 && days < 1) return 'horas'
    return 'dias'
  }

  const renderMetricCards = (metrics: any[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metrics.map((m) => (
        <Card key={m.id} className="shadow-sm border-gray-200 hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex flex-col items-center">
            <h3
              className="font-bold text-[15px] text-slate-800 mb-6 text-center line-clamp-1 w-full"
              title={m.name}
            >
              {m.name}
            </h3>
            <SemiCircleGauge value={m.adherence} label="Aderência SLA" size={200} />
            <div className="grid grid-cols-2 gap-4 w-full mt-8 text-center">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col justify-center">
                <div className="text-2xl font-black text-brand-deepBlue">{m.total}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                  Chamados
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col justify-center">
                <div className="text-2xl font-black text-brand-deepBlue">
                  {m.avgSlaHours.toFixed(1)}h
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                  SLA Médio
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100 border-dashed text-slate-500">
      <AlertTriangle className="w-8 h-8 mb-3 text-slate-400" />
      <p className="font-medium text-lg">Nenhum dado encontrado</p>
      <p className="text-sm">Não há chamados suficientes para este período e filtros.</p>
    </div>
  )

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in print:max-w-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Relatório de Chamados
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">Acompanhamento e aderência ao SLA.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.print()}
            disabled={tasks.length === 0}
            className="border-gray-300"
          >
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
          <Button variant="tech" onClick={handleExport} disabled={tasks.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Excel
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm print:hidden">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700">De</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-36"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700">Até</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-36"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700">Planta</Label>
          <Select value={filterPlant} onValueChange={setFilterPlant}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Todas" />
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
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {taskStatuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-slate-700">Responsável</Label>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Responsáveis</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="lista" className="space-y-6 print:block">
        <TabsList className="bg-white border border-gray-200 print:hidden h-12 w-full sm:w-auto flex-wrap">
          <TabsTrigger
            value="lista"
            className="text-base font-semibold px-6 py-2 flex-1 sm:flex-none"
          >
            Lista de Chamados
          </TabsTrigger>
          <TabsTrigger
            value="dashboard"
            className="text-base font-semibold px-6 py-2 flex-1 sm:flex-none"
          >
            Dashboard de Performance
          </TabsTrigger>
          <TabsTrigger
            value="compras"
            className="text-base font-semibold px-6 py-2 flex-1 sm:flex-none"
          >
            SLA de Compras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="m-0 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
            <Table className="print:text-xs">
              <TableHeader className="bg-slate-50 border-b border-gray-200 print:bg-transparent">
                <TableRow>
                  <TableHead className="font-semibold text-slate-800 print:text-black">
                    Protocolo
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800 print:text-black">
                    Abertura
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800 print:text-black">
                    Tipo / Planta
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800 print:text-black">
                    Responsável
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800 print:text-black">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800 print:text-black">
                    SLA Atual
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-deepBlue" />
                    </TableCell>
                  </TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500 font-medium">
                      Nenhum chamado encontrado no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => {
                    const type = taskTypes.find((t) => t.id === task.type_id)
                    const status = taskStatuses.find((s) => s.id === task.status_id)
                    const assignee = users.find((u) => u.id === task.assignee_id)
                    const plant = plants.find((p) => p.id === task.plant_id)
                    const sla = calculateSLA(task, status)

                    return (
                      <TableRow
                        key={task.id}
                        className="hover:bg-slate-50 border-gray-100 print:border-b"
                      >
                        <TableCell className="font-medium text-slate-800">
                          {task.task_number}
                        </TableCell>
                        <TableCell className="text-slate-600 font-medium">
                          {format(new Date(task.created_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-800">{type?.name}</div>
                          <div className="text-[11px] text-slate-500 uppercase font-bold mt-0.5">
                            {plant?.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-700 font-medium">
                          {assignee?.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-bold border-2"
                            style={{ borderColor: status?.color, color: status?.color }}
                          >
                            {status?.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-bold border-2',
                              sla.color,
                              'print:text-black print:border-black',
                            )}
                          >
                            {sla.isLate && !task.closed_at && (
                              <AlertTriangle className="w-3 h-3 mr-1 print:hidden" />
                            )}
                            {sla.text}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="dashboard" className="m-0 space-y-4 print:hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-deepBlue" />
            </div>
          ) : (
            <Tabs defaultValue="requisitante" className="w-full">
              <div className="flex justify-center mb-6">
                <TabsList className="bg-slate-100/80 p-1">
                  <TabsTrigger value="requisitante" className="rounded-md">
                    Por Requisitante
                  </TabsTrigger>
                  <TabsTrigger value="responsavel" className="rounded-md">
                    Por Responsável
                  </TabsTrigger>
                  <TabsTrigger value="planta" className="rounded-md">
                    Por Planta
                  </TabsTrigger>
                  <TabsTrigger value="tipo" className="rounded-md">
                    Por Tipo
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="requisitante" className="m-0">
                {metricsByRequester.length > 0
                  ? renderMetricCards(metricsByRequester)
                  : renderEmptyState()}
              </TabsContent>
              <TabsContent value="responsavel" className="m-0">
                {metricsByAssignee.length > 0
                  ? renderMetricCards(metricsByAssignee)
                  : renderEmptyState()}
              </TabsContent>
              <TabsContent value="planta" className="m-0">
                {metricsByPlant.length > 0 ? renderMetricCards(metricsByPlant) : renderEmptyState()}
              </TabsContent>
              <TabsContent value="tipo" className="m-0">
                {metricsByType.length > 0 ? renderMetricCards(metricsByType) : renderEmptyState()}
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>

        <TabsContent value="compras" className="m-0 space-y-4 print:hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-deepBlue" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm border-gray-200">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Tempo para RC
                    </div>
                    <div className="text-4xl font-black text-brand-deepBlue mb-1">
                      {formatDays(comprasMetrics.avgToRC)}{' '}
                      <span className="text-lg text-slate-500 font-medium">
                        {formatUnit(comprasMetrics.avgToRC)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Média de {comprasMetrics.countToRC} chamados
                    </div>
                    <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                      Tempo médio desde a abertura da tarefa até a criação da Requisição de Compras
                      (RC).
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-gray-200">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Tempo para Pedido
                    </div>
                    <div className="text-4xl font-black text-brand-deepBlue mb-1">
                      {formatDays(comprasMetrics.avgToPO)}{' '}
                      <span className="text-lg text-slate-500 font-medium">
                        {formatUnit(comprasMetrics.avgToPO)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Média de {comprasMetrics.countToPO} chamados
                    </div>
                    <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                      Tempo médio desde a RC até a data de emissão do Pedido de Compras.
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-gray-200">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Tempo de Entrega
                    </div>
                    <div className="text-4xl font-black text-brand-deepBlue mb-1">
                      {formatDays(comprasMetrics.avgToDelivery)}{' '}
                      <span className="text-lg text-slate-500 font-medium">
                        {formatUnit(comprasMetrics.avgToDelivery)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Média de {comprasMetrics.countToDelivery} chamados
                    </div>
                    <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                      Tempo médio desde a emissão do Pedido até a finalização do chamado (Entrega).
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
                <div className="p-4 border-b border-gray-200 bg-slate-50">
                  <h3 className="font-bold text-slate-800">Detalhamento dos Chamados de Compras</h3>
                  <p className="text-xs text-slate-500">
                    Listagem das tarefas consideradas nos cálculos acima.
                  </p>
                </div>
                <Table className="print:text-xs">
                  <TableHeader className="bg-slate-50 border-b border-gray-200 print:bg-transparent">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-800">Protocolo</TableHead>
                      <TableHead className="font-semibold text-slate-800">Tipo</TableHead>
                      <TableHead className="font-semibold text-slate-800 text-center">
                        T. RC
                      </TableHead>
                      <TableHead className="font-semibold text-slate-800 text-center">
                        T. Pedido
                      </TableHead>
                      <TableHead className="font-semibold text-slate-800 text-center">
                        T. Entrega
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comprasTasks.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-slate-500 font-medium"
                        >
                          Nenhum chamado de compras encontrado no período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      comprasTasks.map((task) => {
                        const type = taskTypes.find((t) => t.id === task.type_id)
                        const { diffRC, diffPO, diffDelivery } = getTaskDiffs(
                          task,
                          timelines,
                          taskStatuses,
                        )

                        return (
                          <TableRow
                            key={task.id}
                            className="hover:bg-slate-50 border-gray-100 print:border-b"
                          >
                            <TableCell className="font-medium text-slate-800">
                              {task.task_number}
                            </TableCell>
                            <TableCell className="text-slate-600 font-medium">
                              {type?.name}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {diffRC !== null
                                ? `${formatDays(diffRC)} ${formatUnit(diffRC)}`
                                : '-'}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {diffPO !== null
                                ? `${formatDays(diffPO)} ${formatUnit(diffPO)}`
                                : '-'}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {diffDelivery !== null
                                ? `${formatDays(diffDelivery)} ${formatUnit(diffDelivery)}`
                                : '-'}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
