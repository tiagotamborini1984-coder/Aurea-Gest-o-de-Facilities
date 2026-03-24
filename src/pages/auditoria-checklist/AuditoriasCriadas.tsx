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
import { Plus, Search, Loader2, ClipboardList, Edit, Trash2 } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function AuditoriasCriadas() {
  const { profile } = useAppStore()
  const hasAccess = useHasAccess('Auditoria e Checklist')
  const { toast } = useToast()
  const { plants } = useMasterData()

  const [audits, setAudits] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const loadData = async () => {
    if (!profile?.client_id) return
    setLoading(true)

    const { data: pData } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('client_id', profile.client_id)
    setUsers(pData || [])

    let query = supabase
      .from('audits')
      .select('*, audit_assignments(*)')
      .eq('client_id', profile.client_id)
      .order('created_at', { ascending: false })

    const { data } = await query

    let filteredAudits = data || []
    if (profile.role !== 'Administrador' && profile.role !== 'Master') {
      const authPlants = profile.authorized_plants || []
      filteredAudits = filteredAudits.filter((audit) => {
        const assignments = audit.audit_assignments || []
        return assignments.some((a: any) => authPlants.includes(a.plant_id))
      })
    }

    setAudits(filteredAudits)
    setLoading(false)

    // Simulate cron job to generate pending tasks if needed
    if (filteredAudits.length > 0) {
      checkAndGenerateTasks(filteredAudits, pData || [])
    }
  }

  useEffect(() => {
    loadData()
  }, [profile])

  const checkAndGenerateTasks = async (auditsList: any[], usersList: any[]) => {
    if (!profile?.client_id) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const audit of auditsList) {
      if (!audit.start_date) continue
      const parts = audit.start_date.split('-')
      if (parts.length !== 3) continue

      const start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      const advanceDays = audit.advance_notice_days || 0
      const triggerDate = new Date(start)
      triggerDate.setDate(triggerDate.getDate() - advanceDays)

      if (today >= triggerDate) {
        const { data: existing } = await supabase
          .from('audit_executions')
          .select('id, assignee_id, plant_id')
          .eq('audit_id', audit.id)
          .eq('status', 'Pendente')

        const existingSet = new Set(existing?.map((e) => `${e.assignee_id}-${e.plant_id}`) || [])

        let typeId: string | null = null
        let statusId: string | null = null

        const assignments = audit.audit_assignments || []
        for (const assign of assignments) {
          if (existingSet.has(`${assign.assignee_id}-${assign.plant_id}`)) continue

          if (!typeId) {
            const { data: typeRes } = await supabase
              .from('task_types')
              .select('id')
              .eq('client_id', profile.client_id)
              .ilike('name', '%Auditoria%')
              .limit(1)
            typeId = typeRes?.[0]?.id
            if (!typeId) {
              const { data: newType } = await supabase
                .from('task_types')
                .insert({ client_id: profile.client_id, name: 'Auditoria', sla_hours: 24 } as any)
                .select('id')
                .single()
              typeId = newType?.id
            }
          }

          if (!statusId) {
            const { data: statusRes } = await supabase
              .from('task_statuses')
              .select('id')
              .eq('client_id', profile.client_id)
              .eq('is_terminal', false)
              .order('created_at', { ascending: true })
              .limit(1)
            statusId = statusRes?.[0]?.id
            if (!statusId) {
              const { data: newStatus } = await supabase
                .from('task_statuses')
                .insert({
                  client_id: profile.client_id,
                  name: 'Pendente',
                  color: '#eab308',
                  is_terminal: false,
                } as any)
                .select('id')
                .single()
              statusId = newStatus?.id
            }
          }

          if (typeId && statusId) {
            const year = new Date().getFullYear()
            const { data: latest } = await supabase
              .from('tasks')
              .select('task_number')
              .eq('client_id', profile.client_id)
              .like('task_number', `TSK-${year}-%`)
              .order('created_at', { ascending: false })
              .limit(1)

            let seq = 1
            if (latest && latest.length > 0) {
              const p = latest[0].task_number.split('-')
              if (p.length === 3) seq = parseInt(p[2], 10) + 1
            }
            const taskNumber = `TSK-${year}-${seq.toString().padStart(4, '0')}`

            const { data: newTask } = await supabase
              .from('tasks')
              .insert({
                client_id: profile.client_id,
                plant_id: assign.plant_id,
                type_id: typeId,
                status_id: statusId,
                requester_id: profile.id,
                assignee_id: assign.assignee_id,
                task_number: taskNumber,
                title: `Auditoria: ${audit.title}`,
                description: `Por favor, realize a auditoria "${audit.title}" agendada para ${audit.start_date.split('-').reverse().join('/')}. Acesse os detalhes da tarefa para preencher o checklist.`,
                due_date: new Date(`${audit.start_date}T23:59:59.999Z`).toISOString(),
                status_updated_at: new Date().toISOString(),
              } as any)
              .select()
              .single()

            if (newTask) {
              await supabase.from('audit_executions').insert({
                audit_id: audit.id,
                task_id: newTask.id,
                assignee_id: assign.assignee_id,
                plant_id: assign.plant_id,
                status: 'Pendente',
              })
            }
          }
        }
      }
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await supabase.from('audits').delete().eq('id', deleteId)
      toast({ title: 'Auditoria excluída com sucesso!' })
      setDeleteId(null)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' })
    }
  }

  const filteredAudits = audits.filter((a) =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-deepBlue/10 p-2.5 rounded-xl border border-brand-deepBlue/20 shadow-sm">
            <ClipboardList className="h-6 w-6 text-brand-deepBlue" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Auditorias Criadas
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Visualize e edite as regras, perguntas e frequência das suas auditorias.
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar título..."
              className="pl-9 bg-white border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button asChild variant="tech">
            <Link to="/auditoria-checklist/configuracao">
              <Plus className="w-4 h-4 mr-2" /> Nova Auditoria
            </Link>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-slate-200">
            <TableRow>
              <TableHead className="font-semibold text-slate-800">Título da Auditoria</TableHead>
              <TableHead className="font-semibold text-slate-800">Tipo / Frequência</TableHead>
              <TableHead className="font-semibold text-slate-800">Data de Início</TableHead>
              <TableHead className="font-semibold text-slate-800">Antecedência</TableHead>
              <TableHead className="font-semibold text-slate-800">Responsáveis</TableHead>
              <TableHead className="font-semibold text-slate-800 text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-deepBlue" />
                </TableCell>
              </TableRow>
            ) : filteredAudits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Nenhuma auditoria criada encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredAudits.map((audit) => {
                const assignmentsCount = audit.audit_assignments?.length || 0
                return (
                  <TableRow key={audit.id} className="hover:bg-slate-50 border-slate-100">
                    <TableCell className="font-medium text-slate-800">{audit.title}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-700">{audit.type}</span>
                        <Badge variant="outline" className="w-fit text-[10px]">
                          {audit.frequency}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {audit.start_date
                        ? format(new Date(`${audit.start_date}T12:00:00Z`), 'dd/MM/yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {audit.advance_notice_days || 0} dias antes
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 shadow-none">
                        {assignmentsCount} local/responsável
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="text-brand-deepBlue hover:bg-brand-deepBlue/10"
                        >
                          <Link to={`/auditoria-checklist/configuracao/${audit.id}`}>
                            <Edit className="w-4 h-4 mr-2" /> Editar
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(audit.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
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

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Auditoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta auditoria? Todo o histórico de execução será
              mantido, mas novas tarefas não serão geradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
