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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { format, subDays } from 'date-fns'
import { exportToCSV } from '@/lib/export'
import { calculateSLA } from '@/lib/sla-utils'
import { cn } from '@/lib/utils'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'

export default function RelatoriosTarefas() {
  const { profile } = useAppStore()
  const { plants } = useMasterData()
  const hasAccess = useHasAccess('Gestão de Tarefas')

  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [filterPlant, setFilterPlant] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')

  const [tasks, setTasks] = useState<any[]>([])
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

  const metricsByAssignee = users
    .map((user) => {
      const userTasks = tasks.filter((t) => t.assignee_id === user.id)
      let totalActive = 0
      let onTime = 0
      let late = 0

      userTasks.forEach((task) => {
        const status = taskStatuses.find((s) => s.id === task.status_id)
        if (status && !status.is_terminal && !status.freeze_sla && status.sla_days > 0) {
          totalActive++
          const sla = calculateSLA(task, status)
          if (sla.isLate) {
            late++
          } else {
            onTime++
          }
        }
      })

      const adherence = totalActive > 0 ? (onTime / totalActive) * 100 : 100

      return {
        name: user.name,
        totalActive,
        onTime,
        late,
        adherence,
      }
    })
    .filter((m) => m.totalActive > 0)
    .sort((a, b) => b.adherence - a.adherence)

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

      <Tabs defaultValue="lista" className="space-y-6 print:block">
        <TabsList className="bg-white border border-gray-200 print:hidden h-12 w-full sm:w-auto">
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
        </TabsList>

        <TabsContent value="lista" className="m-0 space-y-4">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="border-b border-gray-100 bg-slate-50/50 pb-4">
                <CardTitle className="text-lg font-bold text-slate-800">
                  Aderência Atual por Responsável
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100 hover:bg-slate-100">
                      <TableHead className="font-bold text-slate-800">Responsável</TableHead>
                      <TableHead className="text-center font-bold text-slate-800">
                        Tarefas Ativas
                      </TableHead>
                      <TableHead className="text-center font-bold text-green-700">
                        No Prazo
                      </TableHead>
                      <TableHead className="text-center font-bold text-red-700">
                        Atrasados
                      </TableHead>
                      <TableHead className="text-right font-bold text-slate-800">
                        Aderência
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-deepBlue" />
                        </TableCell>
                      </TableRow>
                    ) : metricsByAssignee.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-10 text-slate-500 font-medium"
                        >
                          Nenhum responsável com tarefas ativas pendentes.
                        </TableCell>
                      </TableRow>
                    ) : (
                      metricsByAssignee.map((m) => (
                        <TableRow key={m.name} className="hover:bg-slate-50">
                          <TableCell className="font-bold text-slate-700">{m.name}</TableCell>
                          <TableCell className="text-center font-bold text-slate-600">
                            {m.totalActive}
                          </TableCell>
                          <TableCell className="text-center text-green-600 font-extrabold">
                            {m.onTime}
                          </TableCell>
                          <TableCell className="text-center text-red-600 font-extrabold">
                            {m.late}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={cn(
                                'font-bold text-sm px-3 border-2',
                                m.adherence >= 80
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-700 border-red-200',
                              )}
                            >
                              {m.adherence.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 flex flex-col">
              <CardHeader className="border-b border-gray-100 bg-slate-50/50 pb-4">
                <CardTitle className="text-lg font-bold text-slate-800">
                  Gráfico de Aderência (%)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-6 min-h-[350px]">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-deepBlue" />
                  </div>
                ) : metricsByAssignee.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 font-medium">
                    Sem dados suficientes
                  </div>
                ) : (
                  <ChartContainer
                    config={{ adherence: { label: 'Aderência', color: 'hsl(var(--primary))' } }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={metricsByAssignee}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="name"
                          fontSize={13}
                          fontWeight="bold"
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          fontSize={13}
                          fontWeight="bold"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <RechartsTooltip
                          cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                          content={<ChartTooltipContent />}
                        />
                        <Bar dataKey="adherence" radius={[6, 6, 0, 0]}>
                          {metricsByAssignee.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.adherence >= 80 ? '#22c55e' : '#ef4444'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
