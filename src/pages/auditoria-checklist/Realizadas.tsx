import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Loader2, ClipboardCheck, Printer, Eye, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { calculateSLA } from '@/lib/sla-utils'
import { useToast } from '@/hooks/use-toast'

export default function AuditoriaRealizadas() {
  const { profile } = useAppStore()
  const { toast } = useToast()

  function addFrequency(date: Date, frequency: string): Date {
    const d = new Date(date)
    switch (frequency) {
      case 'Diária':
        d.setUTCDate(d.getUTCDate() + 1)
        break
      case 'Semanal':
        d.setUTCDate(d.getUTCDate() + 7)
        break
      case 'Mensal':
        d.setUTCMonth(d.getUTCMonth() + 1)
        break
      case 'Semestral':
        d.setUTCMonth(d.getUTCMonth() + 6)
        break
      case 'Anual':
        d.setUTCFullYear(d.getUTCFullYear() + 1)
        break
      case 'Única':
      default:
        break
    }
    return d
  }
  const { plants } = useMasterData()
  const hasAccess = useHasAccess('Auditoria e Checklist')

  const [executions, setExecutions] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlant, setSelectedPlant] = useState('all')

  const [viewExec, setViewExec] = useState<any>(null)
  const [viewTask, setViewTask] = useState<any>(null)
  const [viewAnswers, setViewAnswers] = useState<any[]>([])
  const [viewHistory, setViewHistory] = useState<any[]>([])

  useEffect(() => {
    if (!profile) return
    const loadData = async () => {
      setLoading(true)
      const { data: pData } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('client_id', profile.client_id)
      setUsers(pData || [])

      let query = supabase
        .from('audit_executions')
        .select('*, audits!inner(*), tasks(due_date)')
        .eq('audits.client_id', profile.client_id)
        .order('created_at', { ascending: false })

      if (profile.role !== 'Administrador' && profile.role !== 'Master') {
        const authPlants = profile.authorized_plants || []
        if (authPlants.length > 0) {
          query = query.in('plant_id', authPlants)
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000')
        }
      }

      const { data: eData } = await query
      setExecutions(eData || [])
      setLoading(false)
    }
    loadData()
  }, [profile])

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  const filteredExecutions = executions.filter((e) => {
    const searchStr = searchTerm.toLowerCase()
    const matchesSearch =
      e.audits?.title.toLowerCase().includes(searchStr) ||
      e.audits?.type.toLowerCase().includes(searchStr) ||
      e.status.toLowerCase().includes(searchStr)

    const matchesPlant = selectedPlant === 'all' || e.plant_id === selectedPlant

    return matchesSearch && matchesPlant
  })

  const openView = async (exec: any) => {
    setViewExec(exec)
    const { data } = await supabase
      .from('audit_execution_answers')
      .select('*, audit_actions(*)')
      .eq('execution_id', exec.id)

    const sortedData = (data || []).sort((a: any, b: any) => {
      const orderA = a.audit_actions?.order_index || 0
      const orderB = b.audit_actions?.order_index || 0
      return orderA - orderB
    })
    setViewAnswers(sortedData)

    const { data: pendingExec } = await supabase
      .from('audit_executions')
      .select('*, tasks(*, task_statuses(*))')
      .eq('audit_id', exec.audit_id)
      .eq('plant_id', exec.plant_id)
      .eq('assignee_id', exec.assignee_id)
      .eq('status', 'Pendente')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pendingExec && pendingExec.tasks) {
      setViewTask(pendingExec.tasks)
    } else if (exec.task_id) {
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, task_statuses(*)')
        .eq('id', exec.task_id)
        .single()
      setViewTask(taskData || null)
    } else {
      setViewTask(null)
    }

    const { data: hData } = await supabase
      .from('audit_executions')
      .select('*, tasks(due_date)')
      .eq('audit_id', exec.audit_id)
      .eq('plant_id', exec.plant_id)
      .order('created_at', { ascending: false })

    setViewHistory(hData || [])
  }

  const handleForceGenerate = async (exec: any) => {
    try {
      setLoading(true)
      const { data: audit } = await supabase
        .from('audits')
        .select('*')
        .eq('id', exec.audit_id)
        .single()
      if (!audit) throw new Error('Auditoria não encontrada')

      let { data: typeRes } = await supabase
        .from('task_types')
        .select('id')
        .eq('client_id', audit.client_id)
        .ilike('name', '%Auditoria%')
        .limit(1)

      let typeId = typeRes?.[0]?.id
      if (!typeId) {
        const { data: fallback } = await supabase
          .from('task_types')
          .select('id')
          .eq('client_id', audit.client_id)
          .order('created_at', { ascending: true })
          .limit(1)
        typeId = fallback?.[0]?.id
      }

      let { data: statusRes } = await supabase
        .from('task_statuses')
        .select('id')
        .eq('client_id', audit.client_id)
        .eq('is_terminal', false)
        .order('created_at', { ascending: true })
        .limit(1)

      let statusId = statusRes?.[0]?.id

      if (!typeId || !statusId) throw new Error('Tipo ou Status de tarefa não configurado')

      const year = new Date().getFullYear()
      const { data: latest } = await supabase
        .from('tasks')
        .select('task_number')
        .eq('client_id', audit.client_id)
        .like('task_number', `TSK-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1)

      let seq = 1
      if (latest && latest.length > 0) {
        const p = latest[0].task_number.split('-')
        if (p.length === 3) seq = parseInt(p[2], 10) + 1
      }
      const taskNumber = `TSK-${year}-${seq.toString().padStart(4, '0')}`

      // Create new task
      const dueDateStr =
        exec.tasks?.due_date ||
        addFrequency(new Date(exec.created_at), audit.frequency).toISOString()

      const { data: newTask, error: taskErr } = await supabase
        .from('tasks')
        .insert({
          client_id: audit.client_id,
          plant_id: exec.plant_id,
          type_id: typeId,
          status_id: statusId,
          requester_id: profile.id,
          assignee_id: exec.assignee_id,
          task_number: taskNumber,
          title: `Auditoria: ${audit.title}`,
          description: `Por favor, realize a auditoria "${audit.title}" agendada para ${new Date(dueDateStr).toLocaleDateString('pt-BR')}. Acesse os detalhes da tarefa para preencher o checklist.`,
          due_date: dueDateStr,
          status_updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (taskErr) throw taskErr

      if (exec.status === 'Pendente') {
        // Just update existing execution with new task
        await supabase.from('audit_executions').update({ task_id: newTask.id }).eq('id', exec.id)
      } else {
        // Create new execution
        await supabase.from('audit_executions').insert({
          audit_id: audit.id,
          task_id: newTask.id,
          assignee_id: exec.assignee_id,
          plant_id: exec.plant_id,
          status: 'Pendente',
        })
      }

      toast({ title: 'Sucesso', description: 'Tarefa gerada com sucesso e vinculada à auditoria.' })

      // reload
      let query = supabase
        .from('audit_executions')
        .select('*, audits!inner(*), tasks(due_date)')
        .eq('audits.client_id', profile.client_id)
        .order('created_at', { ascending: false })

      if (profile.role !== 'Administrador' && profile.role !== 'Master') {
        const authPlants = profile.authorized_plants || []
        if (authPlants.length > 0) {
          query = query.in('plant_id', authPlants)
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000')
        }
      }

      const { data: eData } = await query
      setExecutions(eData || [])
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <div
        className={cn(
          'max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in print:max-w-none print:w-full',
          viewExec ? 'print:hidden' : 'print:block',
        )}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="bg-brand-deepBlue/10 p-2.5 rounded-xl border border-brand-deepBlue/20 shadow-sm">
              <ClipboardCheck className="h-6 w-6 text-brand-deepBlue" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Auditorias Realizadas
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Acompanhe as auditorias enviadas e finalizadas.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={selectedPlant} onValueChange={setSelectedPlant}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white border-slate-200">
                <SelectValue placeholder="Todas as Plantas" />
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

            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar título, tipo..."
                className="pl-9 bg-white border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="border-slate-200"
              disabled={executions.length === 0}
            >
              <Printer className="w-4 h-4 mr-2" /> Imprimir Lista
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
          <Table className="print:text-sm">
            <TableHeader className="bg-slate-50/80 border-b border-slate-200 print:bg-transparent">
              <TableRow>
                <TableHead className="font-semibold text-slate-800 print:text-black">
                  Título da Auditoria
                </TableHead>
                <TableHead className="font-semibold text-slate-800 print:text-black">
                  Tipo
                </TableHead>
                <TableHead className="font-semibold text-slate-800 print:text-black">
                  Planta
                </TableHead>
                <TableHead className="font-semibold text-slate-800 print:text-black">
                  Responsável
                </TableHead>
                <TableHead className="font-semibold text-slate-800 print:text-black">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-slate-800 print:text-black">
                  Score Final
                </TableHead>
                <TableHead className="font-semibold text-slate-800 text-right print:hidden">
                  Ação
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-deepBlue" />
                  </TableCell>
                </TableRow>
              ) : filteredExecutions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Nenhuma auditoria encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExecutions.map((exec) => {
                  const plant = plants.find((p) => p.id === exec.plant_id)
                  const user = users.find((u) => u.id === exec.assignee_id)
                  return (
                    <TableRow
                      key={exec.id}
                      className="hover:bg-slate-50 border-slate-100 print:border-b"
                    >
                      <TableCell className="font-medium text-slate-800">
                        {exec.audits?.title}
                        {exec.realization_date && (
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                            Realizada em: {format(new Date(exec.realization_date), 'dd/MM/yyyy')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">{exec.audits?.type}</TableCell>
                      <TableCell className="text-slate-600">{plant?.name || '-'}</TableCell>
                      <TableCell className="text-slate-600">{user?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-bold',
                            exec.status === 'Finalizado'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-amber-100 text-amber-800 border-amber-300',
                          )}
                        >
                          {exec.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {exec.status === 'Finalizado' ? (
                          <div className="flex items-baseline gap-1">
                            <span className="font-bold text-brand-deepBlue text-lg">
                              {exec.final_score}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              / {exec.max_score}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right print:hidden">
                        <div className="flex justify-end gap-2 items-center">
                          {(profile.role === 'Administrador' || profile.role === 'Master') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleForceGenerate(exec)}
                              title="Forçar Geração de Tarefa"
                              className="text-slate-500 hover:text-brand-deepBlue px-2"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openView(exec)}
                            className="text-brand-deepBlue hover:bg-brand-deepBlue/10"
                          >
                            <Eye className="w-4 h-4 mr-2" /> Detalhes
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={!!viewExec}
        onOpenChange={(open) => {
          if (!open) {
            setViewExec(null)
            setViewTask(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto print:hidden">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-xl">Relatório: {viewExec?.audits?.title}</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="print:hidden hidden sm:flex"
              >
                <Printer className="w-4 h-4 mr-2" /> Imprimir
              </Button>
            </div>
          </DialogHeader>
          {viewExec && (
            <Tabs defaultValue="details" className="w-full mt-4">
              <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-6">
                <TabsTrigger value="details">Detalhes da Execução</TabsTrigger>
                <TabsTrigger value="history">Histórico de Recorrências</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                      Status
                    </p>
                    <p className="font-semibold text-slate-800">{viewExec.status}</p>
                  </div>
                  {viewTask && viewTask.task_statuses ? (
                    (() => {
                      const slaResult = calculateSLA(viewTask, viewTask.task_statuses, [])
                      return (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                            {viewTask.id !== viewExec.task_id ? 'SLA Próxima' : 'SLA'}
                          </p>
                          <Badge variant="outline" className={cn('font-bold', slaResult.color)}>
                            {slaResult.text}
                          </Badge>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                        SLA Próxima
                      </p>
                      <p className="font-semibold text-slate-400">-</p>
                    </div>
                  )}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                      Score
                    </p>
                    <p className="font-semibold text-brand-deepBlue">
                      {viewExec.final_score || 0} / {viewExec.max_score || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                      Data Realização
                    </p>
                    <p className="font-semibold text-slate-800">
                      {viewExec.realization_date
                        ? format(new Date(viewExec.realization_date), 'dd/MM/yyyy')
                        : '-'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                      Participantes
                    </p>
                    <p
                      className="font-semibold text-slate-800 truncate"
                      title={viewExec.participants}
                    >
                      {viewExec.participants || '-'}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-3 text-lg border-b pb-2">Respostas</h4>
                  {viewAnswers.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nenhuma resposta registrada (Auditoria Pendente).
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {viewAnswers.map((ans, idx) => (
                        <div
                          key={ans.id}
                          className="flex flex-col p-4 border border-slate-200 rounded-xl bg-white shadow-sm"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="font-medium text-slate-800 text-sm">
                                <span className="text-slate-400 mr-2">{idx + 1}.</span>
                                {ans.audit_actions?.title}
                              </p>
                              {ans.evidence_url && (
                                <a
                                  href={ans.evidence_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block mt-2 text-xs text-brand-deepBlue hover:underline bg-brand-deepBlue/5 px-2 py-1 rounded border border-brand-deepBlue/10"
                                >
                                  Ver Evidência Anexada
                                </a>
                              )}
                            </div>
                            <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 border border-slate-200 text-lg font-black text-brand-deepBlue">
                              {ans.score}
                            </div>
                          </div>
                          {ans.observations && (
                            <div className="mt-3 pt-3 border-t border-slate-50">
                              <p className="text-xs text-slate-500">
                                <strong className="font-semibold text-slate-600">
                                  Observações:
                                </strong>{' '}
                                {ans.observations}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t border-slate-100 sm:hidden">
                  <Button onClick={handlePrint} className="w-full">
                    <Printer className="w-4 h-4 mr-2" /> Imprimir Relatório
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="font-semibold text-slate-800">Status</TableHead>
                        <TableHead className="font-semibold text-slate-800">Gerada em</TableHead>
                        <TableHead className="font-semibold text-slate-800">Prazo (SLA)</TableHead>
                        <TableHead className="font-semibold text-slate-800">Realizada em</TableHead>
                        <TableHead className="font-semibold text-slate-800">Score</TableHead>
                        <TableHead className="font-semibold text-slate-800">Responsável</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                            Nenhum histórico encontrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        viewHistory.map((hExec) => {
                          const user = users.find((u) => u.id === hExec.assignee_id)
                          return (
                            <TableRow
                              key={hExec.id}
                              className={hExec.id === viewExec.id ? 'bg-brand-deepBlue/5' : ''}
                            >
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'font-bold',
                                    hExec.status === 'Finalizado'
                                      ? 'bg-green-100 text-green-800 border-green-200'
                                      : 'bg-amber-100 text-amber-800 border-amber-300',
                                  )}
                                >
                                  {hExec.status}
                                </Badge>
                                {hExec.id === viewExec.id && (
                                  <span className="ml-2 text-[10px] font-bold text-brand-deepBlue uppercase">
                                    Atual
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-slate-600">
                                {format(new Date(hExec.created_at), 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell className="text-slate-600 font-medium">
                                {hExec.tasks?.due_date
                                  ? format(new Date(hExec.tasks.due_date), 'dd/MM/yyyy')
                                  : '-'}
                              </TableCell>
                              <TableCell className="text-slate-600">
                                {hExec.realization_date
                                  ? format(new Date(hExec.realization_date), 'dd/MM/yyyy')
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {hExec.status === 'Finalizado' ? (
                                  <div className="flex items-baseline gap-1">
                                    <span className="font-bold text-slate-800">
                                      {hExec.final_score}
                                    </span>
                                    <span className="text-xs text-slate-500 font-medium">
                                      / {hExec.max_score}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-slate-600">{user?.name || '-'}</TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Print-only View for Specific Audit Report */}
      {viewExec && (
        <div className="hidden print:block text-black bg-white w-full print:m-0 print:p-0">
          <div className="mb-6 border-b-2 border-slate-800 pb-4">
            <h1 className="text-3xl font-black text-slate-900">Relatório de Auditoria</h1>
            <h2 className="text-xl text-slate-700 mt-1 font-semibold">{viewExec.audits?.title}</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
            <div className="p-3 bg-slate-50 rounded border border-slate-200 break-inside-avoid">
              <span className="block text-slate-500 text-xs font-bold uppercase mb-1">Planta</span>
              <span className="font-semibold text-slate-800">
                {plants.find((p) => p.id === viewExec.plant_id)?.name || '-'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200 break-inside-avoid">
              <span className="block text-slate-500 text-xs font-bold uppercase mb-1">
                Responsável
              </span>
              <span className="font-semibold text-slate-800">
                {users.find((u) => u.id === viewExec.assignee_id)?.name || '-'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200 break-inside-avoid">
              <span className="block text-slate-500 text-xs font-bold uppercase mb-1">
                Data de Realização
              </span>
              <span className="font-semibold text-slate-800">
                {viewExec.realization_date
                  ? format(new Date(viewExec.realization_date), 'dd/MM/yyyy')
                  : '-'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200 break-inside-avoid">
              <span className="block text-slate-500 text-xs font-bold uppercase mb-1">
                Participantes
              </span>
              <span className="font-semibold text-slate-800">{viewExec.participants || '-'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200 break-inside-avoid">
              <span className="block text-slate-500 text-xs font-bold uppercase mb-1">Status</span>
              <span className="font-semibold text-slate-800">{viewExec.status}</span>
            </div>
            {viewTask && viewTask.task_statuses ? (
              (() => {
                const slaResult = calculateSLA(viewTask, viewTask.task_statuses, [])
                return (
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 break-inside-avoid">
                    <span className="block text-slate-500 text-xs font-bold uppercase mb-1">
                      {viewTask.id !== viewExec.task_id ? 'SLA Próxima Auditoria' : 'SLA'}
                    </span>
                    <span className="font-semibold text-slate-800">{slaResult.text}</span>
                  </div>
                )
              })()
            ) : (
              <div className="p-3 bg-slate-50 rounded border border-slate-200 break-inside-avoid">
                <span className="block text-slate-500 text-xs font-bold uppercase mb-1">
                  SLA Próxima Auditoria
                </span>
                <span className="font-semibold text-slate-400">-</span>
              </div>
            )}
            <div className="p-3 bg-slate-50 rounded border border-slate-200 break-inside-avoid">
              <span className="block text-slate-500 text-xs font-bold uppercase mb-1">
                Score Final
              </span>
              <span className="font-black text-lg text-slate-800">
                {viewExec.final_score || 0}{' '}
                <span className="text-sm font-medium text-slate-500">
                  / {viewExec.max_score || 0}
                </span>
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold border-b-2 border-slate-200 pb-2 mb-4 text-slate-800">
              Detalhes das Respostas
            </h3>
            {viewAnswers.length === 0 ? (
              <p className="text-slate-500 italic">Nenhuma resposta registrada.</p>
            ) : (
              <table className="w-full text-left border-collapse mt-4">
                <thead>
                  <tr className="bg-slate-100 text-slate-800">
                    <th className="py-3 px-4 font-bold border-b border-slate-300 w-12 text-center">
                      #
                    </th>
                    <th className="py-3 px-4 font-bold border-b border-slate-300">Ação Avaliada</th>
                    <th className="py-3 px-4 font-bold border-b border-slate-300 w-24 text-center">
                      Nota
                    </th>
                    <th className="py-3 px-4 font-bold border-b border-slate-300 w-1/3">
                      Observações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {viewAnswers.map((ans, idx) => (
                    <tr key={ans.id} className="border-b border-slate-200 break-inside-avoid">
                      <td className="py-4 px-4 text-center font-medium text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-slate-800">{ans.audit_actions?.title}</div>
                        {ans.evidence_url && (
                          <div className="text-xs text-blue-600 mt-1 font-medium">
                            ✓ Evidência Anexada
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-block w-8 h-8 rounded-full bg-slate-100 border border-slate-300 leading-8 text-center font-bold text-slate-800">
                          {ans.score}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {ans.observations || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between text-sm text-slate-500 print:fixed print:bottom-0 print:w-full print:bg-white">
            <span>Impresso em: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
            <span>Sistema Aurea Facility Management</span>
          </div>
        </div>
      )}
    </>
  )
}
