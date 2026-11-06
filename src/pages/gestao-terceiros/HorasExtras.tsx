import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { usePersistentScreenFilters } from '@/hooks/use-persistent-screen-filters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Clock,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Hourglass,
  Calendar,
  Building2,
  MapPin,
  FilterX,
  FileSpreadsheet,
} from 'lucide-react'
import { toast } from 'sonner'
import { resolveActiveEmployees } from '@/lib/employee-vigencia'
import { HorasExtrasTable, type SolicitacaoHe } from './components/HorasExtrasTable'
import { SolicitacaoHeDialog } from './components/SolicitacaoHeDialog'
import { DecisaoHeDialog } from './components/DecisaoHeDialog'

type FilterState = Record<string, unknown> & {
  plant: string
  company: string
  status: string
  dateFrom: string
  dateTo: string
}

const DEFAULT_FILTERS: FilterState = {
  plant: 'all',
  company: 'all',
  status: 'all',
  dateFrom: '',
  dateTo: '',
}

export default function HorasExtras() {
  const { profile, activeClient, selectedMasterClient } = useAppStore()
  const { plants } = useMasterData()

  // 1. Filtros persistidos por tela (regra permanente: usePersistentScreenFilters)
  const filterStore = usePersistentScreenFilters<FilterState>(
    'gestao-terceiros:horas-extras',
    DEFAULT_FILTERS,
  )
  const filters = filterStore.values
  const setFilter = <K extends keyof FilterState>(key: K, val: FilterState[K]) => {
    filterStore.set({ [key]: val } as Partial<FilterState>)
  }
  const resetFilters = filterStore.reset

  // Guard: se trocar de cliente, resetar filtros apenas em transição (nunca no mount)
  const prevClientRef = useRef<string | null>(null)
  useEffect(() => {
    const currentClientId = activeClient?.id || null
    if (prevClientRef.current !== null && prevClientRef.current !== currentClientId) {
      resetFilters()
    }
    prevClientRef.current = currentClientId
  }, [activeClient?.id, resetFilters])

  // Permissões
  const isAdminOrMaster = profile?.role === 'Administrador' || profile?.role === 'Master'
  const isMaster = profile?.role === 'Master'

  // Plantas autorizadas para usuários operacionais
  const authorizedPlantIds = useMemo(() => {
    if (isAdminOrMaster) return null
    if (!profile?.authorized_plants) return []
    try {
      const parsed = Array.isArray(profile.authorized_plants)
        ? profile.authorized_plants
        : JSON.parse(profile.authorized_plants as any)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [isAdminOrMaster, profile?.authorized_plants])

  // Plantas visíveis no filtro
  const visiblePlants = useMemo(() => {
    if (isAdminOrMaster) return plants
    if (!authorizedPlantIds) return plants
    return plants.filter((p) => authorizedPlantIds.includes(p.id))
  }, [plants, isAdminOrMaster, authorizedPlantIds])

  // Estado das solicitações
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoHe[]>([])
  const [loading, setLoading] = useState(true)

  // Colaboradores terceiros e empresas para o formulário
  const [employees, setEmployees] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])

  // Modais
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [decisaoModal, setDecisaoModal] = useState<{
    open: boolean
    solicitacao: SolicitacaoHe | null
    action: 'aprovar' | 'recusar' | null
  }>({
    open: false,
    solicitacao: null,
    action: null,
  })

  const effectiveClientId = useMemo(() => {
    if (isMaster) {
      return selectedMasterClient === 'all' ? null : selectedMasterClient
    }
    return profile?.client_id || activeClient?.id || null
  }, [isMaster, selectedMasterClient, profile, activeClient])

  // Carrega empresas e colaboradores ativos
  const fetchAuxData = useCallback(async () => {
    try {
      let empQuery = supabase
        .from('employees')
        .select(
          'id, name, company_id, company_name, plant_id, client_id, status, registration_number, reference_month, created_at',
        )
        .order('name')

      let compQuery = supabase
        .from('companies')
        .select('id, name, service_type, client_id')
        .order('name')

      if (effectiveClientId) {
        empQuery = empQuery.eq('client_id', effectiveClientId)
        compQuery = compQuery.eq('client_id', effectiveClientId)
      }

      if (!isAdminOrMaster && authorizedPlantIds && authorizedPlantIds.length > 0) {
        empQuery = empQuery.in('plant_id', authorizedPlantIds)
      }

      const [empRes, compRes] = await Promise.all([empQuery, compQuery])
      if (empRes.data) {
        // Aplica a regra de vigência oficial do projeto para deduplicar versões históricas
        // e descartar colaboradores cuja versão vigente não seja 'Ativo'
        const uniqueActive = resolveActiveEmployees(empRes.data as any[])
        setEmployees(uniqueActive)
      }
      if (compRes.data) setCompanies(compRes.data)
    } catch (err) {
      console.error('Erro ao buscar dados auxiliares de colaboradores:', err)
    }
  }, [effectiveClientId, isAdminOrMaster, authorizedPlantIds])

  // Carrega as solicitações de HE com filtros
  const fetchSolicitacoes = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('horas_extras_solicitacoes')
        .select(`
          id,
          client_id,
          employee_id,
          employee_name,
          company_id,
          company_name,
          plant_id,
          date,
          hours,
          reason,
          status,
          created_by,
          created_by_name,
          approved_by,
          approved_by_name,
          approved_at,
          manager_observation,
          created_at,
          updated_at,
          plants (
            id,
            name,
            code
          )
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (effectiveClientId) {
        q = q.eq('client_id', effectiveClientId)
      }

      if (filters.plant && filters.plant !== 'all') {
        q = q.eq('plant_id', filters.plant)
      } else if (!isAdminOrMaster && authorizedPlantIds && authorizedPlantIds.length > 0) {
        q = q.in('plant_id', authorizedPlantIds)
      }

      if (filters.company && filters.company !== 'all') {
        q = q.eq('company_id', filters.company)
      }

      if (filters.status && filters.status !== 'all') {
        q = q.eq('status', filters.status)
      }

      if (filters.dateFrom) {
        q = q.gte('date', filters.dateFrom)
      }

      if (filters.dateTo) {
        q = q.lte('date', filters.dateTo)
      }

      const { data, error } = await q
      if (error) throw error
      setSolicitacoes((data as unknown as SolicitacaoHe[]) || [])
    } catch (err: any) {
      console.error('Erro ao carregar solicitações de HE:', err)
      toast.error('Erro ao buscar solicitações de horas extras.')
    } finally {
      setLoading(false)
    }
  }, [effectiveClientId, filters, isAdminOrMaster, authorizedPlantIds])

  useEffect(() => {
    fetchAuxData()
  }, [fetchAuxData])

  useEffect(() => {
    fetchSolicitacoes()
  }, [fetchSolicitacoes])

  // Ações de criação de solicitação
  const handleCreateSolicitacao = async (data: {
    employee_id: string
    employee_name: string
    company_id: string | null
    company_name: string
    plant_id: string
    date: string
    hours: number
    reason: string
  }) => {
    const targetClientId = effectiveClientId || profile?.client_id || activeClient?.id
    if (!targetClientId) {
      toast.error('Cliente não identificado para associar a solicitação.')
      return
    }

    // Se company_id vier nulo, tenta resolver pelo nome na lista de empresas do cliente
    let resolvedCompanyId = data.company_id
    if (!resolvedCompanyId && data.company_name && companies.length > 0) {
      const matchComp = companies.find(
        (c) => c.name?.trim().toLowerCase() === data.company_name?.trim().toLowerCase(),
      )
      if (matchComp?.id) {
        resolvedCompanyId = matchComp.id
      }
    }

    const { error } = await supabase.from('horas_extras_solicitacoes').insert({
      client_id: targetClientId,
      employee_id: data.employee_id,
      employee_name: data.employee_name,
      company_id: resolvedCompanyId || null,
      company_name: data.company_name,
      plant_id: data.plant_id,
      date: data.date,
      hours: data.hours,
      reason: data.reason || null,
      status: 'pendente',
      created_by: profile?.id || null,
      created_by_name: profile?.name || profile?.email || 'Usuário',
    })

    if (error) {
      toast.error('Erro ao registrar solicitação: ' + error.message)
      throw error
    }

    toast.success('Solicitação de Horas Extras registrada com status Pendente!')
    fetchSolicitacoes()
  }

  // Ação de aprovar/recusar (Apenas Admin/Master)
  const handleDecisao = async (solicitacaoId: string, observacao: string) => {
    if (!isAdminOrMaster) {
      toast.error('Apenas Administradores podem aprovar ou recusar solicitações de HE.')
      return
    }

    const newStatus = decisaoModal.action === 'aprovar' ? 'aprovada' : 'recusada'

    const { error } = await supabase
      .from('horas_extras_solicitacoes')
      .update({
        status: newStatus,
        approved_by: profile?.id || null,
        approved_by_name: profile?.name || profile?.email || 'Gestor Administrador',
        approved_at: new Date().toISOString(),
        manager_observation: observacao || null,
      })
      .eq('id', solicitacaoId)

    if (error) {
      toast.error(`Erro ao ${decisaoModal.action} solicitação: ` + error.message)
      throw error
    }

    toast.success(`Solicitação ${newStatus === 'aprovada' ? 'Aprovada' : 'Recusada'} com sucesso!`)
    fetchSolicitacoes()
  }

  // Cards de resumo
  const summary = useMemo(() => {
    let pendentes = 0
    let aprovadas = 0
    let recusadas = 0
    let totalHorasAprovadas = 0

    solicitacoes.forEach((s) => {
      if (s.status === 'pendente') pendentes++
      if (s.status === 'aprovada') {
        aprovadas++
        totalHorasAprovadas += Number(s.hours) || 0
      }
      if (s.status === 'recusada') recusadas++
    })

    return {
      total: solicitacoes.length,
      pendentes,
      aprovadas,
      recusadas,
      totalHorasAprovadas,
    }
  }, [solicitacoes])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/gestao-terceiros">Gestão de Terceiros</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Horas Extras</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-brand-vividBlue" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Gestão de Horas Extras de Terceiros
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Solicitações de horas extras para colaboradores terceiros com fluxo de aprovação por
            gestor e integração via API REST.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSolicitacoes()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => setIsNewDialogOpen(true)}
            className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Solicitação de HE
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Pendentes de Aprovação
              </span>
              <Hourglass className="h-4 w-4 text-amber-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">{summary.pendentes}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            Aguardando decisão do gestor
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Aprovadas
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-emerald-700">
              {summary.aprovadas}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            Total acumulado: {summary.totalHorasAprovadas.toFixed(1)}h
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Recusadas
              </span>
              <XCircle className="h-4 w-4 text-rose-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-rose-700">{summary.recusadas}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            Não autorizadas pelo gestor
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-brand-vividBlue shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total de Solicitações
              </span>
              <Clock className="h-4 w-4 text-brand-vividBlue" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">{summary.total}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            Histórico completo no filtro
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros Persistidos */}
      <Card className="bg-slate-50/50 border-slate-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Planta / Unidade
              </Label>
              <Select value={filters.plant} onValueChange={(val) => setFilter('plant', val)}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue placeholder="Todas as Plantas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Plantas</SelectItem>
                  {visiblePlants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-600 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Empresa Terceira
              </Label>
              <Select value={filters.company} onValueChange={(val) => setFilter('company', val)}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue placeholder="Todas as Empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Empresas</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-600 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Status da Solicitação
              </Label>
              <Select value={filters.status} onValueChange={(val) => setFilter('status', val)}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovada">Aprovada</SelectItem>
                  <SelectItem value="recusada">Recusada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-600 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Data Inicial
              </Label>
              <Input
                type="date"
                className="h-9 text-xs bg-white"
                value={filters.dateFrom}
                onChange={(e) => setFilter('dateFrom', e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-600 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Data Final
              </Label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  className="h-9 text-xs bg-white"
                  value={filters.dateTo}
                  onChange={(e) => setFilter('dateTo', e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-2 text-slate-500 hover:text-slate-800"
                  onClick={resetFilters}
                  title="Limpar todos os filtros"
                >
                  <FilterX className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Solicitações */}
      <HorasExtrasTable
        solicitacoes={solicitacoes}
        loading={loading}
        canManage={isAdminOrMaster}
        onApprove={(sol) => setDecisaoModal({ open: true, solicitacao: sol, action: 'aprovar' })}
        onReject={(sol) => setDecisaoModal({ open: true, solicitacao: sol, action: 'recusar' })}
      />

      {/* Modal: Nova Solicitação */}
      <SolicitacaoHeDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        employees={employees}
        plants={plants}
        onSubmit={handleCreateSolicitacao}
      />

      {/* Modal: Decisão (Aprovar / Recusar) */}
      <DecisaoHeDialog
        open={decisaoModal.open}
        onOpenChange={(open) => setDecisaoModal((prev) => ({ ...prev, open }))}
        solicitacao={decisaoModal.solicitacao}
        action={decisaoModal.action}
        onConfirm={handleDecisao}
      />
    </div>
  )
}
