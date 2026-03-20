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
      const sla = calculateSLA(task, type)

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
          <Label className="text-xs">De</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-36"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Até</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-36"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Planta</Label>
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
          <Label className="text-xs">Status</Label>
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
          <Label className="text-xs">Responsável</Label>
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
              <TableHead className="font-semibold text-slate-800 print:text-black">SLA</TableHead>
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
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Sem chamados no período.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {
                const type = taskTypes.find((t) => t.id === task.type_id)
                const status = taskStatuses.find((s) => s.id === task.status_id)
                const assignee = users.find((u) => u.id === task.assignee_id)
                const plant = plants.find((p) => p.id === task.plant_id)
                const sla = calculateSLA(task, type)

                return (
                  <TableRow
                    key={task.id}
                    className="hover:bg-slate-50 border-gray-100 print:border-b"
                  >
                    <TableCell className="font-medium">{task.task_number}</TableCell>
                    <TableCell className="text-slate-600">
                      {format(new Date(task.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-800">{type?.name}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{plant?.name}</div>
                    </TableCell>
                    <TableCell className="text-slate-700">{assignee?.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="font-medium"
                        style={{ borderColor: status?.color, color: status?.color }}
                      >
                        {status?.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-semibold',
                          sla.color,
                          'print:text-black print:border-black',
                        )}
                      >
                        {sla.percentage >= 100 && !task.closed_at && (
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
    </div>
  )
}
