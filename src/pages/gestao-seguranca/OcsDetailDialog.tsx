import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Pencil, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { statusOcsVariant } from './OcsObservacoes'
import type { OcsObservacao } from './OcsObservacoes'
import type { OcsAcao } from './ocs-actions'
import type { ChecklistAnswer } from './ocs-checklist'

type Props = {
  observacao: OcsObservacao | null
  employees: any[]
  onClose: () => void
  onEdit: (o: OcsObservacao) => void
  onNovaAcao: (o: OcsObservacao) => void
}

export function OcsDetailDialog({ observacao, employees, onClose, onEdit, onNovaAcao }: Props) {
  const [acoes, setAcoes] = useState<OcsAcao[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!observacao?.id) {
      setAcoes([])
      return
    }
    let cancelado = false
    setLoading(true)
    supabase
      .from('ocs_acoes')
      .select('*')
      .eq('ocs_id', observacao.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelado) {
          setAcoes((data || []) as unknown as OcsAcao[])
          setLoading(false)
        }
      })
    return () => {
      cancelado = true
    }
  }, [observacao?.id])

  const respostas = (observacao?.respostas || []) as ChecklistAnswer[]
  const naoConformes = respostas.filter((r) => r.resposta === 'Não Conforme')
  const userName = (id: string | null) => {
    if (!id) return '—'
    return employees.find((e: any) => e.id === id)?.name || '—'
  }

  return (
    <Dialog open={!!observacao} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            OCS {observacao?.number_label || (observacao ? `#${observacao.number}` : '')}
          </DialogTitle>
          <DialogDescription>
            Detalhes da observação e ações geradas a partir dela.
          </DialogDescription>
        </DialogHeader>

        {observacao && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className={cn('border', statusOcsVariant(observacao.status))}
                >
                  {observacao.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="text-foreground">
                  {observacao.data_observacao
                    ? format(new Date(`${observacao.data_observacao}T12:00:00`), 'dd/MM/yyyy')
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Turno</p>
                <p className="text-foreground">{observacao.turno || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Local</p>
                <p className="text-foreground">{observacao.local || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Observado</p>
                <p className="text-foreground">{observacao.observado_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Atividade</p>
                <p className="text-foreground whitespace-pre-wrap">{observacao.atividade || '—'}</p>
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <h4 className="text-sm font-semibold">
                Checklist do COC{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  ({respostas.length} respondidos · {naoConformes.length} não conforme
                  {naoConformes.length === 1 ? '' : 's'})
                </span>
              </h4>
              {respostas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item respondido.</p>
              ) : (
                <ul className="space-y-1.5">
                  {respostas.map((r, i) => (
                    <li key={`${r.categoria}-${i}`} className="flex items-start gap-2 text-sm">
                      <Badge
                        variant="outline"
                        className={cn(
                          'shrink-0 text-[11px] border',
                          r.resposta === 'Conforme'
                            ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-300'
                            : r.resposta === 'Não Conforme'
                              ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300'
                              : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-500/15 dark:text-gray-300',
                        )}
                      >
                        {r.resposta}
                      </Badge>
                      <div>
                        <span className="text-foreground">
                          {r.subcategoria}{' '}
                          <span className="text-muted-foreground">({r.categoria})</span>
                        </span>
                        {r.observacao && (
                          <p className="text-xs text-muted-foreground">{r.observacao}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Ações</h4>
                <Button size="sm" variant="outline" onClick={() => onNovaAcao(observacao)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nova ação
                </Button>
              </div>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : acoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma ação criada. Use "Nova ação" para gerar uma tarefa com responsável.
                </p>
              ) : (
                <ul className="space-y-2">
                  {acoes.map((a) => (
                    <li key={a.id} className="border rounded-lg p-2.5 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{a.descricao}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            'shrink-0 text-[11px] border',
                            a.status === 'Concluída'
                              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-300'
                              : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300',
                          )}
                        >
                          {a.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Responsável: {userName(a.responsavel_id)}
                        {a.prazo
                          ? ` · Prazo: ${format(new Date(`${a.prazo}T12:00:00`), 'dd/MM/yyyy')}`
                          : ''}
                        {a.task_id ? ' · Tarefa vinculada gerada' : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {observacao && (
            <Button onClick={() => onEdit(observacao)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
