import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Send, User, Paperclip } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

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

  // Audit specific state
  const [auditExecution, setAuditExecution] = useState<any>(null)
  const [auditActions, setAuditActions] = useState<any[]>([])
  const [auditAnswers, setAuditAnswers] = useState<Record<string, any>>({})
  const [auditRealizationDate, setAuditRealizationDate] = useState('')
  const [auditParticipants, setAuditParticipants] = useState('')
  const [isSavingAudit, setIsSavingAudit] = useState(false)

  useEffect(() => {
    if (isOpen && task) {
      loadTimeline()
      checkAudit()
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

      if (exec.status === 'Finalizado') {
        const { data: answers } = await supabase
          .from('audit_execution_answers')
          .select('*')
          .eq('execution_id', exec.id)
        const ansMap: Record<string, any> = {}
        answers?.forEach((a) => {
          ansMap[a.action_id] = a
        })
        setAuditAnswers(ansMap)
      }
    } else {
      setAuditExecution(null)
      setAuditActions([])
      setAuditAnswers({})
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
    const isTerminal = status?.is_terminal

    const payload: any = { status_id: newStatusId }
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

    onTaskUpdated()
    loadTimeline()
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
    } catch (e: any) {
      toast({ title: 'Erro no upload', description: e.message, variant: 'destructive' })
      setAuditAnswers((prev) => ({ ...prev, [actionId]: { ...prev[actionId], uploading: false } }))
    }
  }

  const handleSaveAudit = async () => {
    let hasError = false
    for (const action of auditActions) {
      const ans = auditAnswers[action.id]
      if (!ans || !ans.score) {
        hasError = true
        toast({ title: 'Preencha todas as notas', variant: 'destructive' })
        return
      }
      if (action.evidence_required && !ans.evidence_url) {
        hasError = true
        toast({ title: `Evidência obrigatória para: ${action.title}`, variant: 'destructive' })
        return
      }
    }
    if (!auditRealizationDate) {
      toast({ title: 'Preencha a data de realização', variant: 'destructive' })
      return
    }

    setIsSavingAudit(true)
    try {
      let totalScore = 0
      let maxScore = auditActions.length * 5

      const answersToInsert = auditActions.map((action) => {
        const ans = auditAnswers[action.id]
        totalScore += ans.score
        return {
          execution_id: auditExecution.id,
          action_id: action.id,
          score: ans.score,
          evidence_url: ans.evidence_url || null,
        }
      })

      await supabase.from('audit_execution_answers').insert(answersToInsert)

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

      toast({
        title: 'Auditoria finalizada com sucesso!',
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

  const getAssigneeName = (id: string) =>
    users.find((u: any) => u.id === id)?.name || 'Desconhecido'

  const attachmentUrls: string[] = task?.attachment_urls?.length
    ? task.attachment_urls
    : task?.attachment_url
      ? [task.attachment_url]
      : []

  return (
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
            <span className="font-medium text-slate-700">{getAssigneeName(task?.assignee_id)}</span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="font-semibold text-slate-800 mb-2">Descrição</h4>
            <p className="text-slate-600 text-sm whitespace-pre-wrap">{task?.description}</p>

            {attachmentUrls.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <h5 className="text-sm font-medium text-slate-700 mb-3">Anexos</h5>
                <div className="flex flex-col gap-2">
                  {attachmentUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center p-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-brand-deepBlue hover:bg-slate-100 transition-colors w-fit"
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      Anexo {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {auditExecution && (
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mt-4 animate-in fade-in">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-800 text-lg">Realização de Auditoria</h4>
                <Badge
                  variant="outline"
                  className="bg-brand-deepBlue/10 text-brand-deepBlue border-brand-deepBlue/20"
                >
                  {auditExecution.audits?.title}
                </Badge>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Data de Realização</Label>
                    <Input
                      type="date"
                      value={auditRealizationDate}
                      onChange={(e) => setAuditRealizationDate(e.target.value)}
                      disabled={auditExecution.status === 'Finalizado'}
                      className="border-slate-200 bg-slate-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Participantes</Label>
                    <Input
                      value={auditParticipants}
                      onChange={(e) => setAuditParticipants(e.target.value)}
                      placeholder="Nomes dos participantes"
                      disabled={auditExecution.status === 'Finalizado'}
                      className="border-slate-200 bg-slate-50"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h5 className="font-semibold text-slate-700">Ações a Avaliar</h5>
                  {auditActions.map((action, idx) => {
                    const ans = auditAnswers[action.id] || {}
                    return (
                      <div
                        key={action.id}
                        className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm"
                      >
                        <p className="font-medium text-slate-800 mb-3">
                          {idx + 1}. {action.title}
                          {action.evidence_required && (
                            <span className="text-red-500 text-xs ml-2 font-bold tracking-wide">
                              * OBRIGATÓRIO EVIDÊNCIA
                            </span>
                          )}
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <Button
                                key={score}
                                type="button"
                                variant={ans.score === score ? 'default' : 'outline'}
                                className={cn(
                                  'w-10 h-10 p-0 text-sm font-bold transition-all',
                                  ans.score === score
                                    ? 'bg-brand-deepBlue hover:bg-brand-deepBlue/90 scale-105'
                                    : 'text-slate-600',
                                )}
                                onClick={() =>
                                  setAuditAnswers({
                                    ...auditAnswers,
                                    [action.id]: { ...ans, score },
                                  })
                                }
                                disabled={auditExecution.status === 'Finalizado'}
                              >
                                {score}
                              </Button>
                            ))}
                          </div>
                          <div className="w-full sm:w-auto">
                            {auditExecution.status !== 'Finalizado' ? (
                              <div className="relative">
                                <Input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) =>
                                    handleEvidenceUpload(action.id, e.target.files?.[0])
                                  }
                                  className="w-full sm:w-64 text-xs file:text-xs cursor-pointer border-slate-200"
                                  disabled={ans.uploading}
                                />
                                {ans.evidence_url && !ans.uploading && (
                                  <span className="absolute -top-2 -right-2 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></span>
                                )}
                              </div>
                            ) : ans.evidence_url ? (
                              <a
                                href={ans.evidence_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand-deepBlue text-sm flex items-center hover:underline bg-brand-deepBlue/5 px-3 py-1.5 rounded-md w-fit"
                              >
                                <Paperclip className="w-4 h-4 mr-2" /> Ver Evidência
                              </a>
                            ) : (
                              <span className="text-sm text-slate-400 italic">Sem evidência</span>
                            )}
                            {ans.uploading && (
                              <span className="text-xs text-brand-deepBlue mt-1 flex items-center font-medium">
                                <Loader2 className="w-3 h-3 animate-spin mr-1" /> Enviando
                                arquivo...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {auditExecution.status !== 'Finalizado' ? (
                  <Button
                    onClick={handleSaveAudit}
                    disabled={isSavingAudit}
                    className="w-full mt-6 shadow-md"
                    variant="tech"
                    size="lg"
                  >
                    {isSavingAudit ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    Concluir e Salvar Auditoria
                  </Button>
                ) : (
                  <div className="mt-6 p-5 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between shadow-sm">
                    <span className="font-bold text-green-800 text-lg">Auditoria Finalizada</span>
                    <div className="text-right">
                      <span className="block text-xs text-green-700 font-medium uppercase tracking-wider mb-1">
                        Pontuação Final
                      </span>
                      <span className="text-3xl font-black text-green-900">
                        {auditExecution.final_score}{' '}
                        <span className="text-lg text-green-700">/ {auditExecution.max_score}</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
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
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
              Alterar Status:
            </span>
            <Select
              value={task?.status_id}
              onValueChange={handleStatusChange}
              disabled={auditExecution && auditExecution.status !== 'Finalizado'}
            >
              <SelectTrigger className="bg-slate-50 border-slate-200">
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
  )
}
