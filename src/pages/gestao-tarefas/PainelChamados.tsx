import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/store/AppContext'
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
  X,
  Paperclip,
  ChevronDown,
  Users,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { TaskDetailsSheet } from './TaskDetailsSheet'
import { calculateSLA } from '@/lib/sla-utils'
import { cn } from '@/lib/utils'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'

function SLACountdown({
  task,
  status,
  nonWorkingDays,
}: {
  task: any
  status: any
  nonWorkingDays: string[]
}) {
  const [sla, setSla] = useState(() => calculateSLA(task, status, nonWorkingDays))

  useEffect(() => {
    if (status?.is_terminal || status?.freeze_sla || task.closed_at) {
      setSla(calculateSLA(task, status, nonWorkingDays))
      return
    }

    const interval = setInterval(() => {
      setSla(calculateSLA(task, status, nonWorkingDays))
    }, 1000)

    return () => clearInterval(interval)
  }, [task, status, nonWorkingDays])

  return (
    <Badge
      variant="outline"
      className={cn('font-semibold tabular-nums whitespace-nowrap', sla.color)}
    >
      {sla.percentage >= 100 && !task.closed_at && !status?.freeze_sla && (
        <AlertTriangle className="w-3 h-3 mr-1" />
      )}
      {status?.freeze_sla && !task.closed_at && <PauseCircle className="w-3 h-3 mr-1" />}
      {sla.text}
    </Badge>
  )
}

export default function PainelChamados() {
  const { profile, selectedMasterClient } = useAppStore()
  const hasAccess = useHasAccess('Gestão de Tarefas')
  const { toast } = useToast()

  const [tasks, setTasks] = useState<any[]>([])
  const [taskTypes, setTaskTypes] = useState<any[]>([])
  const [taskStatuses, setTaskStatuses] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [nonWorkingDays, setNonWorkingDays] = useState<string[]>([])
  const [localPlants, setLocalPlants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')

  const [searchParams, setSearchParams] = useSearchParams()

  const filterPlant = searchParams.get('plant') || 'all'
  const setFilterPlant = (val: string) => {
    setSearchParams(
      (prev) => {
        if (val === 'all') prev.delete('plant')
        else prev.set('plant', val)
        return prev
      },
      { replace: true },
    )
  }

  const filterAssignee = searchParams.get('assignee') || 'all'
  const setFilterAssignee = (val: string) => {
    setSearchParams(
      (prev) => {
        if (val === 'all') prev.delete('assignee')
        else prev.set('assignee', val)
        return prev
      },
      { replace: true },
    )
  }

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  const isMaster = profile?.role === 'Master'
  const isSuperAdmin = profile?.role === 'Administrador' || profile?.role === 'Master'
  const showTodos = isSuperAdmin

  const activeTab = searchParams.get('tab') || (showTodos ? 'todos' : 'recebidos')
  const setActiveTab = (val: string) => {
    setSearchParams(
      (prev) => {
        prev.set('tab', val)
        return prev
      },
      { replace: true },
    )
  }

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const [selectedTask, setSelectedTask] = useState<any>(null)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<any>(null)
  const [deleteJustification, setDeleteJustification] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [form, setForm] = useState({
    plant_id: '',
    type_id: '',
    assignee_id: '',
    title: '',
    description: '',
  })

  const effectiveClientId = isMaster ? selectedMasterClient : profile?.client_id

  useEffect(() => {
    if (!showTodos && activeTab === 'todos') {
      setActiveTab('recebidos')
    }
  }, [showTodos, activeTab])

  useEffect(() => {
    if (taskStatuses.length > 0) {
      setSelectedStatuses(taskStatuses.filter((s) => !s.is_terminal).map((s) => s.id))
    } else {
      setSelectedStatuses([])
    }
  }, [taskStatuses])

  const loadData = async () => {
    if (!effectiveClientId) return
    setLoading(true)

    try {
      let tRes, sRes, uRes, nwdRes, pRes

      if (effectiveClientId === 'all') {
        ;[tRes, sRes, uRes, nwdRes, pRes] = await Promise.all([
          supabase.from('task_types').select('*'),
          supabase.from('task_statuses').select('*').order('created_at', { ascending: true }),
          supabase.from('profiles').select('id, name, email, role, client_id'),
          supabase.from('plant_non_working_days').select('date'),
          supabase.from('plants').select('*'),
        ])
      } else {
        ;[tRes, sRes, uRes, nwdRes, pRes] = await Promise.all([
          supabase.from('task_types').select('*').eq('client_id', effectiveClientId),
          supabase
            .from('task_statuses')
            .select('*')
            .eq('client_id', effectiveClientId)
            .order('created_at', { ascending: true }),
          supabase
            .from('profiles')
            .select('id, name, email, role, client_id')
            .eq('client_id', effectiveClientId),
          supabase.from('plant_non_working_days').select('date').eq('client_id', effectiveClientId),
          supabase.from('plants').select('*').eq('client_id', effectiveClientId),
        ])
      }

      setTaskTypes(tRes.data || [])
      setTaskStatuses(sRes.data || [])
      setUsers(uRes.data || [])
      setNonWorkingDays(nwdRes.data?.map((n) => n.date) || [])

      let plantsData = pRes.data || []
      if (!isSuperAdmin && profile?.authorized_plants) {
        plantsData = plantsData.filter((p: any) => profile.authorized_plants.includes(p.id))
      }
      setLocalPlants(plantsData)

      let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })

      if (effectiveClientId !== 'all') {
        query = query.eq('client_id', effectiveClientId)
      }

      if (!isSuperAdmin) {
        query = query.or(
          `requester_id.eq.${profile?.id},assignee_id.eq.${profile?.id},participants_ids.cs.{${profile?.id}}`,
        )

        const authPlants = profile?.authorized_plants || []
        if (authPlants.length > 0) {
          query = query.in('plant_id', authPlants)
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000')
        }
      }

      const { data } = await query
      setTasks(data || [])
      setSelectedTask((prev: any) => {
        if (!prev) return null
        return data?.find((t: any) => t.id === prev.id) || prev
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const prevClientRef = useRef(effectiveClientId)
  useEffect(() => {
    if (effectiveClientId) {
      if (prevClientRef.current && prevClientRef.current !== effectiveClientId) {
        setSearchParams(
          (prev) => {
            prev.delete('plant')
            prev.delete('assignee')
            return prev
          },
          { replace: true },
        )
      }
      prevClientRef.current = effectiveClientId
      loadData()
    }
  }, [effectiveClientId])

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  const handleOpenAdd = () => {
    if (effectiveClientId === 'all') {
      toast({
        title: 'Selecione um cliente',
        description:
          'Para abrir um chamado, selecione um cliente específico no filtro do topo da página.',
        variant: 'destructive',
      })
      return
    }
    if (taskTypes.length === 0 || taskStatuses.length === 0) {
      toast({
        title: 'Configuração Incompleta',
        description: 'Cadastre Tipos e Status de chamados primeiro.',
        variant: 'destructive',
      })
      return
    }
    setForm({ plant_id: '', type_id: '', assignee_id: '', title: '', description: '' })
    setSelectedFiles([])
    setIsModalOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.plant_id || !form.type_id || !form.assignee_id || !form.title || !form.description)
      return
    setIsSubmitting(true)

    try {
      let attachment_urls: string[] = []

      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `${effectiveClientId}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('task-attachments')
            .upload(filePath, file)
          if (uploadError) throw uploadError

          const { data: publicUrlData } = supabase.storage
            .from('task-attachments')
            .getPublicUrl(filePath)

          attachment_urls.push(publicUrlData.publicUrl)
        }
      }

      const year = new Date().getFullYear()
      const { data: latest } = await supabase
        .from('tasks')
        .select('task_number')
        .eq('client_id', effectiveClientId)
        .like('task_number', `TSK-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1)

      let seq = 1
      if (latest && latest.length > 0) {
        const parts = latest[0].task_number.split('-')
        if (parts.length === 3) seq = parseInt(parts[2], 10) + 1
      }
      const taskNumber = `TSK-${year}-${seq.toString().padStart(4, '0')}`

      // Filter statuses for this specific client to ensure we pick a valid one
      const clientStatuses = taskStatuses.filter((s) => s.client_id === effectiveClientId)
      const initialStatus = clientStatuses[0]?.id

      if (!initialStatus) throw new Error('Nenhum status configurado para este cliente.')

      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          client_id: effectiveClientId as string,
          plant_id: form.plant_id,
          type_id: form.type_id,
          status_id: initialStatus,
          requester_id: profile.id,
          assignee_id: form.assignee_id,
          task_number: taskNumber,
          title: form.title,
          description: form.description,
          attachment_url: attachment_urls.length > 0 ? attachment_urls[0] : null,
          attachment_urls,
          status_updated_at: new Date().toISOString(),
          participants_ids: [],
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

  const handleDeleteClick = (task: any) => {
    setTaskToDelete(task)
    setDeleteJustification('')
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteJustification.trim() || !taskToDelete) {
      toast({
        title: 'Atenção',
        description: 'A justificativa é obrigatória.',
        variant: 'destructive',
      })
      return
    }

    setIsDeleting(true)
    try {
      const taskClientId = taskToDelete.client_id
      let deletedStatus = taskStatuses.find(
        (s) =>
          s.client_id === taskClientId &&
          (s.name.toLowerCase() === 'excluída' || s.name.toLowerCase() === 'excluida'),
      )

      if (!deletedStatus) {
        const { data: newStatus, error: createErr } = await supabase
          .from('task_statuses')
          .insert({
            client_id: taskClientId,
            name: 'Excluída',
            color: '#ef4444',
            is_terminal: true,
            freeze_sla: true,
          })
          .select()
          .single()

        if (createErr) throw createErr
        deletedStatus = newStatus
        setTaskStatuses((prev) => [...prev, newStatus])
      }

      const { error: updateErr } = await supabase
        .from('tasks')
        .update({ status_id: deletedStatus.id, closed_at: new Date().toISOString() })
        .eq('id', taskToDelete.id)

      if (updateErr) throw updateErr

      await supabase.from('task_timeline').insert({
        task_id: taskToDelete.id,
        user_id: profile.id,
        content: `Tarefa excluída. Justificativa: ${deleteJustification}`,
        action_type: 'comment',
      })

      toast({ title: 'Sucesso', description: 'Tarefa excluída com sucesso.' })
      setIsDeleteModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredTasks = tasks.filter((t) => {
    const matchPlant = filterPlant === 'all' || t.plant_id === filterPlant
    const matchStatus = selectedStatuses.includes(t.status_id)
    const matchAssignee = filterAssignee === 'all' || t.assignee_id === filterAssignee
    const matchSearch =
      t.task_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.title && t.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase())

    let matchTab = true
    if (activeTab === 'enviados') matchTab = t.requester_id === profile.id
    if (activeTab === 'recebidos') matchTab = t.assignee_id === profile.id
    if (activeTab === 'participando') matchTab = (t.participants_ids || []).includes(profile.id)

    return matchPlant && matchStatus && matchAssignee && matchSearch && matchTab
  })

  const tabs = [
    ...(showTodos ? [{ id: 'todos', label: 'Todos', icon: ListFilter }] : []),
    { id: 'enviados', label: 'Enviados', icon: Send },
    { id: 'recebidos', label: 'Recebidos', icon: Inbox },
    { id: 'participando', label: 'Participando', icon: Users },
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
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Button onClick={handleOpenAdd} variant="tech" className="w-full sm:w-auto h-10">
            <Plus className="w-4 h-4 mr-2" /> Novo Chamado
          </Button>
        </div>
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
              <SelectTrigger className="border-0 shadow-none bg-transparent h-10">
                <SelectValue placeholder="Plantas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Plantas</SelectItem>
                {localPlants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full xl:w-64 border-t xl:border-t-0 xl:border-l border-gray-200 pl-0 xl:pl-4 pt-3 xl:pt-0 flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-3 h-10 font-normal text-slate-600 bg-transparent hover:bg-transparent hover:text-slate-900 border-0 shadow-none focus-visible:ring-0"
                >
                  <span className="truncate mr-2">
                    {selectedStatuses.length === taskStatuses.length
                      ? 'Todos os Status'
                      : selectedStatuses.length === 0
                        ? 'Nenhum Status'
                        : `${selectedStatuses.length} Selecionados`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="start">
                <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-wider">
                  Filtrar por Status
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {taskStatuses.map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s.id}
                    checked={selectedStatuses.includes(s.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedStatuses((prev) => [...prev, s.id])
                      } else {
                        setSelectedStatuses((prev) => prev.filter((id) => id !== s.id))
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm border border-slate-200"
                        style={{ backgroundColor: s.color || '#94a3b8' }}
                      ></span>
                      <span className="truncate">{s.name}</span>
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isSuperAdmin && (
            <div className="w-full xl:w-56 border-t xl:border-t-0 xl:border-l border-gray-200 pl-0 xl:pl-4 pt-3 xl:pt-0">
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="border-0 shadow-none bg-transparent h-10">
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
              <TableHead className="font-semibold text-slate-800">SLA</TableHead>
              <TableHead className="font-semibold text-slate-800 text-right">Ações</TableHead>
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
                const plant = localPlants.find((p) => p.id === task.plant_id)

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
                      <SLACountdown task={task} status={status} nonWorkingDays={nonWorkingDays} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTask(task)}
                          className="text-brand-deepBlue hover:bg-brand-deepBlue/10"
                        >
                          Detalhes
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(task)}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            Excluir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
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
                    {localPlants.map((p) => (
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
                    {taskTypes
                      .filter((t) => t.client_id === effectiveClientId)
                      .map((t) => (
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
                    {users
                      .filter((u) => u.client_id === effectiveClientId)
                      .map((u) => (
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
                <Label>Anexos (Opcional)</Label>
                <Input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  className="cursor-pointer file:cursor-pointer"
                />
                {selectedFiles.length > 0 && (
                  <div className="flex flex-col gap-2 mt-3">
                    {selectedFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-sm font-medium text-slate-700 truncate">
                            {file.name}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                          onClick={() => removeFile(i)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Você está prestes a excluir a tarefa <strong>{taskToDelete?.task_number}</strong>.
              Esta ação não pode ser desfeita e registrará uma alteração de status para "Excluída".
            </p>
            <div className="space-y-2">
              <Label>Justificativa da Exclusão *</Label>
              <Textarea
                value={deleteJustification}
                onChange={(e) => setDeleteJustification(e.target.value)}
                placeholder="Informe o motivo da exclusão..."
                required
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Confirmar
              Exclusão
            </Button>
          </div>
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
