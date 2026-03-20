import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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

export function TaskDetailsSheet({
  task,
  isOpen,
  onClose,
  taskStatuses,
  users,
  onTaskUpdated,
}: any) {
  const { profile } = useAppStore()
  const [timeline, setTimeline] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && task) {
      loadTimeline()
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

  const getAssigneeName = (id: string) =>
    users.find((u: any) => u.id === id)?.name || 'Desconhecido'

  const attachmentUrls: string[] = task?.attachment_urls?.length
    ? task.attachment_urls
    : task?.attachment_url
      ? [task.attachment_url]
      : []

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl flex flex-col h-full p-0 bg-slate-50 border-l border-gray-200">
        <SheetHeader className="p-6 pb-4 bg-white border-b border-gray-200">
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

        <div className="p-4 bg-white border-t border-gray-200 space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
              Alterar Status:
            </span>
            <Select value={task?.status_id} onValueChange={handleStatusChange}>
              <SelectTrigger className="bg-white">
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
              className="resize-none h-10 min-h-[44px]"
            />
            <Button
              onClick={handleAddComment}
              disabled={isSubmitting || !comment.trim()}
              variant="tech"
              className="h-auto"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
