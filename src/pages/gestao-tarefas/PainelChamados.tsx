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
import {
  CheckSquare,
  Plus,
  Search,
  Loader2,
  AlertTriangle,
  Send,
  Inbox,
  ListFilter,
  PauseCircle,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { TaskDetailsSheet } from './TaskDetailsSheet'
import { calculateSLA } from '@/lib/sla-utils'
import { cn } from '@/lib/utils'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'

export default function PainelChamados() {
  const { profile } = useAppStore()
  const { plants } = useMasterData()
  const hasAccess = useHasAccess('Gestão de Tarefas')
  const { toast } = useToast()

  const [tasks, setTasks] = useState<any[]>([])
  const [taskTypes, setTaskTypes] = useState<any[]>([])
  const [taskStatuses, setTaskStatuses] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterPlant, setFilterPlant] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')

  const isManager =
    profile?.role === 'Administrador' || profile?.role === 'Master' || profile?.role === 'Gestor'
  const [activeTab, setActiveTab] = useState(isManager ? 'todos' : 'recebidos')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [selectedTask, setSelectedTask] = useState<any>(null)

  const [form, setForm] = useState({
    plant_id: '',
    type_id: '',
    assignee_id: '',
    title: '',
    description: '',
  })

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
      .order('created_at', { ascending: false })

    if (!isManager) {
      query = query.or(`requester_id.eq.${profile.id},assignee_id.eq.${profile.id}`)
    }

    const { data } = await query
    setTasks(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [profile])

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  const handleOpenAdd = () => {
    if (taskTypes.length === 0 || taskStatuses.length === 0) {
      toast({
        title: 'Configuração Incompleta',
        description: 'Cadastre Tipos e Status de chamados primeiro.',
        variant: 'destructive',
      })
      return
    }
    setForm({ plant_id: '', type_id: '', assignee_id: '', title: '', description: '' })
    setSelectedFile(null)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.plant_id || !form.type_id || !form.assignee_id || !form.title || !form.description)
      return
    setIsSubmitting(true)

    try {
      let attachment_url = null
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${profile.client_id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('task-attachments')
          .upload(filePath, selectedFile)
        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('task-attachments')
          .getPublicUrl(filePath)
        attachment_url = publicUrlData.publicUrl
      }

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
        const parts = latest[0].task_number.split('-')
        if (parts.length === 3) seq = parseInt(parts[2], 10) + 1
      }
      const taskNumber = `TSK-${year}-${seq.toString().padStart(4, '0')}`

      const initialStatus = taskStatuses[0]?.id

      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          client_id: profile.client_id,
          plant_id: form.plant_id,
          type_id: form.type_id,
          status_id: initialStatus,
          requester_id: profile.id,
          assignee_id: form.assignee_id,
          task_number: taskNumber,
          title: form.title,
          description: form.description,
          attachment_url,
          status_updated_at: new Date().toISOString(),
        } as any)
        .select()
        .single()

      if (error) throw error

      await supabase.from('task_timeline').insert({
        task_id: newTask.id,
        user_id: profile.id,
        content: `Chamado aberto.`,
        action_type: 'comment',
      })

      toast({
        title: 'Chamado criado com sucesso!',
        description: `Protocolo: ${taskNumber}`,
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao criar chamado', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredTasks = tasks.filter((t) => {
    const matchPlant = filterPlant === 'all' || t.plant_id === filterPlant
    const matchStatus = filterStatus === 'all' || t.status_id === filterStatus
    const matchAssignee = filterAssignee === 'all' || t.assignee_id === filterAssignee
    const matchSearch =
      t.task_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.title && t.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase())

    let matchTab = true
    if (activeTab === 'enviados') matchTab = t.requester_id === profile.id
    if (activeTab === 'recebidos') matchTab = t.assignee_id === profile.id

    return matchPlant && matchStatus && matchAssignee && matchSearch && matchTab
  })

  const tabs = [
    ...(isManager ? [{ id: 'todos', label: 'Todos', icon: ListFilter }] : []),
    { id: 'enviados', label: 'Enviados', icon: Send },
    { id: 'recebidos', label: 'Recebidos', icon: Inbox },
  ]

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-deepBlue/10 p-2.5 rounded-xl border border-brand-deepBlue/20 shadow-sm">
            <CheckSquare className="h-6 w-6 text-brand-deepBlue" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Gestão de Tarefas
            </h2>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Abra chamados, acompanhe SLAs e interaja na linha do tempo.
            </p>
          </div>
        </div>
        <Button onClick={handleOpenAdd} variant="tech" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Novo Chamado
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex bg-slate-100 p-1.5 rounded-xl w-full sm:w-fit border border-slate-200/80 shadow-sm overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'flex items-center gap-2 flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                activeTab === t.id
                  ? 'bg-white text-brand-deepBlue shadow-sm ring-1 ring-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50',
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col xl:flex-row gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex-1 flex items-center px-3 gap-2 xl:border-r border-gray-200">
            <Search className="w-5 h-5 text-slate-500" />
            <Input
              placeholder="Buscar protocolo, nome ou descrição..."
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full xl:w-56 border-t xl:border-t-0 xl:border-l border-gray-200 pl-0 xl:pl-4 pt-3 xl:pt-0">
            <Select value={filterPlant} onValueChange={setFilterPlant}>
              <SelectTrigger className="border-0 shadow-none bg-transparent">
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
          </div>
          <div className="w-full xl:w-56 border-t xl:border-t-0 xl:border-l border-gray-200 pl-0 xl:pl-4 pt-3 xl:pt-0">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="border-0 shadow-none bg-transparent">
                <SelectValue placeholder="Status" />
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
          {isManager && (
            <div className="w-full xl:w-56 border-t xl:border-t-0 xl:border-l border-gray-200 pl-0 xl:pl-4 pt-3 xl:pt-0">
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="border-0 shadow-none bg-transparent">
                  <SelectValue placeholder="Responsável" />
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
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-gray-200">
            <TableRow>
              <TableHead className="font-semibold text-slate-800">Protocolo</TableHead>
              <TableHead className="font-semibold text-slate-800">Nome</TableHead>
              <TableHead className="font-semibold text-slate-800">Planta</TableHead>
              <TableHead className="font-semibold text-slate-800">Tipo</TableHead>
              <TableHead className="font-semibold text-slate-800">Solicitante</TableHead>
              <TableHead className="font-semibold text-slate-800">Responsável</TableHead>
              <TableHead className="font-semibold text-slate-800">Status</TableHead>
              <TableHead className="font-semibold text-slate-800">SLA Atual</TableHead>
              <TableHead className="font-semibold text-slate-800 text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-deepBlue" />
                </TableCell>
              </TableRow>
            ) : filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                  Nenhum chamado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => {
                const type = taskTypes.find((t) => t.id === task.type_id)
                const status = taskStatuses.find((s) => s.id === task.status_id)
                const requester = users.find((u) => u.id === task.requester_id)
                const assignee = users.find((u) => u.id === task.assignee_id)
                const plant = plants.find((p) => p.id === task.plant_id)
                const sla = calculateSLA(task, status)

                return (
                  <TableRow key={task.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-800">{task.task_number}</TableCell>
                    <TableCell className="font-medium text-slate-800">
                      {task.title || '-'}
                    </TableCell>
                    <TableCell className="text-slate-600">{plant?.name || '-'}</TableCell>
                    <TableCell className="text-slate-600">{type?.name || '-'}</TableCell>
                    <TableCell className="text-slate-600">{requester?.name || '-'}</TableCell>
                    <TableCell className="text-slate-600">{assignee?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        className="font-medium text-white border-0 shadow-sm"
                        style={{ backgroundColor: status?.color || '#94a3b8' }}
                      >
                        {status?.name || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('font-semibold', sla.color)}>
                        {sla.percentage >= 100 && !task.closed_at && !status?.freeze_sla && (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        )}
                        {status?.freeze_sla && !task.closed_at && (
                          <PauseCircle className="w-3 h-3 mr-1" />
                        )}
                        {sla.text}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTask(task)}
                        className="text-brand-deepBlue hover:bg-brand-deepBlue/10"
                      >
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo Chamado</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome do Chamado *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Manutenção do Ar Condicionado"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Planta *</Label>
                <Select
                  value={form.plant_id}
                  onValueChange={(v) => setForm({ ...form, plant_id: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Chamado *</Label>
                <Select
                  value={form.type_id}
                  onValueChange={(v) => setForm({ ...form, type_id: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Responsável (Atribuir a) *</Label>
                <Select
                  value={form.assignee_id}
                  onValueChange={(v) => setForm({ ...form, assignee_id: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Descrição do Chamado *</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  className="resize-none"
                  rows={4}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Anexo</Label>
                <Input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept="image/*,.pdf,.doc,.docx"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="tech" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Abrir
                Chamado
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <TaskDetailsSheet
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        taskStatuses={taskStatuses}
        users={users}
        onTaskUpdated={loadData}
      />
    </div>
  )
}
