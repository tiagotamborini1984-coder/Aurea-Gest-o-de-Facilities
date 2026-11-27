import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Plus, Eye, ClipboardList, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { OcsFormDialog } from './OcsFormDialog'
import { OcsDetailDialog } from './OcsDetailDialog'
import type { ChecklistAnswer } from './ocs-checklist'

/** Registro completo de ocs_observacoes (forma carregada da listagem). */
export type OcsObservacao = {
  id: string
  number: number
  number_label: string | null
  client_id: string
  plant_id: string | null
  observador: string | null
  observado_name: string | null
  data_observacao: string
  turno: string | null
  local: string | null
  atividade: string | null
  respostas: ChecklistAnswer[]
  status: string
}

const STATUS_VARIANT: Record<string, string> = {
  'Em elaboração':
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300',
  'Em andamento':
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300',
  Concluída:
    'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-300',
}

export function statusOcsVariant(status: string) {
  return (
    STATUS_VARIANT[status] ||
    'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-500/15 dark:text-gray-300'
  )
}

export default function OcsObservacoes() {
  const { profile, selectedMasterClient } = useAppStore()
  const { plants, employees, loading: masterLoading } = useMasterData()
  const { toast } = useToast()

  const [observacoes, setObservacoes] = useState<OcsObservacao[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<OcsObservacao | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [acaoDialogFor, setAcaoDialogFor] = useState<OcsObservacao | null>(null)

  const [acaoDescricao, setAcaoDescricao] = useState('')
  const [acaoResponsavel, setAcaoResponsavel] = useState('')
  const [acaoPrazo, setAcaoPrazo] = useState('')
  const [acaoSaving, setAcaoSaving] = useState(false)

  const scopedClientId =
    profile?.role === 'Master'
      ? selectedMasterClient && selectedMasterClient !== 'all'
        ? selectedMasterClient
        : null
      : profile?.client_id || null

  const carregar = useCallback(async () => {
    if (!profile) return
    if (profile.role !== 'Master' && !profile.client_id) {
      setLoading(false)
      return
    }
    setLoading(true)
    let q = supabase.from('ocs_observacoes').select('*')
    if (scopedClientId) q = q.eq('client_id', scopedClientId)
    const { data, error } = await q.order('number', { ascending: false })
    if (error) {
      toast({
        title: 'Erro ao carregar observações',
        description: error.message,
        variant: 'destructive',
      })
      setObservacoes([])
    } else {
      setObservacoes((data || []) as unknown as OcsObservacao[])
    }
    setLoading(false)
  }, [profile, scopedClientId, toast])

  useEffect(() => {
    carregar()
  }, [carregar])

  const detailObs = useMemo(
    () => observacoes.find((o) => o.id === detailId) || null,
    [observacoes, detailId],
  )

  const plantName = (id: string | null) => plants.find((p: any) => p.id === id)?.name || '—'
  const userName = (id: string | null) => {
    if (!id) return '—'
    if (id === profile?.id) return profile?.name || 'Você'
    return employees.find((e: any) => e.id === id)?.name || '—'
  }

  async function salvarRespostas(respostas: ChecklistAnswer[], campos: any, targetId?: string) {
    const payload = {
      observador: campos.observador || profile?.id || null,
      data_observacao: campos.data_observacao,
      turno: campos.turno || null,
      local: campos.local || null,
      atividade: campos.atividade || null,
      observado_name: campos.observado_name || null,
      respostas,
      status: campos.status || 'Em elaboração',
    }
    if (targetId) {
      const { error } = await supabase.from('ocs_observacoes').update(payload).eq('id', targetId)
      if (error) throw error
    } else {
      if (!scopedClientId) throw new Error('Selecione uma empresa no topo antes de criar a OCS.')
      const { error } = await supabase.from('ocs_observacoes').insert({
        ...payload,
        client_id: scopedClientId,
        plant_id: campos.plant_id || null,
        // Placeholder obrigatório (coluna NOT NULL): o trigger set_ocs_number
        // substitui qualquer valor <= 0 pelo sequencial real do cliente.
        number: 0,
      })
      if (error) throw error
    }
    await carregar()
  }

  async function criarAcao() {
    if (!acaoDialogFor) return
    if (!acaoDescricao.trim() || !acaoResponsavel) {
      toast({
        title: 'Preencha os campos obrigatórios',
        description: 'Descrição e responsável são obrigatórios.',
        variant: 'destructive',
      })
      return
    }
    setAcaoSaving(true)
    try {
      const { criarAcaoComTarefa } = await import('./ocs-actions')
      await criarAcaoComTarefa({
        ocs_id: acaoDialogFor.id,
        client_id: acaoDialogFor.client_id,
        plant_id: acaoDialogFor.plant_id,
        number_label: acaoDialogFor.number_label || `#${acaoDialogFor.number}`,
        titulo: acaoDescricao.trim(),
        descricao: acaoDescricao.trim(),
        responsavel_id: acaoResponsavel,
        prazo: acaoPrazo || null,
        requester_id: profile?.id || acaoResponsavel,
      })
      toast({
        title: 'Ação criada!',
        description:
          'A tarefa do tipo "Observação de Segurança" foi gerada para o responsável executar.',
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      setAcaoDialogFor(null)
      setAcaoDescricao('')
      setAcaoResponsavel('')
      setAcaoPrazo('')
    } catch (err: any) {
      toast({
        title: 'Erro ao criar ação',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setAcaoSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-graphite">
            OCS - Observação Comportamental de Segurança
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registre observações de campo com o checklist do Cartão de Observação (COC) e gere ações
            com responsável e prazo.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Observação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="w-5 h-5 text-brand" />
            Observações registradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading || masterLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : observacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma observação registrada ainda. Clique em "Nova Observação" para começar.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 px-2 font-medium">Número</th>
                    <th className="py-2 px-2 font-medium">Data</th>
                    <th className="py-2 px-2 font-medium">Turno</th>
                    <th className="py-2 px-2 font-medium">Local</th>
                    <th className="py-2 px-2 font-medium">Observador</th>
                    <th className="py-2 px-2 font-medium">Status</th>
                    <th className="py-2 px-2 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {observacoes.map((o) => (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2.5 px-2 font-semibold whitespace-nowrap">
                        {o.number_label || `#${o.number}`}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {o.data_observacao
                          ? format(new Date(`${o.data_observacao}T12:00:00`), 'dd/MM/yyyy')
                          : '—'}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">{o.turno || '—'}</td>
                      <td className="py-2.5 px-2">{o.local || '—'}</td>
                      <td className="py-2.5 px-2">{userName(o.observador)}</td>
                      <td className="py-2.5 px-2">
                        <Badge
                          variant="outline"
                          className={cn('border', statusOcsVariant(o.status))}
                        >
                          {o.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDetailId(o.id)}
                          aria-label={`Ver detalhes da observação ${o.number_label || o.number}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <OcsFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        plants={plants}
        employees={employees}
        currentUserId={profile?.id || null}
        onSave={salvarRespostas}
      />

      <OcsDetailDialog
        observacao={detailObs}
        employees={employees}
        onClose={() => setDetailId(null)}
        onEdit={(o) => {
          setDetailId(null)
          setEditing(o)
          setFormOpen(true)
        }}
        onNovaAcao={(o) => setAcaoDialogFor(o)}
      />

      {/* Dialog de criação de ação */}
      <Dialog open={!!acaoDialogFor} onOpenChange={(open) => !open && setAcaoDialogFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Ação da OCS {acaoDialogFor?.number_label || ''}</DialogTitle>
            <DialogDescription>
              A ação gera automaticamente uma Tarefa do tipo "Observação de Segurança" para o
              responsável executar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="acao-descricao">Descrição da ação *</Label>
              <Textarea
                id="acao-descricao"
                value={acaoDescricao}
                onChange={(e) => setAcaoDescricao(e.target.value)}
                placeholder="Descreva o que deve ser feito para corrigir/atender a observação"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="acao-responsavel">Responsável *</Label>
                <Select value={acaoResponsavel} onValueChange={setAcaoResponsavel}>
                  <SelectTrigger id="acao-responsavel">
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acao-prazo">Prazo</Label>
                <Input
                  id="acao-prazo"
                  type="date"
                  value={acaoPrazo}
                  onChange={(e) => setAcaoPrazo(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setAcaoDialogFor(null)}
                disabled={acaoSaving}
              >
                Cancelar
              </Button>
              <Button onClick={criarAcao} disabled={acaoSaving}>
                {acaoSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar ação e gerar tarefa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
