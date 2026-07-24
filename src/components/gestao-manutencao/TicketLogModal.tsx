import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchTicketLogs, MaintenanceTicketLog } from '@/services/maintenance-logs'
import { Clock, User, ArrowRight } from 'lucide-react'

interface TicketLogModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: string | null
}

const actionLabels: Record<string, string> = {
  ticket_created: 'Abertura do Chamado',
  status_changed: 'Alteração de Status',
  field_updated: 'Campo Atualizado',
  Abertura: 'Abertura do Chamado',
  'Alteração de Status': 'Alteração de Status',
  'Alteração de Executor': 'Alteração de Executor',
  'Planejamento - Início': 'Planejamento — Início',
  'Planejamento - Fim': 'Planejamento — Fim',
  'Início de Atendimento': 'Início de Atendimento',
  Finalização: 'Finalização',
  'Notas de Fechamento': 'Notas de Fechamento',
}

const fieldLabels: Record<string, string> = {
  assignee_id: 'Executor',
  description: 'Descrição',
  priority_id: 'Prioridade',
  planned_start: 'Planejamento — Início',
  planned_end: 'Planejamento — Fim',
  actual_start: 'Início de Atendimento',
  actual_end: 'Finalização',
  closure_notes: 'Notas de Fechamento',
  closure_photos: 'Fotos de Fechamento',
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const parseFieldValue = (val: string | null): { field: string; value: string } | null => {
  if (!val) return null
  const sepIdx = val.indexOf(': ')
  if (sepIdx === -1) return null
  return { field: val.substring(0, sepIdx), value: val.substring(sepIdx + 2) }
}

const getDisplayLabel = (log: MaintenanceTicketLog): string => {
  if (log.action_type === 'field_updated' && log.new_value) {
    const parsed = parseFieldValue(log.new_value)
    if (parsed && fieldLabels[parsed.field]) {
      return fieldLabels[parsed.field]
    }
  }
  return actionLabels[log.action_type] || log.action_type
}

const getDisplayOldValue = (log: MaintenanceTicketLog): string | null => {
  if (log.action_type === 'field_updated' && log.old_value) {
    const parsed = parseFieldValue(log.old_value)
    if (parsed) return parsed.value
  }
  return log.old_value
}

const getDisplayNewValue = (log: MaintenanceTicketLog): string | null => {
  if (log.action_type === 'field_updated' && log.new_value) {
    const parsed = parseFieldValue(log.new_value)
    if (parsed) return parsed.value
  }
  return log.new_value
}

export function TicketLogModal({ open, onOpenChange, ticketId }: TicketLogModalProps) {
  const [logs, setLogs] = useState<MaintenanceTicketLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && ticketId) {
      setLoading(true)
      fetchTicketLogs(ticketId)
        .then(setLogs)
        .catch(() => setLogs([]))
        .finally(() => setLoading(false))
    } else {
      setLogs([])
    }
  }, [open, ticketId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Ações
          </DialogTitle>
          <DialogDescription>
            Linha do tempo completa de ações realizadas neste chamado.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-3 h-3 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              Nenhum registro encontrado.
            </div>
          ) : (
            <div className="space-y-1 py-2">
              {logs.map((log, index) => {
                const displayLabel = getDisplayLabel(log)
                const oldVal = getDisplayOldValue(log)
                const newVal = getDisplayNewValue(log)
                return (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full mt-1 ${index === 0 ? 'bg-green-500' : index === logs.length - 1 ? 'bg-brand-vividBlue' : 'bg-muted-foreground/40'}`}
                      />
                      {index < logs.length - 1 && (
                        <div className="w-0.5 flex-1 bg-muted-foreground/20 min-h-[2rem]" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {displayLabel}
                        </Badge>
                        {oldVal && newVal && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            {oldVal}
                            <ArrowRight className="w-3 h-3" />
                            {newVal}
                          </span>
                        )}
                        {!oldVal && newVal && (
                          <span className="text-xs text-muted-foreground">{newVal}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {log.user?.name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {log.user.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
