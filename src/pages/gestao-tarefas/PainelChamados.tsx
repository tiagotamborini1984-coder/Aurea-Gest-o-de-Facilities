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
import { Checkbox } from '@/components/ui/checkbox'
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
  UserCheck,
  CalendarClock,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'

function SLACountdown({
  task,
  status,
  nonWorkingDays,
}: {
  task: any
  status: any
  nonWorkingDays: string[]
}) {
  const [sla, setSla] = useState(() => {
    try {
      return calculateSLA(task, status, nonWorkingDays)
    } catch (e) {
      return { text: 'N/A', color: 'text-slate-500', percentage: 0 }
    }
  })

  useEffect(() => {
    if (status?.is_terminal || status?.freeze_sla || task.closed_at) {
      try {
        setSla(calculateSLA(task, status, nonWorkingDays))
      } catch (e) {
        // ignore error to prevent crash
      }
      return
    }

    const interval = setInterval(() => {
      try {
        setSla(calculateSLA(task, status, nonWorkingDays))
      } catch (e) {
        // ignore error to prevent crash
      }
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

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [isBulkDelegateOpen, setIsBulkDelegateOpen] = useState(false)
  const [bulkAssigneeSearch, setBulkAssigneeSearch] = useState('')
  const [bulkAssigneeId, setBulkAssigneeId] = useState('')
  const [isBulkDelegating, setIsBulkDelegating] = useState(false)

  const [form, setForm] = useState<{
    plant_id: string
    type_id: string
    assignee_id: string
    title: string
    description: string
    participants_ids: string[]
    custom_due_date: string
  }>({
    plant_id: '',
    type_id: '',
    assignee_id: '',
    title: '',
    description: '',
    participants_ids: [],
    custom_due_date: '',
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
    setSelectedTaskIds(new Set())

    try {
      let tRes, sRes, uRes, nwdRes, pRes

      if (effectiveClientId === 'all') {
        ;[tRes, sRes, uRes, nwdRes, pRes] = await Promise.all([
          supabase.from('task_types').select('*'),
          supabase.from('task_statuses').select('*').order('created_at', { ascending: true }),
          supabase
            .from('profiles')
            .select('id, name, email, role, client_id')
            .order('name', { ascending: true }),
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
            .eq('client_id', effectiveClientId)
            .order('name', { ascending: true }),
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
    setForm({
      plant_id: '',
      type_id: '',
      assignee_id: '',
      title: '',
      description: '',
      participants_ids: [],
      custom_due_date: '',
    })
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

    const selectedType = taskTypes.find((t) => t.id === form.type_id)
    const isPersonal = selectedType?.name.toLowerCase() === 'tarefas pessoais'

    if (isPersonal) {
      if (!form.custom_due_date) {
        toast({
          title: 'Prazo obrigatório',
          description: 'Para Tarefas Pessoais, é necessário definir um prazo de conclusão.',
          variant: 'destructive',
        })
        return
      }
      if (new Date(form.custom_due_date) <= new Date()) {
        toast({
          title: 'Prazo inválido',
          description: 'O prazo de conclusão deve ser uma data e horário futuros.',
          variant: 'destructive',
        })
        return
      }
    }

    setIsSubmitting(true)

    try {
      let attachment_urls: string[] = []

      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const originalName = file.name.replace(/[^a-zA-Z0-9.\- ]/g, '_')
          const fileName = `${Date.now()}_${originalName}`
          const filePath = `${effectiveClientId}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('task-attachments')
            .upload(filePath, file)

          if (uploadError) {
            if (
              uploadError.message.includes('mime type') &&
              uploadError.message.includes('is not supported')
            ) {
              throw new Error(
                `O formato do arquivo "${file.name}" não é suportado. Por favor, tente outro formato.`,
              )
            }
            throw uploadError
          }

          const { data: publicUrlData } = supabase.storage
            .from('task-attachments')
            .getPublicUrl(filePath)

          attachment_urls.push(publicUrlData.publicUrl)
        }
      }

      // Filter statuses for this specific client to ensure we pick a valid one
      const clientStatuses = taskStatuses.filter((s) => s.client_id === effectiveClientId)
      const initialStatus = clientStatuses[0]?.id

      if (!initialStatus) throw new Error('Nenhum status configurado para este cliente.')

      // Verificar se já existe uma tarefa aberta com a mesma planta, tipo e título (Upsert Logic)
      const openStatuses = clientStatuses.filter((s) => !s.is_terminal).map((s) => s.id)

      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('client_id', effectiveClientId)
        .eq('plant_id', form.plant_id)
        .eq('type_id', form.type_id)
        .eq('title', form.title)
        .in('status_id', openStatuses)
        .order('created_at', { ascending: false })
        .limit(1)

      if (existingTasks && existingTasks.length > 0) {
        const existingTask = existingTasks[0]

        const updatedUrls =
          attachment_urls.length > 0
            ? [...new Set([...(existingTask.attachment_urls || []), ...attachment_urls])]
            : existingTask.attachment_urls

        const { error } = await supabase
          .from('tasks')
          .update({
            assignee_id: form.assignee_id,
            description: form.description,
            attachment_url:
              attachment_urls.length > 0 ? attachment_urls[0] : existingTask.attachment_url,
            attachment_urls: updatedUrls,
            participants_ids: form.participants_ids,
            // SLA properties (due_date, created_at, status_updated_at) are intentionally PRESERVED
          } as any)
          .eq('id', existingTask.id)

        if (error) throw error

        await supabase.from('task_timeline').insert({
          task_id: existingTask.id,
          user_id: profile.id,
          content: `Chamado atualizado para evitar duplicidade. SLA e prazos originais preservados.`,
          action_type: 'comment',
        })

        toast({
          title: 'Chamado atualizado com sucesso!',
          description: `Protocolo existente atualizado: ${existingTask.task_number}`,
          className: 'bg-blue-50 text-blue-900 border-blue-200',
        })
      } else {
        const { data: newTask, error } = await supabase
          .from('tasks')
          .insert({
            client_id: effectiveClientId as string,
            plant_id: form.plant_id,
            type_id: form.type_id,
            status_id: initialStatus,
            requester_id: profile.id,
            assignee_id: form.assignee_id,
            task_number: 'GERANDO...',
            title: form.title,
            description: form.description,
            attachment_url: attachment_urls.length > 0 ? attachment_urls[0] : null,
            attachment_urls,
            status_updated_at: new Date().toISOString(),
            participants_ids: form.participants_ids,
            ...(isPersonal && form.custom_due_date
              ? { due_date: new Date(form.custom_due_date).toISOString() }
              : {}),
          } as any)
          .select()
          .single()

        if (error) throw error

        await supabase.from('task_timeline').insert({
          task_id: newTask.id,
          user_id: profile.id,
          content:
            isPersonal && form.custom_due_date
              ? `Chamado aberto. Prazo de conclusão definido manualmente: ${format(new Date(form.custom_due_date), "dd/MM/yyyy 'às' HH:mm")}.`
              : `Chamado aberto.`,
          action_type: 'comment',
        })

        toast({
          title: 'Chamado criado com sucesso!',
          description: `Protocolo: ${newTask.task_number}`,
          className: 'bg-green-50 text-green-900 border-green-200',
        })
      }
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

  const handleBulkDelegate = async () => {
    if (!bulkAssigneeId || selectedTaskIds.size === 0 || !profile) return
    setIsBulkDelegating(true)
    try {
      const assignee = users.find((u) => u.id === bulkAssigneeId)
      const taskIds = Array.from(selectedTaskIds)

      const { error: updateError } = await supabase
        .from('tasks')
        .update({ assignee_id: bulkAssigneeId })
        .in('id', taskIds)

      if (updateError) throw updateError

      const timelineEntries = taskIds.map((taskId) => ({
        task_id: taskId,
        user_id: profile.id,
        content: `Tarefa delegada em massa para ${assignee?.name || 'usuário'}`,
        action_type: 'delegation',
      }))

      const { error: timelineError } = await supabase.from('task_timeline').insert(timelineEntries)

      if (timelineError) throw timelineError

      toast({
        title: 'Delegação concluída!',
        description: `${taskIds.length} tarefa(s) foram delegadas com sucesso para ${assignee?.name || 'usuário'}`,
        className: 'bg-green-50 text-green-900 border-green-200',
      })

      setIsBulkDelegateOpen(false)
      setBulkAssigneeId('')
      setBulkAssigneeSearch('')
      setSelectedTaskIds(new Set())
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao delegar tarefas', description: err.message, variant: 'destructive' })
    } finally {
      setIsBulkDelegating(false)
    }
  }

  const filteredBulkUsers = users.filter(
    (u) =>
      (effectiveClientId === 'all' || u.client_id === effectiveClientId) &&
      u.name?.toLowerCase().includes(bulkAssigneeSearch.toLowerCase()),
  )

  const _filteredTasks = tasks.filter((t) => {
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

  const _dedupKeys = new Set<string>()
  const filteredTasks = _filteredTasks.filter((t) => {
    const key = `${t.title}|${t.plant_id}|${t.description}`
    if (_dedupKeys.has(key)) return false
    _dedupKeys.add(key)
    return true
  })

  const isPersonalTask = form.type_id
    ? taskTypes.find((t) => t.id === form.type_id)?.name.toLowerCase() === 'tarefas pessoais'
    : false

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
          <div className="bg-brand-deepBlue/10 dark:bg-brand-deepBlue/20 p-2.5 rounded-xl border border-brand-deepBlue/20 dark:border-brand-deepBlue/30 shadow-sm">
            <CheckSquare className="h-6 w-6 text-brand-deepBlue dark:text-brand-vividBlue" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Gestão de Tarefas
            </h2>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Abra chamados, acompanhe SLAs e interaja na linha do tempo.
            </p>
          </div>
        </div>{' '}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Button onClick={handleOpenAdd} variant="tech" className="w-full sm:w-auto h-10">
            <Plus className="w-4 h-4 mr-2" /> Novo Chamado
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex bg-muted p-1.5 rounded-xl w-full sm:w-fit border border-border/80 shadow-sm overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'flex items-center gap-2 flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                activeTab === t.id
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10',
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col xl:flex-row gap-4 bg-card p-3 rounded-xl border border-border shadow-sm">
          <div className="flex-1 flex items-center px-3 gap-2 xl:border-r border-border">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar protocolo, nome ou descrição..."
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full xl:w-56 border-t xl:border-t-0 xl:border-l border-border pl-0 xl:pl-4 pt-3 xl:pt-0">
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
          <div className="w-full xl:w-64 border-t xl:border-t-0 xl:border-l border-border pl-0 xl:pl-4 pt-3 xl:pt-0 flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-3 h-10 font-normal text-muted-foreground bg-transparent hover:bg-transparent hover:text-foreground border-0 shadow-none focus-visible:ring-0"
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
                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
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
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm border border-border"
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
            <div className="w-full xl:w-56 border-t xl:border-t-0 xl:border-l border-border pl-0 xl:pl-4 pt-3 xl:pt-0">
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

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50 border-b border-border">
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={
                    filteredTasks.length > 0 &&
                    filteredTasks.every((t) => selectedTaskIds.has(t.id))
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTaskIds(new Set(filteredTasks.map((t) => t.id)))
                    } else {
                      setSelectedTaskIds(new Set())
                    }
                  }}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead className="font-semibold text-foreground">Protocolo</TableHead>
              <TableHead className="font-semibold text-foreground">Nome</TableHead>
              <TableHead className="font-semibold text-foreground">Planta</TableHead>
              <TableHead className="font-semibold text-foreground">Tipo</TableHead>
              <TableHead className="font-semibold text-foreground">Solicitante</TableHead>
              <TableHead className="font-semibold text-foreground">Responsável</TableHead>
              <TableHead className="font-semibold text-foreground">Status</TableHead>
              <TableHead className="font-semibold text-foreground">SLA</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-deepBlue" />{' '}
                </TableCell>
              </TableRow>
            ) : filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
                  <TableRow
                    key={task.id}
                    className={cn(
                      'hover:bg-muted/50',
                      selectedTaskIds.has(task.id) && 'bg-primary/5',
                    )}
                  >
                    <TableCell className="w-[40px]">
                      <Checkbox
                        checked={selectedTaskIds.has(task.id)}
                        onCheckedChange={(checked) => {
                          setSelectedTaskIds((prev) => {
                            const next = new Set(prev)
                            if (checked) next.add(task.id)
                            else next.delete(task.id)
                            return next
                          })
                        }}
                        aria-label="Selecionar tarefa"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {task.task_number}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {task.title || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{plant?.name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{type?.name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {requester?.name || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{assignee?.name || '-'}</TableCell>
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
                          className="text-brand-deepBlue dark:text-brand-vividBlue hover:bg-brand-deepBlue/10"
                        >
                          Detalhes
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(task)}
                            className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-500"
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
                  value={form.plant_id || undefined}
                  onValueChange={(v) => setForm({ ...form, plant_id: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {localPlants?.map((p) => (
                      <SelectItem key={p.id} value={p.id || 'unknown'}>
                        {p.name || 'Sem nome'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Chamado *</Label>
                <Select
                  value={form.type_id || undefined}
                  onValueChange={(v) => setForm({ ...form, type_id: v, custom_due_date: '' })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypes
                      ?.filter((t) => t.client_id === effectiveClientId)
                      ?.map((t) => (
                        <SelectItem key={t.id} value={t.id || 'unknown'}>
                          {t.name || 'Sem nome'}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {isPersonalTask && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Prazo de Conclusão (SLA) *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !form.custom_due_date && 'text-muted-foreground',
                        )}
                      >
                        <CalendarClock className="mr-2 h-4 w-4" />
                        {form.custom_due_date
                          ? format(new Date(form.custom_due_date), "dd/MM/yyyy 'às' HH:mm")
                          : 'Selecione a data e hora do prazo'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.custom_due_date ? new Date(form.custom_due_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const now = new Date()
                            date.setHours(now.getHours(), now.getMinutes(), 0, 0)
                            setForm({ ...form, custom_due_date: date.toISOString() })
                          }
                        }}
                        disabled={(date) => {
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          return date < today
                        }}
                      />
                      <div className="p-3 border-t border-border">
                        <Label className="text-xs text-muted-foreground mb-2 block">Horário</Label>
                        <Input
                          type="time"
                          value={
                            form.custom_due_date
                              ? format(new Date(form.custom_due_date), 'HH:mm')
                              : ''
                          }
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':').map(Number)
                            const date = form.custom_due_date
                              ? new Date(form.custom_due_date)
                              : new Date()
                            date.setHours(hours || 0, minutes || 0, 0, 0)
                            setForm({ ...form, custom_due_date: date.toISOString() })
                          }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              <div className="space-y-2 sm:col-span-2">
                <Label>Responsável (Atribuir a) *</Label>
                <Select
                  value={form.assignee_id || undefined}
                  onValueChange={(v) => setForm({ ...form, assignee_id: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      ?.filter((u) => u.client_id === effectiveClientId)
                      ?.map((u) => (
                        <SelectItem key={u.id} value={u.id || 'unknown'}>
                          {u.name || 'Sem nome'} ({u.role || 'Sem perfil'})
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
                <Label>Participantes (Opcional)</Label>
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-muted-foreground font-normal"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Selecionar participantes...
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-full min-w-[280px] max-h-[250px] overflow-y-auto"
                      align="start"
                    >
                      <DropdownMenuLabel>Disponíveis</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {users
                        ?.filter(
                          (u) =>
                            u.client_id === effectiveClientId &&
                            u.id !== form.assignee_id &&
                            u.id !== profile.id,
                        )
                        ?.map((u) => (
                          <DropdownMenuCheckboxItem
                            key={u.id}
                            checked={form.participants_ids.includes(u.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm({
                                  ...form,
                                  participants_ids: [...form.participants_ids, u.id],
                                })
                              } else {
                                setForm({
                                  ...form,
                                  participants_ids: form.participants_ids.filter(
                                    (pId) => pId !== u.id,
                                  ),
                                })
                              }
                            }}
                          >
                            {u.name || 'Sem nome'} ({u.role || 'Sem perfil'})
                          </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {form.participants_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {form.participants_ids.map((id) => {
                      const user = users.find((u) => u.id === id)
                      if (!user) return null
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="pl-2 pr-1 py-1 flex items-center gap-1 bg-muted text-foreground border border-border"
                        >
                          <Users className="w-3 h-3 text-muted-foreground" />
                          {user.name}
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                participants_ids: form.participants_ids.filter((pId) => pId !== id),
                              })
                            }
                            className="ml-1 rounded-full hover:bg-accent p-0.5 text-muted-foreground transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Anexos (Opcional)</Label>
                <Input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.eml,message/rfc822"
                  className="cursor-pointer file:cursor-pointer"
                />
                {selectedFiles.length > 0 && (
                  <div className="flex flex-col gap-2 mt-3">
                    {selectedFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-muted p-2.5 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">
                            {file.name}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 shrink-0"
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
            <p className="text-sm text-muted-foreground">
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

      {selectedTaskIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="flex items-center gap-3 bg-card border border-border shadow-lg rounded-xl px-5 py-3">
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">
              {selectedTaskIds.size}{' '}
              {selectedTaskIds.size === 1 ? 'tarefa selecionada' : 'tarefas selecionadas'}
            </span>
            <div className="w-px h-6 bg-border" />
            <Button variant="tech" size="sm" onClick={() => setIsBulkDelegateOpen(true)}>
              <UserCheck className="w-4 h-4 mr-2" /> Delegar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedTaskIds(new Set())}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isBulkDelegateOpen} onOpenChange={setIsBulkDelegateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delegar Tarefas em Massa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {selectedTaskIds.size}{' '}
              {selectedTaskIds.size === 1 ? 'tarefa será delegada' : 'tarefas serão delegadas'} para
              o usuário selecionado.
            </p>
            <div className="space-y-2">
              <Label>Buscar Responsável *</Label>
              <Input
                placeholder="Buscar por nome..."
                value={bulkAssigneeSearch}
                onChange={(e) => setBulkAssigneeSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[250px] overflow-y-auto space-y-1 border border-border rounded-lg p-1">
              {filteredBulkUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum usuário encontrado.
                </p>
              ) : (
                filteredBulkUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setBulkAssigneeId(u.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                      bulkAssigneeId === u.id
                        ? 'bg-brand-deepBlue/10 border border-brand-deepBlue/30'
                        : 'hover:bg-muted border border-transparent',
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-deepBlue/10 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4 text-brand-deepBlue dark:text-brand-vividBlue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    {bulkAssigneeId === u.id && (
                      <CheckSquare className="w-4 h-4 text-brand-deepBlue dark:text-brand-vividBlue shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsBulkDelegateOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="tech"
              onClick={handleBulkDelegate}
              disabled={!bulkAssigneeId || isBulkDelegating}
            >
              {isBulkDelegating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UserCheck className="w-4 h-4 mr-2" />
              )}
              Confirmar Delegação
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
