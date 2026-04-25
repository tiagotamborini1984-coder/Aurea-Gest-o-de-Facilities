import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Loader2,
  Send,
  User,
  Paperclip,
  CheckCircle,
  ArrowRight,
  ChevronLeft,
  Plus,
  X,
  Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
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

export function TaskDetailsSheet({
  task,
  isOpen,
  onClose,
  taskStatuses,
  users,
  onTaskUpdated,
}: any) {
  const { profile } = useAppStore()
  const { toast } = useToast()
  const [timeline, setTimeline] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)

  // Soft delete state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteJustification, setDeleteJustification] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Audit Wizard specific state
  const [auditExecution, setAuditExecution] = useState<any>(null)
  const [auditActions, setAuditActions] = useState<any[]>([])
  const [auditAnswers, setAuditAnswers] = useState<Record<string, any>>({})
  const [auditRealizationDate, setAuditRealizationDate] = useState('')
  const [auditParticipants, setAuditParticipants] = useState('')
  const [isSavingAudit, setIsSavingAudit] = useState(false)

  const [wizardStep, setWizardStep] = useState<number>(-1)
  const [showConfirm, setShowConfirm] = useState(false)

  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null)
  const [poDateDialogOpen, setPoDateDialogOpen] = useState(false)
  const [poGeneratedDate, setPoGeneratedDate] = useState('')

  useEffect(() => {
    if (isOpen && task) {
      loadTimeline()
      checkAudit()
      setDeleteJustification('')
    } else {
      setWizardStep(-1)
      setAuditAnswers({})
    }
  }, [isOpen, task])

  const loadTimeline = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('task_timeline')
      .select('*, user:user_id(name)')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true })
    setTimeline(data || [])
    setLoading(false)
  }

  const checkAudit = async () => {
    const { data: exec } = await supabase
      .from('audit_executions')
      .select('*, audits(*)')
      .eq('task_id', task.id)
      .single()
    if (exec) {
      setAuditExecution(exec)
      setAuditRealizationDate(exec.realization_date || format(new Date(), 'yyyy-MM-dd'))
      setAuditParticipants(exec.participants || '')

      const { data: actions } = await supabase
        .from('audit_actions')
        .select('*')
        .eq('audit_id', exec.audit_id)
        .order('order_index')
      setAuditActions(actions || [])

      const { data: answers } = await supabase
        .from('audit_execution_answers')
        .select('*')
        .eq('execution_id', exec.id)
      const ansMap: Record<string, any> = {}
      answers?.forEach((a) => {
        ansMap[a.action_id] = a
      })
      setAuditAnswers(ansMap)

      if (exec.status === 'Finalizado') {
        setWizardStep(-1)
      } else {
        if (exec.realization_date) {
          const index = actions?.findIndex((a) => !ansMap[a.id]?.score) ?? -1
          setWizardStep(index >= 0 ? index + 1 : actions?.length || 1)
        } else {
          setWizardStep(0)
        }
      }
    } else {
      setAuditExecution(null)
      setAuditActions([])
      setAuditAnswers({})
      setWizardStep(-1)
    }
  }

  const handleAddComment = async () => {
    if (!comment.trim() || !profile) return
    setIsSubmitting(true)
    await supabase.from('task_timeline').insert({
      task_id: task.id,
      user_id: profile.id,
      content: comment.trim(),
      action_type: 'comment',
    })
    setComment('')
    setIsSubmitting(false)
    loadTimeline()
  }

  const handleStatusChange = async (newStatusId: string) => {
    if (!profile) return
    const status = taskStatuses.find((s: any) => s.id === newStatusId)
    const statusName = status?.name.toLowerCase() || ''

    if (statusName.includes('pedido gerado') || statusName.includes('pedido emitido')) {
      setPendingStatusId(newStatusId)
      setPoGeneratedDate(format(new Date(), 'yyyy-MM-dd'))
      setPoDateDialogOpen(true)
      return
    }

    await processStatusChange(newStatusId)
  }

  const processStatusChange = async (newStatusId: string, extraPayload: any = {}) => {
    if (!profile) return
    const status = taskStatuses.find((s: any) => s.id === newStatusId)
    const isTerminal = status?.is_terminal

    const payload: any = { status_id: newStatusId, ...extraPayload }
    if (isTerminal) {
      payload.closed_at = new Date().toISOString()
    } else if (task.closed_at) {
      payload.closed_at = null
    }

    await supabase.from('tasks').update(payload).eq('id', task.id)

    await supabase.from('task_timeline').insert({
      task_id: task.id,
      user_id: profile.id,
      content: `Status alterado para: ${status?.name}`,
      action_type: 'status_change',
    })

    if (extraPayload.po_generated_date) {
      await supabase.from('task_timeline').insert({
        task_id: task.id,
        user_id: profile.id,
        content: `Data de geração do pedido registrada: ${format(new Date(extraPayload.po_generated_date), 'dd/MM/yyyy')}`,
        action_type: 'comment',
      })
    }

    onTaskUpdated()
    loadTimeline()
  }

  const confirmPoDate = async () => {
    if (!poGeneratedDate) {
      toast({ title: 'Data obrigatória', variant: 'destructive' })
      return
    }
    setPoDateDialogOpen(false)
    if (pendingStatusId) {
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      let isoDate = ''

      if (poGeneratedDate === todayStr) {
        isoDate = new Date().toISOString()
      } else {
        isoDate = new Date(`${poGeneratedDate}T23:59:59.999Z`).toISOString()
      }

      await processStatusChange(pendingStatusId, { po_generated_date: isoDate })
      setPendingStatusId(null)
    }
  }

  const handleDelegate = async (newAssigneeId: string) => {
    if (!profile || newAssigneeId === task.assignee_id) return
    const newAssignee = users.find((u: any) => u.id === newAssigneeId)

    try {
      await supabase.from('tasks').update({ assignee_id: newAssigneeId }).eq('id', task.id)

      await supabase.from('task_timeline').insert({
        task_id: task.id,
        user_id: profile.id,
        content: `Tarefa delegada para: ${newAssignee?.name}`,
        action_type: 'delegation',
      })

      toast({
        title: 'Tarefa delegada com sucesso!',
        description: `Responsabilidade transferida para ${newAssignee?.name}`,
        className: 'bg-green-50 text-green-900 border-green-200',
      })

      onTaskUpdated()
      loadTimeline()
    } catch (error: any) {
      toast({
        title: 'Erro ao delegar tarefa',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const saveAnswerToDb = async (actionId: string, updatedFields: any) => {
    if (!auditExecution || auditExecution.status === 'Finalizado') return

    const currentAns = auditAnswers[actionId] || {}
    const payload = {
      execution_id: auditExecution.id,
      action_id: actionId,
      score: currentAns.score ?? null,
      evidence_url: currentAns.evidence_url ?? null,
      observations: currentAns.observations ?? null,
      ...updatedFields,
    }

    try {
      const { data, error } = await supabase
        .from('audit_execution_answers')
        .upsert(payload, { onConflict: 'execution_id,action_id' })
        .select()
        .single()

      if (data && !error) {
        setAuditAnswers((prev) => ({
          ...prev,
          [actionId]: { ...prev[actionId], ...payload, id: data.id },
        }))
      }
    } catch (e) {
      console.error('Auto-save failed', e)
    }
  }

  const handleRemoveEvidence = async (actionId: string) => {
    setAuditAnswers((prev) => ({
      ...prev,
      [actionId]: { ...prev[actionId], evidence_url: null },
    }))
    await saveAnswerToDb(actionId, { evidence_url: null })
  }

  const handleDeleteTask = async () => {
    if (!deleteJustification.trim()) {
      toast({ title: 'Justificativa obrigatória', variant: 'destructive' })
      return
    }
    setIsDeleting(true)
    try {
      let deletedStatus = taskStatuses.find(
        (s: any) => s.name.toLowerCase() === 'excluída' || s.name.toLowerCase() === 'excluida',
      )

      if (!deletedStatus) {
        const { data, error } = await supabase
          .from('task_statuses')
          .insert({
            client_id: profile?.client_id,
            name: 'Excluída',
            color: '#ef4444',
            is_terminal: true,
            freeze_sla: true,
            sla_days: 0,
          })
          .select()
          .single()
        if (error) throw error
        deletedStatus = data
      }

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status_id: deletedStatus.id,
          closed_at: new Date().toISOString(),
        })
        .eq('id', task.id)

      if (updateError) throw updateError

      await supabase.from('task_timeline').insert({
        task_id: task.id,
        user_id: profile?.id,
        content: `Tarefa Excluída. Justificativa: ${deleteJustification}`,
        action_type: 'status_change',
      })

      toast({
        title: 'Tarefa excluída com sucesso',
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      setIsDeleteDialogOpen(false)
      onClose()
      onTaskUpdated()
    } catch (e: any) {
      toast({ title: 'Erro ao excluir tarefa', description: e.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEvidenceUpload = async (actionId: string, file: File | undefined) => {
    if (!file || !profile) return
    setAuditAnswers((prev) => ({ ...prev, [actionId]: { ...prev[actionId], uploading: true } }))
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${profile.client_id}/${fileName}`
      const { error } = await supabase.storage.from('task-attachments').upload(filePath, file)
      if (error) throw error
      const { data } = supabase.storage.from('task-attachments').getPublicUrl(filePath)
      setAuditAnswers((prev) => ({
        ...prev,
        [actionId]: { ...prev[actionId], evidence_url: data.publicUrl, uploading: false },
      }))
      await saveAnswerToDb(actionId, { evidence_url: data.publicUrl })
    } catch (e: any) {
      toast({ title: 'Erro no upload', description: e.message, variant: 'destructive' })
      setAuditAnswers((prev) => ({ ...prev, [actionId]: { ...prev[actionId], uploading: false } }))
    }
  }

  const handleSaveAudit = async () => {
    setIsSavingAudit(true)
    setShowConfirm(false)
    try {
      let totalScore = 0
      let maxScore = auditActions.length * 5

      const answersToUpsert = auditActions.map((action) => {
        const ans = auditAnswers[action.id] || {}
        totalScore += ans.score || 0
        return {
          execution_id: auditExecution.id,
          action_id: action.id,
          score: ans.score,
          evidence_url: ans.evidence_url || null,
          observations: ans.observations || null,
        }
      })

      await supabase
        .from('audit_execution_answers')
        .upsert(answersToUpsert, { onConflict: 'execution_id,action_id' })

      await supabase
        .from('audit_executions')
        .update({
          status: 'Finalizado',
          realization_date: auditRealizationDate,
          participants: auditParticipants,
          final_score: totalScore,
          max_score: maxScore,
        })
        .eq('id', auditExecution.id)

      const terminalStatus = taskStatuses.find((s: any) => s.is_terminal)
      if (terminalStatus) {
        await handleStatusChange(terminalStatus.id)
      }

      // Automatically generate Non-Conformity tasks for scores 1-3
      const ncActions = auditActions.filter((action) => {
        const score = auditAnswers[action.id]?.score
        return score && score >= 1 && score <= 3
      })

      if (ncActions.length > 0 && profile) {
        const baseDate = auditRealizationDate
          ? new Date(`${auditRealizationDate}T12:00:00Z`)
          : new Date()
        let nextDate = new Date(baseDate)
        const freq = auditExecution.audits?.frequency || 'Única'

        if (freq === 'Diária') nextDate.setDate(nextDate.getDate() + 1)
        else if (freq === 'Semanal') nextDate.setDate(nextDate.getDate() + 7)
        else if (freq === 'Mensal') nextDate.setMonth(nextDate.getMonth() + 1)
        else if (freq === 'Semestral') nextDate.setMonth(nextDate.getMonth() + 6)
        else if (freq === 'Anual') nextDate.setFullYear(nextDate.getFullYear() + 1)
        else nextDate.setDate(nextDate.getDate() + 7) // fallback

        let dueDate = new Date(nextDate)
        dueDate.setDate(dueDate.getDate() - 1)

        if (dueDate < new Date()) {
          dueDate = new Date()
        }
        dueDate.setHours(23, 59, 59, 999)

        const { data: types } = await supabase
          .from('task_types')
          .select('id, name')
          .eq('client_id', profile.client_id)
        let ncType = types?.find(
          (t) =>
            t.name.toLowerCase().includes('não conformidade') ||
            t.name.toLowerCase().includes('nc'),
        )
        if (!ncType && types && types.length > 0) ncType = types[0]

        const { data: statuses } = await supabase
          .from('task_statuses')
          .select('id')
          .eq('client_id', profile.client_id)
          .eq('is_terminal', false)
          .order('created_at')
          .limit(1)
        const initialStatusId = statuses?.[0]?.id

        if (ncType && initialStatusId) {
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

          for (const nc of ncActions) {
            const taskNumber = `TSK-${year}-${seq.toString().padStart(4, '0')}`
            seq++

            const ans = auditAnswers[nc.id]

            const { data: newTask } = await supabase
              .from('tasks')
              .insert({
                client_id: profile.client_id,
                plant_id: auditExecution.plant_id,
                type_id: ncType.id,
                status_id: initialStatusId,
                requester_id: profile.id,
                assignee_id: auditExecution.assignee_id,
                task_number: taskNumber,
                title: `Não Conformidade: ${nc.title.substring(0, 50)}${nc.title.length > 50 ? '...' : ''}`,
                description: `Foi identificada uma Não Conformidade durante a auditoria "${auditExecution.audits?.title}".\n\nAção Avaliada: ${nc.title}\nNota: ${ans.score}\nObservações: ${ans.observations || 'Nenhuma'}\n\nFavor providenciar correção até a data limite.`,
                due_date: dueDate.toISOString(),
                status_updated_at: new Date().toISOString(),
                participants_ids: [],
              } as any)
              .select()
              .single()

            if (newTask) {
              await supabase.from('task_timeline').insert({
                task_id: newTask.id,
                user_id: profile.id,
                content: `Tarefa gerada automaticamente devido à nota ${ans.score} na auditoria ${auditExecution.audits?.title}.`,
                action_type: 'comment',
              })
            }
          }
        }
      }

      toast({
        title: 'Auditoria enviada com sucesso!',
        description:
          ncActions.length > 0
            ? `${ncActions.length} tarefa(s) de Não Conformidade gerada(s).`
            : undefined,
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      onClose()
      onTaskUpdated()
    } catch (e: any) {
      toast({ title: 'Erro ao salvar auditoria', description: e.message, variant: 'destructive' })
    } finally {
      setIsSavingAudit(false)
    }
  }

  const handleNextStep = () => {
    if (wizardStep === 0) {
      if (!auditRealizationDate) {
        toast({ title: 'Preencha a data de realização', variant: 'destructive' })
        return
      }

      supabase
        .from('audit_executions')
        .update({
          realization_date: auditRealizationDate,
          participants: auditParticipants,
        })
        .eq('id', auditExecution.id)
        .then()

      setWizardStep(1)
      return
    }

    const action = auditActions[wizardStep - 1]
    const ans = auditAnswers[action.id]
    if (!ans || !ans.score) {
      toast({ title: 'Selecione uma nota de 1 a 5', variant: 'destructive' })
      return
    }
    if (action.evidence_required && !ans.evidence_url) {
      toast({ title: 'A evidência é obrigatória para esta ação', variant: 'destructive' })
      return
    }

    if (wizardStep < auditActions.length) {
      setWizardStep(wizardStep + 1)
    } else {
      setShowConfirm(true)
    }
  }

  const attachmentUrls: string[] = []
  if (task?.attachment_url) attachmentUrls.push(task.attachment_url)
  if (task?.attachment_urls?.length) {
    task.attachment_urls.forEach((url: string) => {
      if (!attachmentUrls.includes(url)) attachmentUrls.push(url)
    })
  }

  const handleAddNewAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0 || !profile) return
    setIsUploadingAttachment(true)
    try {
      const newUrls = [...attachmentUrls]

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${profile.client_id}/${fileName}`
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

        newUrls.push(publicUrlData.publicUrl)

        await supabase.from('task_timeline').insert({
          task_id: task.id,
          user_id: profile.id,
          content: `Adicionou um novo anexo: ${file.name}`,
          action_type: 'attachment',
        })
      }

      const { error: updateError } = await supabase
        .from('tasks')
        .update({ attachment_urls: newUrls })
        .eq('id', task.id)
      if (updateError) throw updateError

      toast({
        title: 'Anexo(s) adicionado(s) com sucesso',
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      onTaskUpdated()
    } catch (err: any) {
      toast({
        title: 'Erro ao anexar arquivo(s)',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsUploadingAttachment(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleDeleteAttachment = async (urlToDelete: string) => {
    if (!profile) return
    try {
      const newUrls = attachmentUrls.filter((u) => u !== urlToDelete)

      const { error: updateError } = await supabase
        .from('tasks')
        .update({ attachment_urls: newUrls })
        .eq('id', task.id)
      if (updateError) throw updateError

      await supabase.from('task_timeline').insert({
        task_id: task.id,
        user_id: profile.id,
        content: `Removeu um anexo.`,
        action_type: 'attachment',
      })

      toast({
        title: 'Anexo removido com sucesso',
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      onTaskUpdated()
    } catch (err: any) {
      toast({ title: 'Erro ao remover anexo', description: err.message, variant: 'destructive' })
    }
  }

  const handleParticipantChange = async (userId: string, isAdding: boolean) => {
    if (!profile || !task) return
    let current = task.participants_ids || []
    if (isAdding) {
      if (!current.includes(userId)) current = [...current, userId]
    } else {
      current = current.filter((id: string) => id !== userId)
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ participants_ids: current })
        .eq('id', task.id)
      if (error) throw error

      const user = users.find((u: any) => u.id === userId)
      await supabase.from('task_timeline').insert({
        task_id: task.id,
        user_id: profile.id,
        content: isAdding
          ? `Adicionou ${user?.name} como participante.`
          : `Removeu ${user?.name} dos participantes.`,
        action_type: 'participant_change',
      })

      toast({
        title: 'Participantes atualizados',
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      onTaskUpdated()
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' })
    }
  }

  const getAssigneeName = (id: string) =>
    users.find((u: any) => u.id === id)?.name || 'Desconhecido'

  const canDelegate =
    profile?.role === 'Administrador' ||
    profile?.role === 'Master' ||
    profile?.id === task?.assignee_id

  const canDeleteTask = profile?.role === 'Master' || profile?.role === 'Administrador'

  const canAddAttachment =
    profile?.id === task?.requester_id ||
    profile?.id === task?.assignee_id ||
    (task?.participants_ids || []).includes(profile?.id) ||
    profile?.role === 'Master' ||
    profile?.role === 'Administrador'

  const canDeleteAttachment =
    profile?.id === task?.requester_id ||
    profile?.role === 'Master' ||
    profile?.role === 'Administrador'

  const renderWizard = () => {
    if (wizardStep === 0) {
      return (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
          <div className="text-center mb-6">
            <h4 className="font-bold text-xl text-slate-800">Iniciar Auditoria</h4>
            <p className="text-sm text-slate-500">
              Confirme a data e os participantes antes de começar.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700">Data de Realização *</Label>
            <Input
              type="date"
              value={auditRealizationDate}
              onChange={(e) => setAuditRealizationDate(e.target.value)}
              className="border-slate-200 bg-slate-50 h-12"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700">Participantes (Opcional)</Label>
            <Input
              value={auditParticipants}
              onChange={(e) => setAuditParticipants(e.target.value)}
              placeholder="Nomes dos participantes separados por vírgula"
              className="border-slate-200 bg-slate-50 h-12"
            />
          </div>
          <Button onClick={handleNextStep} className="w-full h-12 mt-6 text-lg" variant="tech">
            Iniciar Checklist <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )
    }

    const actionIndex = wizardStep - 1
    const action = auditActions[actionIndex]
    const ans = auditAnswers[action.id] || {}

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-brand-deepBlue bg-brand-deepBlue/10 px-3 py-1 rounded-full">
            Ação {wizardStep} de {auditActions.length}
          </span>
          <Badge variant="outline" className="border-slate-200 text-slate-500">
            {auditExecution.audits?.title}
          </Badge>
        </div>

        <h3 className="text-xl font-bold text-slate-800 leading-snug">
          {action.title}
          {action.evidence_required && (
            <span className="block mt-1 text-red-500 text-xs font-bold tracking-wide">
              * EVIDÊNCIA OBRIGATÓRIA
            </span>
          )}
        </h3>

        <div className="space-y-6 pt-2">
          <div>
            <Label className="mb-3 block text-slate-700">Pontuação (1 a 5) *</Label>
            <div className="flex gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5].map((score) => (
                <Button
                  key={score}
                  type="button"
                  variant={ans.score === score ? 'default' : 'outline'}
                  className={cn(
                    'flex-1 h-14 text-xl font-black rounded-xl transition-all',
                    ans.score === score
                      ? 'bg-brand-deepBlue text-white scale-[1.02] shadow-md border-transparent'
                      : 'text-slate-600 border-slate-200 hover:border-brand-deepBlue/50 hover:bg-brand-deepBlue/5',
                  )}
                  onClick={() => {
                    setAuditAnswers({
                      ...auditAnswers,
                      [action.id]: { ...ans, score },
                    })
                    saveAnswerToDb(action.id, { score })
                  }}
                >
                  {score}
                </Button>
              ))}
            </div>
            {ans.score && ans.score <= 3 && (
              <p className="text-xs text-amber-600 font-medium mt-2">
                ⚠️ Notas de 1 a 3 gerarão uma Não Conformidade automática.
              </p>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <Label className="mb-2 block text-slate-700">
              Anexar Evidência {action.evidence_required ? '(Obrigatória)' : '(Opcional)'}
            </Label>
            <div className="relative">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleEvidenceUpload(action.id, e.target.files?.[0])}
                className="bg-white border-slate-200 cursor-pointer file:cursor-pointer"
                disabled={ans.uploading}
              />
            </div>
            {ans.uploading && (
              <span className="text-xs text-brand-deepBlue mt-2 flex items-center font-medium">
                <Loader2 className="w-3 h-3 animate-spin mr-1" /> Enviando arquivo...
              </span>
            )}
            {ans.evidence_url && !ans.uploading && (
              <div className="flex items-center gap-3 mt-3">
                <a
                  href={ans.evidence_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-green-600 text-sm flex items-center font-medium hover:underline bg-green-50 w-fit px-3 py-1.5 rounded-lg border border-green-100"
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Ver arquivo anexado
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveEvidence(action.id)}
                  className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remover
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label className="mb-2 block text-slate-700">Observações (Opcional)</Label>
            <Textarea
              value={ans.observations || ''}
              onChange={(e) =>
                setAuditAnswers({
                  ...auditAnswers,
                  [action.id]: { ...ans, observations: e.target.value },
                })
              }
              onBlur={(e) => saveAnswerToDb(action.id, { observations: e.target.value })}
              placeholder="Adicione detalhes ou justificativas sobre esta ação..."
              className="resize-none h-24 bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        <div className="flex justify-between pt-6 mt-6 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => setWizardStep(wizardStep - 1)}
            className="h-12 px-6 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          {wizardStep < auditActions.length ? (
            <Button type="button" variant="tech" onClick={handleNextStep} className="h-12 px-8">
              Próximo <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="h-12 px-8 bg-green-600 hover:bg-green-700 text-white shadow-md"
            >
              Enviar Auditoria <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="sm:max-w-xl md:max-w-2xl flex flex-col h-full p-0 bg-slate-50 border-l border-gray-200">
          <SheetHeader className="p-6 pb-4 bg-white border-b border-gray-200 shrink-0">
            <SheetTitle className="text-xl text-slate-800">
              {task?.task_number} {task?.title ? `- ${task.title}` : ''}
            </SheetTitle>
            <div className="text-sm text-slate-500 mt-1">
              Aberto por{' '}
              <span className="font-medium text-slate-700">
                {getAssigneeName(task?.requester_id)}
              </span>{' '}
              para{' '}
              <span className="font-medium text-slate-700">
                {getAssigneeName(task?.assignee_id)}
              </span>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-slate-800">Descrição</h4>
                {task?.due_date && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Data Limite (SLA): {format(new Date(task.due_date), 'dd/MM/yyyy')}
                  </Badge>
                )}
              </div>
              <p className="text-slate-600 text-sm whitespace-pre-wrap">{task?.description}</p>

              {/* Participantes Section */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-slate-700">Participantes</h5>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-dashed"
                        disabled={auditExecution && auditExecution.status === 'Finalizado'}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Adicionar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-[200px] max-h-[300px] overflow-y-auto"
                    >
                      <DropdownMenuLabel className="text-xs">
                        Selecionar participantes
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {users
                        .filter(
                          (u: any) => u.id !== task?.requester_id && u.id !== task?.assignee_id,
                        )
                        .map((u: any) => (
                          <DropdownMenuCheckboxItem
                            key={u.id}
                            checked={(task?.participants_ids || []).includes(u.id)}
                            onCheckedChange={(checked) => handleParticipantChange(u.id, checked)}
                          >
                            {u.name}
                          </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!task?.participants_ids || task.participants_ids.length === 0 ? (
                    <span className="text-xs text-slate-500">Nenhum participante adicionado.</span>
                  ) : (
                    task.participants_ids.map((id: string) => {
                      const user = users.find((u: any) => u.id === id)
                      if (!user) return null
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="pl-1.5 pr-1 py-0.5 flex items-center gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                        >
                          <User className="w-3 h-3 text-slate-400" />
                          {user.name}
                          <button
                            onClick={() => handleParticipantChange(id, false)}
                            className="ml-1 rounded-full p-0.5 hover:bg-slate-300 transition-colors text-slate-500"
                            disabled={auditExecution && auditExecution.status === 'Finalizado'}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Anexos Section */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-slate-700">Anexos</h5>
                  {canAddAttachment && (
                    <div className="relative">
                      <Input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.eml,message/rfc822"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 file:cursor-pointer"
                        onChange={handleAddNewAttachment}
                        disabled={
                          isUploadingAttachment ||
                          (auditExecution && auditExecution.status === 'Finalizado')
                        }
                        title="Adicionar novos anexos"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-dashed pointer-events-none"
                        disabled={
                          isUploadingAttachment ||
                          (auditExecution && auditExecution.status === 'Finalizado')
                        }
                      >
                        {isUploadingAttachment ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3 mr-1" />
                        )}
                        {isUploadingAttachment ? 'Enviando...' : 'Novo Anexo'}
                      </Button>
                    </div>
                  )}
                </div>

                {attachmentUrls.length === 0 && !isUploadingAttachment ? (
                  <span className="text-xs text-slate-500">Nenhum anexo adicionado.</span>
                ) : (
                  <div className="flex flex-col gap-2">
                    {attachmentUrls.map((url, i) => {
                      const fileName =
                        url.split('/').pop()?.split('_').slice(1).join('_') || `Anexo ${i + 1}`
                      return (
                        <div
                          key={i}
                          className="flex items-center p-2 rounded-lg bg-slate-50 border border-slate-200 group"
                        >
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center flex-1 text-sm text-brand-deepBlue hover:underline"
                          >
                            <Paperclip className="w-4 h-4 mr-3 shrink-0 text-slate-400 group-hover:text-brand-deepBlue" />
                            <span className="truncate">{fileName}</span>
                          </a>
                          {canDeleteAttachment && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0 ml-2"
                              onClick={() => handleDeleteAttachment(url)}
                              title="Excluir anexo"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {auditExecution && wizardStep >= 0 && (
              <div className="bg-white p-6 rounded-2xl border border-brand-deepBlue/20 shadow-md relative overflow-hidden">
                {wizardStep > 0 && (
                  <div className="absolute top-0 left-0 h-1.5 bg-slate-100 w-full">
                    <div
                      className="h-full bg-brand-vividBlue transition-all duration-500 ease-in-out"
                      style={{ width: `${(wizardStep / auditActions.length) * 100}%` }}
                    ></div>
                  </div>
                )}
                {renderWizard()}
              </div>
            )}

            {auditExecution && auditExecution.status === 'Finalizado' && (
              <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
                <div>
                  <span className="font-bold text-green-900 text-lg flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" /> Auditoria Finalizada
                  </span>
                  <p className="text-sm text-green-700 mt-1">
                    As respostas foram salvas e enviadas com sucesso.
                  </p>
                </div>
                <div className="text-right bg-white px-4 py-2 rounded-lg border border-green-100 shadow-sm">
                  <span className="block text-[10px] text-green-600 font-bold uppercase tracking-wider mb-0.5">
                    Score Obtido
                  </span>
                  <span className="text-3xl font-black text-green-900">
                    {auditExecution.final_score}{' '}
                    <span className="text-lg text-green-700">/ {auditExecution.max_score}</span>
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4">
              <h4 className="font-semibold text-slate-800">Linha do Tempo</h4>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : timeline.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Nenhuma interação registrada.
                </p>
              ) : (
                timeline.map((event: any) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-deepBlue/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-brand-deepBlue" />
                    </div>
                    <div className="flex-1 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm text-slate-800">
                          {event.user?.name || 'Usuário'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {format(new Date(event.created_at), 'dd/MM HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1 font-medium">{event.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 bg-white border-t border-gray-200 space-y-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                    Alterar Status:
                  </span>
                  <Select
                    value={task?.status_id}
                    onValueChange={handleStatusChange}
                    disabled={auditExecution && auditExecution.status !== 'Finalizado'}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200 min-w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {taskStatuses.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: s.color }}
                            ></span>
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {canDelegate && (
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                      Delegar para:
                    </span>
                    <Select
                      value={task?.assignee_id}
                      onValueChange={handleDelegate}
                      disabled={auditExecution && auditExecution.status !== 'Finalizado'}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200 min-w-[140px] max-w-[200px]">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {canDeleteTask && (
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={auditExecution && auditExecution.status !== 'Finalizado'}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir Tarefa
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Adicione um comentário ou atualização..."
                className="resize-none h-10 min-h-[44px] bg-slate-50 border-slate-200"
              />
              <Button
                onClick={handleAddComment}
                disabled={isSubmitting || !comment.trim()}
                variant="tech"
                className="h-auto px-4"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Envio</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja enviar esta auditoria? Após o envio,{' '}
              <strong className="text-slate-800">as respostas não poderão ser editadas</strong> e o
              status será alterado para Finalizado.
              <br />
              <br />
              Ações avaliadas com notas de 1 a 3 gerarão automaticamente tarefas de Não
              Conformidade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavingAudit}>Voltar para revisar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSaveAudit}
              disabled={isSavingAudit}
              className="bg-brand-deepBlue text-white"
            >
              {isSavingAudit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sim, enviar agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={poDateDialogOpen} onOpenChange={setPoDateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Data de Geração do Pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Informe a data exata que o pedido foi gerado *</Label>
              <Input
                type="date"
                value={poGeneratedDate}
                onChange={(e) => setPoGeneratedDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPoDateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="tech" onClick={confirmPoDate}>
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Justificativa da exclusão *</Label>
              <Textarea
                value={deleteJustification}
                onChange={(e) => setDeleteJustification(e.target.value)}
                placeholder="Informe o motivo detalhado para a exclusão desta tarefa..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirmar Exclusão
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
