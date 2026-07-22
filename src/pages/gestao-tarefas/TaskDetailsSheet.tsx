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
import { submitAuditExecution } from '@/services/audit'
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
  const [pageInput, setPageInput] = useState('')

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

  useEffect(() => {
    if (wizardStep > 0) {
      setPageInput(String(wizardStep))
    }
  }, [wizardStep])

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setPageInput(val)
  }

  const handlePageJump = () => {
    const parsed = parseInt(pageInput, 10)
    if (isNaN(parsed) || parsed < 1) {
      setWizardStep(1)
      setPageInput('1')
    } else if (parsed > auditActions.length) {
      setWizardStep(auditActions.length)
      setPageInput(String(auditActions.length))
    } else if (parsed !== wizardStep) {
      setWizardStep(parsed)
    } else {
      setPageInput(String(wizardStep))
    }
  }

  const handlePageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handlePageJump()
      e.currentTarget.blur()
    }
  }

  const handlePageBlur = () => {
    if (pageInput !== String(wizardStep)) {
      handlePageJump()
    }
  }

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
      const originalName = file.name.replace(/[^a-zA-Z0-9.\- ]/g, '_')
      const fileName = `${Date.now()}_${originalName}`
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
      const formattedAnswers = auditActions.map((action) => {
        const ans = auditAnswers[action.id] || {}
        return {
          action_id: action.id,
          score: ans.score,
          observations: ans.observations || null,
          evidence_url: ans.evidence_url || null,
          evidence_urls: ans.evidence_urls || [],
        }
      })

      await submitAuditExecution(auditExecution.id, formattedAnswers, auditParticipants, false)

      const terminalStatus = taskStatuses.find((s: any) => s.is_terminal)
      if (terminalStatus) {
        await processStatusChange(terminalStatus.id)
      }

      toast({
        title: 'Auditoria enviada com sucesso!',
        description: 'Não conformidades foram geradas automaticamente pelo sistema.',
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
        const originalName = file.name.replace(/[^a-zA-Z0-9.\- ]/g, '_')
        const fileName = `${Date.now()}_${originalName}`
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
            <h4 className="font-bold text-xl text-foreground">Iniciar Auditoria</h4>
            <p className="text-sm text-muted-foreground">
              Confirme a data e os participantes antes de começar.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Data de Realização *</Label>
            <Input
              type="date"
              value={auditRealizationDate}
              onChange={(e) => setAuditRealizationDate(e.target.value)}
              className="border-input bg-background h-12"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Participantes (Opcional)</Label>
            <Input
              value={auditParticipants}
              onChange={(e) => setAuditParticipants(e.target.value)}
              placeholder="Nomes dos participantes separados por vírgula"
              className="border-input bg-background h-12"
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
          <span className="text-sm font-bold text-brand-deepBlue dark:text-brand-vividBlue bg-brand-deepBlue/10 px-3 py-1 rounded-full">
            Ação {wizardStep} de {auditActions.length}
          </span>
          <Badge variant="outline" className="border-border text-muted-foreground">
            {auditExecution.audits?.title}
          </Badge>
        </div>

        <h3 className="text-xl font-bold text-foreground leading-snug">
          {action.title}
          {action.evidence_required && (
            <span className="block mt-1 text-red-500 text-xs font-bold tracking-wide">
              * EVIDÊNCIA OBRIGATÓRIA
            </span>
          )}
        </h3>

        <div className="space-y-6 pt-2">
          <div>
            <Label className="mb-3 block text-foreground">Pontuação (1 a 5) *</Label>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5].map((score) => (
                <Button
                  key={score}
                  type="button"
                  variant={ans.score === score ? 'default' : 'outline'}
                  className={cn(
                    'flex-1 min-w-[3rem] h-14 text-xl font-black rounded-xl transition-all',
                    ans.score === score
                      ? 'bg-brand-deepBlue text-white scale-[1.02] shadow-md border-transparent'
                      : 'text-muted-foreground border-border hover:border-brand-deepBlue/50 hover:bg-brand-deepBlue/5',
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

          <div className="bg-muted/50 p-4 rounded-xl border border-border">
            <Label className="mb-2 block text-foreground">
              Anexar Evidência {action.evidence_required ? '(Obrigatória)' : '(Opcional)'}
            </Label>
            <div className="relative">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleEvidenceUpload(action.id, e.target.files?.[0])}
                className="bg-background border-input cursor-pointer file:cursor-pointer"
                disabled={ans.uploading}
              />
            </div>
            {ans.uploading && (
              <span className="text-xs text-brand-deepBlue dark:text-brand-vividBlue mt-2 flex items-center font-medium">
                <Loader2 className="w-3 h-3 animate-spin mr-1" /> Enviando arquivo...
              </span>
            )}
            {ans.evidence_url && !ans.uploading && (
              <div className="flex items-center gap-3 mt-3">
                <a
                  href={ans.evidence_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-green-600 dark:text-green-400 text-sm flex items-center font-medium hover:underline bg-green-500/10 w-fit px-3 py-1.5 rounded-lg border border-green-500/20"
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Ver arquivo anexado
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveEvidence(action.id)}
                  className="h-8 text-red-500 hover:text-red-700 hover:bg-red-500/10 px-2"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remover
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label className="mb-2 block text-foreground">Observações (Opcional)</Label>
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
              className="resize-none h-24 bg-background border-input"
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center pt-6 mt-6 border-t border-border gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setWizardStep(wizardStep - 1)}
            className="h-12 px-4 sm:px-6 border-border text-muted-foreground hover:bg-accent"
          >
            <ChevronLeft className="w-4 h-4 mr-2 shrink-0" /> Voltar
          </Button>
          <div className="flex flex-1 justify-center order-first sm:order-none w-full sm:w-auto items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Página
            </span>
            <Input
              type="text"
              value={pageInput}
              onChange={handlePageInputChange}
              onKeyDown={handlePageKeyDown}
              onBlur={handlePageBlur}
              className="w-14 h-9 text-center px-1 bg-background border-input"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              aria-label={`Ir para página, de 1 a ${auditActions.length}`}
            />
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              de {auditActions.length}
            </span>
          </div>
          {wizardStep < auditActions.length ? (
            <Button
              type="button"
              variant="tech"
              onClick={handleNextStep}
              className="h-12 px-4 sm:px-8"
            >
              Próximo <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="h-12 px-4 sm:px-8 bg-green-600 hover:bg-green-700 text-white shadow-md"
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
        <SheetContent className="sm:max-w-xl md:max-w-2xl flex flex-col h-[100dvh] p-0 bg-background border-l border-border overflow-hidden">
          <SheetHeader className="p-4 sm:p-6 pb-4 bg-card border-b border-border shrink-0">
            <SheetTitle className="text-xl text-foreground">
              {task?.task_number} {task?.title ? `- ${task.title}` : ''}
            </SheetTitle>
            <div className="text-sm text-muted-foreground mt-1">
              Aberto por{' '}
              <span className="font-medium text-foreground">
                {getAssigneeName(task?.requester_id)}
              </span>{' '}
              para{' '}
              <span className="font-medium text-foreground">
                {getAssigneeName(task?.assignee_id)}
              </span>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-6">
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-foreground">Descrição</h4>
                {task?.due_date && (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-600 border-amber-500/20"
                  >
                    Data Limite (SLA): {format(new Date(task.due_date), 'dd/MM/yyyy')}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                {task?.description}
              </p>

              {/* Participantes Section */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-foreground">Participantes</h5>
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
                    <span className="text-xs text-muted-foreground">
                      Nenhum participante adicionado.
                    </span>
                  ) : (
                    task.participants_ids.map((id: string) => {
                      const user = users.find((u: any) => u.id === id)
                      if (!user) return null
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="pl-1.5 pr-1 py-0.5 flex items-center gap-1 bg-muted text-foreground hover:bg-accent border border-border"
                        >
                          <User className="w-3 h-3 text-muted-foreground" />
                          {user.name}
                          <button
                            onClick={() => handleParticipantChange(id, false)}
                            className="ml-1 rounded-full p-0.5 hover:bg-accent-foreground/20 transition-colors text-muted-foreground"
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
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-foreground">Anexos</h5>
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
                  <span className="text-xs text-muted-foreground">Nenhum anexo adicionado.</span>
                ) : (
                  <div className="flex flex-col gap-2">
                    {attachmentUrls.map((url, i) => {
                      const urlPart = url.split('/').pop() || ''
                      const decodedName = decodeURIComponent(urlPart)
                      const fileName = decodedName.includes('_')
                        ? decodedName.split('_').slice(1).join('_')
                        : decodedName || `Anexo ${i + 1}`
                      return (
                        <div
                          key={i}
                          className="flex items-center p-2 rounded-lg bg-muted/50 border border-border group"
                        >
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center flex-1 text-sm text-brand-deepBlue dark:text-brand-vividBlue hover:underline"
                          >
                            <Paperclip className="w-4 h-4 mr-3 shrink-0 text-muted-foreground group-hover:text-brand-deepBlue dark:group-hover:text-brand-vividBlue" />
                            <span className="truncate">{fileName}</span>
                          </a>
                          {canDeleteAttachment && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 shrink-0 ml-2"
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
              <div className="bg-card p-6 rounded-2xl border border-border shadow-md relative overflow-hidden">
                {wizardStep > 0 && (
                  <div className="absolute top-0 left-0 h-1.5 bg-secondary w-full">
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
              <div className="mt-6 p-6 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
                <div>
                  <span className="font-bold text-green-600 dark:text-green-400 text-lg flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />{' '}
                    Auditoria Finalizada
                  </span>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    As respostas foram salvas e enviadas com sucesso.
                  </p>
                </div>
                <div className="text-right bg-card px-4 py-2 rounded-lg border border-green-500/20 shadow-sm">
                  <span className="block text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider mb-0.5">
                    Score Obtido
                  </span>
                  <span className="text-3xl font-black text-green-600 dark:text-green-400">
                    {auditExecution.final_score}{' '}
                    <span className="text-lg text-green-600 dark:text-green-400">
                      / {auditExecution.max_score}
                    </span>
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4">
              <h4 className="font-semibold text-foreground">Linha do Tempo</h4>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma interação registrada.
                </p>
              ) : (
                timeline.map((event: any) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-deepBlue/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-brand-deepBlue dark:text-brand-vividBlue" />
                    </div>
                    <div className="flex-1 bg-card p-3 rounded-xl border border-border shadow-sm">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm text-foreground">
                          {event.user?.name || 'Usuário'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.created_at), 'dd/MM HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-1 font-medium">{event.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 bg-card border-t border-border space-y-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] relative z-10">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 w-full sm:w-auto">
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                    Alterar Status:
                  </span>
                  <Select
                    value={task?.status_id}
                    onValueChange={handleStatusChange}
                    disabled={auditExecution && auditExecution.status !== 'Finalizado'}
                  >
                    <SelectTrigger className="bg-background border-input w-full sm:min-w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {taskStatuses.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: s.color }}
                            ></span>
                            <span className="truncate">{s.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {canDelegate && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 w-full sm:w-auto">
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                      Delegar para:
                    </span>
                    <Select
                      value={task?.assignee_id}
                      onValueChange={handleDelegate}
                      disabled={auditExecution && auditExecution.status !== 'Finalizado'}
                    >
                      <SelectTrigger className="bg-background border-input w-full sm:min-w-[140px] sm:max-w-[200px]">
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
                  className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-500/10 hover:text-red-700 dark:border-red-500/30 dark:hover:text-red-400"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  disabled={auditExecution && auditExecution.status !== 'Finalizado'}
                >
                  <Trash2 className="w-4 h-4 mr-2 shrink-0" /> Excluir Tarefa
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Adicione um comentário ou atualização..."
                className="resize-none h-10 min-h-[44px] bg-background border-input"
              />
              <Button
                onClick={handleAddComment}
                disabled={isSubmitting || !comment.trim()}
                variant="tech"
                className="h-auto px-4 shrink-0"
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
              <strong className="text-foreground">as respostas não poderão ser editadas</strong> e o
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
