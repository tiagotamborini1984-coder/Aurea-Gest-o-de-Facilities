import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { useHasAccess } from '@/hooks/use-has-access'
import { auditCategoryService, AuditCategoryMetricsResult } from '@/services/audit-categories'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  Building2,
  Calendar as CalendarIcon,
  Filter,
  RotateCcw,
  Tag,
  Loader2,
  HelpCircle,
  Inbox,
  ArrowLeft,
  SlidersHorizontal,
} from 'lucide-react'
import { format, subMonths, startOfYear, endOfMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type PeriodPreset =
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'current_year'
  | 'all'
  | 'custom'

export default function IndicadoresCategorias() {
  const navigate = useNavigate()
  const { profile, activeClient } = useAppStore()
  const { plants } = useMasterData()
  const hasAccess = useHasAccess('Auditoria e Checklist')

  // Filtros
  const [filterAuditTitle, setFilterAuditTitle] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPlant, setFilterPlant] = useState<string>('all')
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('last_6_months')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  // Dados
  const [availableTitles, setAvailableTitles] = useState<string[]>([])
  const [availableTypes, setAvailableTypes] = useState<string[]>([])
  const [metrics, setMetrics] = useState<AuditCategoryMetricsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingTitles, setLoadingTitles] = useState(true)
  const [loadingTypes, setLoadingTypes] = useState(true)

  const effectiveClientId = activeClient?.id || profile?.client_id

  // Plantas autorizadas para o usuário logado
  const authorizedPlants = useMemo(() => {
    if (!profile) return []
    if (profile.role === 'Master' || profile.role === 'Administrador') {
      return plants
    }
    const userAuthPlants = (profile.authorized_plants as string[]) || []
    return plants.filter((p) => userAuthPlants.includes(p.id))
  }, [profile, plants])

  // Calcular datas de acordo com o preset de período
  const dateRange = useMemo(() => {
    const today = new Date()
    const formatDate = (d: Date) => format(d, 'yyyy-MM-dd')

    switch (periodPreset) {
      case 'last_month': {
        const lastM = subMonths(today, 1)
        return {
          start: format(new Date(lastM.getFullYear(), lastM.getMonth(), 1), 'yyyy-MM-dd'),
          end: format(endOfMonth(lastM), 'yyyy-MM-dd'),
        }
      }
      case 'last_3_months': {
        const start3 = subMonths(today, 3)
        return {
          start: formatDate(start3),
          end: formatDate(today),
        }
      }
      case 'last_6_months': {
        const start6 = subMonths(today, 6)
        return {
          start: formatDate(start6),
          end: formatDate(today),
        }
      }
      case 'current_year': {
        return {
          start: formatDate(startOfYear(today)),
          end: formatDate(today),
        }
      }
      case 'custom': {
        return {
          start: customStartDate || null,
          end: customEndDate || null,
        }
      }
      case 'all':
      default:
        return { start: null, end: null }
    }
  }, [periodPreset, customStartDate, customEndDate])

  // Carregar títulos e tipos de auditoria
  useEffect(() => {
    if (!effectiveClientId) return

    let isMounted = true
    setLoadingTitles(true)
    setLoadingTypes(true)

    auditCategoryService
      .getAuditTitles(effectiveClientId)
      .then((titles) => {
        if (isMounted) setAvailableTitles(titles)
      })
      .catch((err) => {
        console.error('Erro ao buscar títulos de auditoria:', err)
      })
      .finally(() => {
        if (isMounted) setLoadingTitles(false)
      })

    auditCategoryService
      .getAuditTypes(effectiveClientId)
      .then((types) => {
        if (isMounted) setAvailableTypes(types)
      })
      .catch((err) => {
        console.error('Erro ao buscar tipos de auditoria:', err)
      })
      .finally(() => {
        if (isMounted) setLoadingTypes(false)
      })

    return () => {
      isMounted = false
    }
  }, [effectiveClientId])

  // Carregar métricas agregadas da RPC
  const fetchMetrics = useCallback(async () => {
    if (!effectiveClientId) return

    setLoading(true)
    try {
      // Determinar plantas a filtrar:
      // se selecionou 'all', passa todas as autorizadas (ou null se for admin/master)
      let plantIdsParam: string[] | null = null
      if (filterPlant !== 'all') {
        plantIdsParam = [filterPlant]
      } else if (profile?.role !== 'Master' && profile?.role !== 'Administrador') {
        plantIdsParam = authorizedPlants.map((p) => p.id)
      }

      const result = await auditCategoryService.getCategoryMetrics({
        clientId: effectiveClientId,
        auditType: filterType,
        auditTitle: filterAuditTitle,
        plantIds: plantIdsParam,
        startDate: dateRange.start,
        endDate: dateRange.end,
      })

      setMetrics(result)
    } catch (err) {
      console.error('Erro ao carregar métricas por categoria:', err)
      setMetrics({
        summary: {
          total_executions: 0,
          overall_compliance_pct: 0,
          total_evaluated_questions: 0,
          total_points_lost: 0,
          best_category: null,
          worst_category: null,
        },
        categories: [],
        trend: [],
      })
    } finally {
      setLoading(false)
    }
  }, [
    effectiveClientId,
    filterType,
    filterAuditTitle,
    filterPlant,
    dateRange.start,
    dateRange.end,
    profile?.role,
    authorizedPlants,
  ])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const handleResetFilters = () => {
    setFilterAuditTitle('all')
    setFilterType('all')
    setFilterPlant('all')
    setPeriodPreset('last_6_months')
    setCustomStartDate('')
    setCustomEndDate('')
  }

  // Preparação de dados para o gráfico de tendência temporal
  // Cada linha será uma categoria (chave = id ou name), no eixo X teremos os meses formatados (ex: Mai/26)
  const { trendChartData, trendCategories } = useMemo(() => {
    if (!metrics?.trend || metrics.trend.length === 0) {
      return { trendChartData: [], trendCategories: [] }
    }

    const catMap = new Map<string, { id: string; name: string; color: string }>()

    const rows = metrics.trend.map((monthItem) => {
      let formattedMonth = monthItem.month
      try {
        const [year, m] = monthItem.month.split('-')
        const d = new Date(Number(year), Number(m) - 1, 1)
        formattedMonth = format(d, 'MMM/yy', { locale: ptBR })
      } catch {
        // fallback original
      }

      const row: Record<string, any> = {
        monthKey: monthItem.month,
        monthLabel: formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1),
      }

      monthItem.categories.forEach((cat) => {
        row[cat.category_id] = cat.compliance_percentage
        if (!catMap.has(cat.category_id)) {
          catMap.set(cat.category_id, {
            id: cat.category_id,
            name: cat.category_name,
            color: cat.category_color || '#3b82f6',
          })
        }
      })

      return row
    })

    return {
      trendChartData: rows,
      trendCategories: Array.from(catMap.values()),
    }
  }, [metrics?.trend])

  // Ordenação das categorias para o gráfico de barras horizontais:
  // Decrescente por conformidade para espelhar o padrão de exibição
  const barChartData = useMemo(() => {
    if (!metrics?.categories) return []
    return [...metrics.categories].sort((a, b) => b.compliance_percentage - a.compliance_percentage)
  }, [metrics?.categories])

  const chartBarHeight = Math.max(260, (barChartData.length || 0) * 44 + 60)

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  const hasData = metrics && (metrics.summary.total_executions > 0 || metrics.categories.length > 0)

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in p-4 sm:p-6">
      {/* Header com Navegação e Título */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/auditoria-checklist/criadas')}
              className="text-muted-foreground hover:text-foreground -ml-2 h-8 px-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Auditoria e Checklist
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-foreground">
              <BarChart3 className="w-7 h-7 text-primary shrink-0" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground sm:hidden">
                Auditoria selecionada
              </span>
            </div>
            <div className="w-full sm:min-w-[320px] md:min-w-[420px] max-w-[620px]">
              <Select
                value={filterAuditTitle}
                onValueChange={setFilterAuditTitle}
                disabled={loadingTitles}
              >
                <SelectTrigger
                  aria-label="Selecionar auditoria"
                  className="h-11 sm:h-12 bg-background border-input font-bold text-base sm:text-xl md:text-2xl tracking-tight text-foreground px-3.5 shadow-sm rounded-lg hover:border-primary/50 transition-colors focus:ring-2 focus:ring-primary/20"
                >
                  <SelectValue placeholder="Todas as auditorias" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all" className="font-semibold text-sm">
                    Todas as auditorias
                  </SelectItem>
                  {availableTitles.map((title) => (
                    <SelectItem key={title} value={title} className="text-sm">
                      {title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Acompanhamento agregado e ponderado do nível de conformidade por categoria de pergunta,
            tipo e planta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/auditoria-checklist/categorias')}
            className="flex items-center gap-1.5"
          >
            <Tag className="w-4 h-4 text-primary" />
            Gerenciar Categorias
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/auditoria-checklist/dashboard')}
            className="flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-600" />
            Dashboard Geral
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <Card className="border shadow-sm bg-card">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Filter className="w-4 h-4 text-primary" />
              <span>Filtros do Painel:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Filtro: Tipo de Auditoria */}
              <div className="w-full sm:w-48">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Tipo de Auditoria
                </label>
                <Select value={filterType} onValueChange={setFilterType} disabled={loadingTypes}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Tipo de auditoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {availableTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro: Planta */}
              <div className="w-full sm:w-56">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Planta / Unidade
                </label>
                <Select value={filterPlant} onValueChange={setFilterPlant}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Planta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as plantas</SelectItem>
                    {authorizedPlants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro: Período Preset */}
              <div className="w-full sm:w-48">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  Período
                </label>
                <Select
                  value={periodPreset}
                  onValueChange={(val) => setPeriodPreset(val as PeriodPreset)}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_month">Último Mês</SelectItem>
                    <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
                    <SelectItem value="last_6_months">Últimos 6 Meses</SelectItem>
                    <SelectItem value="current_year">Ano Corrente</SelectItem>
                    <SelectItem value="all">Todo o Histórico</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campos de Data se 'custom' */}
              {periodPreset === 'custom' && (
                <div className="flex items-center gap-2 col-span-full sm:col-span-2">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      De
                    </label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="h-9 bg-background text-xs w-36"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Até
                    </label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="h-9 bg-background text-xs w-36"
                    />
                  </div>
                </div>
              )}

              {/* Botão Resetar */}
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  title="Limpar filtros"
                  className="h-9 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Limpar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground text-sm font-medium">
            Calculando conformidade ponderada por categoria...
          </p>
        </div>
      ) : !hasData ? (
        /* Empty State */
        <Card className="border border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Inbox className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Nenhum dado encontrado para os filtros selecionados
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5">
                Não existem auditorias finalizadas correspondentes aos filtros de tipo, planta ou
                período selecionados.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                <RotateCcw className="w-4 h-4 mr-1.5" /> Resetar Filtros
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/auditoria-checklist/realizadas')}
              >
                Ver Auditorias Realizadas
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Conteúdo Principal dos Indicadores */
        <div className="space-y-6">
          {/* 1. Cards de Resumo no Topo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total de Auditorias */}
            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Auditorias Concluídas
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black text-foreground mt-0.5">
                    {metrics?.summary.total_executions ?? 0}
                  </h3>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {metrics?.summary.total_evaluated_questions.toLocaleString('pt-BR')} itens
                    avaliados
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Conformidade Geral */}
            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Conformidade Geral
                  </p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <h3 className="text-2xl sm:text-3xl font-black text-foreground">
                      {metrics?.summary.overall_compliance_pct ?? 0}%
                    </h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Ponderado por peso das perguntas
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Categoria Mais Crítica */}
            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Mais Crítica
                  </p>
                  {metrics?.summary.worst_category ? (
                    <>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span
                          className="text-base font-bold text-foreground truncate"
                          title={metrics.summary.worst_category.name}
                        >
                          {metrics.summary.worst_category.name}
                        </span>
                        <span className="text-base font-black text-rose-600 dark:text-rose-400 shrink-0">
                          {metrics.summary.worst_category.compliance_percentage}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: metrics.summary.worst_category.color }}
                        />
                        <p className="text-[11px] text-muted-foreground">Menor pontuação</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">—</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Melhor Categoria */}
            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Melhor Desempenho
                  </p>
                  {metrics?.summary.best_category ? (
                    <>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span
                          className="text-base font-bold text-foreground truncate"
                          title={metrics.summary.best_category.name}
                        >
                          {metrics.summary.best_category.name}
                        </span>
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                          {metrics.summary.best_category.compliance_percentage}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: metrics.summary.best_category.color }}
                        />
                        <p className="text-[11px] text-muted-foreground">Maior conformidade</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">—</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 2. Gráfico de Barras Horizontais por Categoria + Tabela Resumo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Conformidade por Categoria (Ponderada)
                    </CardTitle>
                    <CardDescription>
                      Pontuação obtida vs. máxima possível por agrupamento, calculada com base no
                      peso das perguntas.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    {barChartData.length} categorias
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div style={{ height: chartBarHeight }} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barChartData}
                      layout="vertical"
                      margin={{ top: 12, right: 36, left: 16, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        unit="%"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={180}
                        tick={{ fontSize: 12, fill: '#334155' }}
                      />
                      <Tooltip
                        formatter={(value: any, _name: any, entry: any) => {
                          const item = entry.payload
                          return [
                            `${value}% (${item.obtained_score}/${item.max_possible_score} pts ponderados • ${item.evaluated_questions} respostas • -${item.points_lost} pts perdidos)`,
                            'Conformidade',
                          ]
                        }}
                        contentStyle={{
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="compliance_percentage" radius={[0, 6, 6, 0]} barSize={22}>
                        {barChartData.map((entry) => (
                          <Cell key={entry.id} fill={entry.color || '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Painel Lateral com Detalhamento das Categorias */}
            <Card className="border shadow-sm flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  Detalhamento dos Resultados
                </CardTitle>
                <CardDescription>Volume de itens e pontos perdidos por grupo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 flex-1 overflow-y-auto max-h-[460px] pr-1">
                {barChartData.map((cat) => {
                  const pct = cat.compliance_percentage
                  const statusColor =
                    pct >= 85
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : pct >= 70
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400'

                  return (
                    <div
                      key={cat.id}
                      className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <p className="font-semibold text-foreground truncate" title={cat.name}>
                            {cat.name}
                          </p>
                        </div>
                        <span className={`font-black text-sm shrink-0 ${statusColor}`}>{pct}%</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-muted-foreground text-[11px] pt-1 border-t border-border/50">
                        <div>
                          <span>Itens avaliados:</span>{' '}
                          <strong className="text-foreground">{cat.evaluated_questions}</strong>
                        </div>
                        <div className="text-right">
                          <span>Pontos perdidos:</span>{' '}
                          <strong className="text-rose-600 dark:text-rose-400">
                            {cat.points_lost}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {/* 3. Gráfico de Tendência Temporal por Categoria */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Tendência Mensal por Categoria
                  </CardTitle>
                  <CardDescription>
                    Evolução do percentual de conformidade de cada categoria ao longo dos meses do
                    período selecionado.
                  </CardDescription>
                </div>
                {trendCategories.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {trendCategories.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-background"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {c.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {trendChartData.length <= 1 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground text-sm">
                  <CalendarIcon className="w-8 h-8 mb-2 opacity-50" />
                  <p>Dados históricos concentrados em um único mês.</p>
                  <p className="text-xs mt-1">
                    Selecione um período mais amplo (ex: "Últimos 6 Meses" ou "Todo o Histórico")
                    para visualizar a curva de evolução contínua.
                  </p>
                </div>
              ) : (
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendChartData}
                      margin={{ top: 16, right: 30, left: -10, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="monthLabel"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        unit="%"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                        }}
                        formatter={(val: any, name: any) => {
                          const catInfo = trendCategories.find((c) => c.id === name)
                          return [`${val}%`, catInfo?.name || name]
                        }}
                        labelFormatter={(label) => `Mês: ${label}`}
                      />
                      {trendCategories.map((cat) => (
                        <Line
                          key={cat.id}
                          type="monotone"
                          dataKey={cat.id}
                          name={cat.id}
                          stroke={cat.color || '#3b82f6'}
                          strokeWidth={2.5}
                          dot={{ r: 4, strokeWidth: 1.5, fill: '#ffffff' }}
                          activeDot={{ r: 6 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
