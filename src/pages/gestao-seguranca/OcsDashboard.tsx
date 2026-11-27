import { useCallback, useEffect, useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { AlertTriangle, BarChart3, ClipboardList, Users } from 'lucide-react'
import { OcsPrintDialog } from './OcsPrint'
import { format } from 'date-fns'
import { statusOcsVariant, type OcsObservacao } from './OcsObservacoes'
import type { OcsAcao } from './ocs-actions'

type AcaoResumo = {
  id: string
  ocs_id: string
  status: string
  responsavel_id: string | null
  prazo: string | null
  task_id: string | null
}

type UsuarioNome = { id: string; name: string }

type Props = {
  plants: any[]
  /** Planta selecionada no filtro ('' = todas as autorizadas / consolidado) */
  plantId: string
  onPlantChange: (id: string) => void
  /** Datas ISO yyyy-MM-dd; '' = sem limite */
  dataInicio: string
  dataFim: string
  onDataInicioChange: (v: string) => void
  onDataFimChange: (v: string) => void
  observacoes: OcsObservacao[]
  loading: boolean
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string
  value: string | number
  hint?: string
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className={cn('mt-1 text-2xl font-bold', className)}>{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

export default function OcsDashboard({
  plants,
  plantId,
  onPlantChange,
  dataInicio,
  dataFim,
  onDataInicioChange,
  onDataFimChange,
  observacoes,
  loading,
}: Props) {
  const { profile, selectedMasterClient } = useAppStore()
  const { toast } = useToast()
  const [printTarget, setPrintTarget] = useState<OcsObservacao | null>(null)
  const [acoesDaPrint, setAcoesDaPrint] = useState<OcsAcao[]>([])
  const [loadingPrint, setLoadingPrint] = useState(false)
  const plantasAutorizadas = useMemo(() => {
    // authorized_plants vazio = todas as plantas do cliente (convenção v0.0.1904)
    if (profile?.role === 'Master') return plants
    const auth = (profile?.authorized_plants || []) as string[]
    if (!auth.length) return plants
    return plants.filter((p: any) => auth.includes(p.id))
  }, [plants, profile])

  const scopedClientId =
    profile?.role === 'Master'
      ? selectedMasterClient && selectedMasterClient !== 'all'
        ? selectedMasterClient
        : null
      : profile?.client_id || null

  const [acoes, setAcoes] = useState<AcaoResumo[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioNome[]>([])
  const [loadingAcoes, setLoadingAcoes] = useState(true)

  const observacoesIds = useMemo(() => observacoes.map((o) => o.id), [observacoes])

  const carregarAcoes = useCallback(async () => {
    if (!profile) return
    if (profile.role !== 'Master' && !profile.client_id) {
      setLoadingAcoes(false)
      return
    }
    setLoadingAcoes(true)
    let q = supabase.from('ocs_acoes').select('id, ocs_id, status, responsavel_id, prazo, task_id')
    if (scopedClientId) q = q.eq('client_id', scopedClientId)
    const { data, error } = await q
    if (error) {
      toast({
        title: 'Erro ao carregar ações das OCS',
        description: error.message,
        variant: 'destructive',
      })
      setAcoes([])
    } else {
      setAcoes((data || []) as unknown as AcaoResumo[])
    }
    setLoadingAcoes(false)
  }, [profile, scopedClientId, toast])

  useEffect(() => {
    carregarAcoes()
  }, [carregarAcoes])

  const nomeUsuario = useCallback(
    (id: string | null) => {
      if (!id) return '—'
      return usuarios.find((u) => u.id === id)?.name || '—'
    },
    [usuarios],
  )

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'Master' && !profile.client_id) return
    let q = supabase.from('profiles').select('id, name')
    if (scopedClientId) q = q.eq('client_id', scopedClientId)
    q.then(({ data }) => setUsuarios((data || []) as UsuarioNome[]))
  }, [profile, scopedClientId])

  // Ações pertencentes às OCS do filtro atual (planta + período, via observações)
  const acoesFiltradas = useMemo(
    () => acoes.filter((a) => observacoesIds.includes(a.ocs_id)),
    [acoes, observacoesIds],
  )

  const total = observacoes.length
  const porStatus = useMemo(() => {
    const m = new Map<string, number>()
    observacoes.forEach((o) => m.set(o.status, (m.get(o.status) || 0) + 1))
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }, [observacoes])

  const observadoresMaisAtivos = useMemo(() => {
    const m = new Map<string, number>()
    observacoes.forEach((o) => {
      if (!o.observador) return
      m.set(o.observador, (m.get(o.observador) || 0) + 1)
    })
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [observacoes])

  // Itens do checklist mais apontados (prioriza Não Conforme no ranking)
  const itensMaisApontados = useMemo(() => {
    const m = new Map<string, { item: string; categoria: string; nc: number; total: number }>()
    observacoes.forEach((o) => {
      const respostas = (o.respostas || []) as any[]
      respostas.forEach((r) => {
        const key = `${r.categoria}::${r.subcategoria}`
        const atual = m.get(key) || {
          item: r.subcategoria,
          categoria: r.categoria,
          nc: 0,
          total: 0,
        }
        atual.total += 1
        if (r.resposta === 'Não Conforme') atual.nc += 1
        m.set(key, atual)
      })
    })
    return Array.from(m.entries())
      .map(([, v]) => v)
      .sort((a, b) => b.nc - a.nc || b.total - a.total)
      .slice(0, 8)
  }, [observacoes])

  const acoesPendentes = acoesFiltradas.filter((a) => a.status !== 'Concluída')
  const acoesConcluidas = acoesFiltradas.filter((a) => a.status === 'Concluída')

  const naoConformesTotal = useMemo(
    () =>
      observacoes.reduce(
        (acc, o) =>
          acc + ((o.respostas || []) as any[]).filter((r) => r.resposta === 'Não Conforme').length,
        0,
      ),
    [observacoes],
  )

  const nomePlanta = (id: string | null) => plants.find((p: any) => p.id === id)?.name || 'Todas'
  const intervaloLabel =
    dataInicio && dataFim
      ? `${format(new Date(`${dataInicio}T12:00:00`), 'dd/MM/yyyy')} — ${format(
          new Date(`${dataFim}T12:00:00`),
          'dd/MM/yyyy',
        )}`
      : dataInicio
        ? `de ${format(new Date(`${dataInicio}T12:00:00`), 'dd/MM/yyyy')}`
        : dataFim
          ? `até ${format(new Date(`${dataFim}T12:00:00`), 'dd/MM/yyyy')}`
          : 'Todo o período'

  const checklistPreenchido = observacoes.some((o) => (o.respostas || []).length > 0)

  /** Abre a impressão do Cartão de Observação completo da OCS selecionada. */
  const abrirImpressao = useCallback(
    async (o: OcsObservacao) => {
      setPrintTarget(o)
      setLoadingPrint(true)
      const { data, error } = await supabase
        .from('ocs_acoes')
        .select('id, ocs_id, descricao, responsavel_id, prazo, status, task_id')
        .eq('ocs_id', o.id)
        .order('created_at', { ascending: true })
      if (error) {
        toast({
          title: 'Erro ao carregar ações para impressão',
          description: error.message,
          variant: 'destructive',
        })
      }
      setAcoesDaPrint((data || []) as unknown as OcsAcao[])
      setLoadingPrint(false)
    },
    [toast],
  )

  return (
    <div className="space-y-6">
      {/* Filtros (planta + período) */}
      <Card className="print-hide">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5 text-brand" />
            Filtros do dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ocs-dash-plant">Unidade (planta)</Label>
            <Select value={plantId} onValueChange={onPlantChange}>
              <SelectTrigger id="ocs-dash-plant">
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as unidades</SelectItem>
                {plantasAutorizadas.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ocs-dash-inicio">Data inicial</Label>
            <Input
              id="ocs-dash-inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => onDataInicioChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ocs-dash-fim">Data final</Label>
            <Input
              id="ocs-dash-fim"
              type="date"
              value={dataFim}
              onChange={(e) => onDataFimChange(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !scopedClientId ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-2 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <p className="text-sm font-medium">Selecione a unidade</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Selecione a planta no filtro acima para visualizar o dashboard das OCS.
            </p>
          </CardContent>
        </Card>
      ) : observacoes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma OCS encontrada para os filtros selecionados.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total de OCS"
              value={total}
              hint={`${intervaloLabel} · ${nomePlanta(plantId === 'all' ? null : plantId)}`}
              icon={<ClipboardList className="w-8 h-8 text-brand opacity-60" />}
            />
            <MetricCard
              label="Não conformidades"
              value={naoConformesTotal}
              hint="Itens do checklist marcados como Não Conforme"
              icon={<AlertTriangle className="w-8 h-8 text-red-500 opacity-70" />}
              className="text-red-600 dark:text-red-400"
            />
            <MetricCard
              label="Ações pendentes"
              value={acoesPendentes.length}
              hint={`${acoesConcluidas.length} concluída${acoesConcluidas.length === 1 ? '' : 's'}`}
              icon={<Users className="w-8 h-8 text-amber-500 opacity-70" />}
            />
            <MetricCard
              label="Itens do checklist"
              value={observacoes.reduce((acc, o) => acc + (o.respostas || []).length, 0)}
              hint="Somatório de itens respondidos no período"
              icon={<BarChart3 className="w-8 h-8 text-brand opacity-60" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {porStatus.map(([status, qtd]) => (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline" className={cn('border', statusOcsVariant(status))}>
                        {status}
                      </Badge>
                      <span className="font-medium">
                        {qtd} ({total ? Math.round((qtd / total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${total ? (qtd / total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observadores mais ativos</CardTitle>
              </CardHeader>
              <CardContent>
                {observadoresMaisAtivos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem dados de observador no período.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {observadoresMaisAtivos.map(([id, qtd]) => (
                      <li key={id} className="flex items-center justify-between text-sm">
                        <span>{nomeUsuario(id)}</span>
                        <span className="font-medium">{qtd}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {checklistPreenchido && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Itens do checklist mais apontados</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {itensMaisApontados.map((it) => (
                    <li
                      key={`${it.categoria}::${it.item}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate">{it.item}</p>
                        <p className="text-xs text-muted-foreground">{it.categoria}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={cn(
                            'font-medium',
                            it.nc > 0 && 'text-red-600 dark:text-red-400',
                          )}
                        >
                          {it.nc} NC
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {it.total} apontamento{it.total === 1 ? '' : 's'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ações das OCS do período</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAcoes ? (
                <Skeleton className="h-16 w-full" />
              ) : acoesFiltradas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma ação gerada pelas OCS deste período.
                </p>
              ) : (
                <ul className="space-y-2">
                  {acoesFiltradas.map((a) => {
                    const ocsDaAcao = observacoes.find((o) => o.id === a.ocs_id)
                    return (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 border rounded-lg p-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {ocsDaAcao?.number_label || `#${ocsDaAcao?.number || ''}`} —{' '}
                            {nomeUsuario(a.responsavel_id)}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {a.prazo
                              ? `Prazo: ${format(new Date(`${a.prazo}T12:00:00`), 'dd/MM/yyyy')}`
                              : 'Sem prazo'}
                            {a.task_id ? ' · Tarefa vinculada' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="border">
                            {a.status}
                          </Badge>
                          {ocsDaAcao && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => abrirImpressao(ocsDaAcao)}
                              aria-label={`Imprimir OCS ${ocsDaAcao.number_label || ocsDaAcao.number}`}
                            >
                              <Printer className="w-4 h-4 mr-1" />
                              Imprimir OCS
                            </Button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Imprimir Cartão de Observação (OCS)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Selecione a OCS do período para imprimir o cartão completo com checklist,
                participantes e ações.
              </p>
              <ul className="space-y-2">
                {observacoes.map((o) => (
                  <li
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-2 border rounded-lg p-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {o.number_label || `#${o.number}`} ·{' '}
                        {o.data_observacao
                          ? format(new Date(`${o.data_observacao}T12:00:00`), 'dd/MM/yyyy')
                          : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {o.local || 'Sem local'} · {nomeUsuario(o.observador)} · {o.status}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirImpressao(o)}
                      aria-label={`Imprimir OCS ${o.number_label || o.number}`}
                    >
                      <Printer className="w-4 h-4 mr-1" />
                      Imprimir
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      <OcsPrintDialog
        open={!!printTarget}
        onOpenChange={(open) => !open && setPrintTarget(null)}
        observacao={printTarget}
        acoes={acoesDaPrint}
        loading={loadingPrint}
        plantas={plants}
        usuarios={usuarios}
      />
    </div>
  )
}
