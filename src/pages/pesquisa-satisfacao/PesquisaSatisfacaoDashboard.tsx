import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { satisfactionSurveyService } from '@/services/satisfaction-surveys'
import { SurveyDashboardMetrics, SatisfactionSurvey } from '@/types/satisfaction-surveys'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import {
  BarChart3,
  Calendar,
  Building2,
  Filter,
  Star,
  Smile,
  Users,
  Award,
  ArrowLeft,
  RefreshCw,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'

const SCORE_COLORS = [
  '#ef4444', // 0-2 Vermelho
  '#f97316', // 3-4 Laranja
  '#eab308', // 5-6 Amarelo
  '#3b82f6', // 7-8 Azul
  '#10b981', // 9-10 Verde
]

const BAR_PALETTE = ['#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#38bdf8']

export function PesquisaSatisfacaoDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeClient, selectedMasterClient } = useAppStore()

  const currentClientId =
    activeClient?.id ||
    (selectedMasterClient && selectedMasterClient !== 'all' ? selectedMasterClient : undefined)

  // Filtros
  const [plantId, setPlantId] = useState(searchParams.get('plantId') || 'all')
  const [surveyType, setSurveyType] = useState(searchParams.get('surveyType') || 'all')
  const [surveyId, setSurveyId] = useState(searchParams.get('surveyId') || 'all')
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '')
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '')

  // Dados auxiliares
  const [plants, setPlants] = useState<{ id: string; name: string; code?: string }[]>([])
  const [surveysList, setSurveysList] = useState<SatisfactionSurvey[]>([])
  const [metrics, setMetrics] = useState<SurveyDashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  // Carregar Plantas e Pesquisas para os filtros
  useEffect(() => {
    const fetchOptions = async () => {
      let qPlants = supabase.from('plants').select('id, name, code').order('name')
      if (currentClientId) {
        qPlants = qPlants.eq('client_id', currentClientId)
      }
      const { data: plantsData } = await qPlants
      if (plantsData) setPlants(plantsData)

      try {
        const surveysData = await satisfactionSurveyService.getSurveys(currentClientId)
        setSurveysList(surveysData)
      } catch (e) {
        console.error(e)
      }
    }
    fetchOptions()
  }, [currentClientId])

  // Tipos únicos para o select
  const surveyTypes = useMemo(() => {
    const types = new Set<string>()
    surveysList.forEach((s) => {
      if (s.survey_type) types.add(s.survey_type)
    })
    return Array.from(types)
  }, [surveysList])

  // Carregar métricas do dashboard
  const loadMetrics = async () => {
    setLoading(true)
    try {
      const data = await satisfactionSurveyService.getDashboardMetrics({
        clientId: currentClientId,
        plantId: plantId === 'all' ? undefined : plantId,
        surveyType: surveyType === 'all' ? undefined : surveyType,
        surveyId: surveyId === 'all' ? undefined : surveyId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      setMetrics(data)
    } catch (err: any) {
      console.error('Erro ao carregar métricas:', err)
      toast.error('Erro ao carregar dados do dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [currentClientId, plantId, surveyType, surveyId, startDate, endDate])

  // Limpar filtros
  const handleClearFilters = () => {
    setPlantId('all')
    setSurveyType('all')
    setSurveyId('all')
    setStartDate('')
    setEndDate('')
    setSearchParams({})
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs -ml-2">
              <Link to="/pesquisa-satisfacao">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Voltar para Pesquisas
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-brand-vividBlue" />
            Dashboard de Pesquisa de Satisfação
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Métricas de qualidade percebida, notas médias por setor e distribuição de respostas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMetrics}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Dados
          </Button>
        </div>
      </div>

      {/* Painel de Filtros */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Filter className="h-3.5 w-3.5" />
              Filtros Estratégicos
            </div>
            {(plantId !== 'all' ||
              surveyType !== 'all' ||
              surveyId !== 'all' ||
              startDate ||
              endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Filtro Planta */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Planta</label>
              <Select value={plantId} onValueChange={setPlantId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todas as Plantas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Plantas</SelectItem>
                  {plants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.code ? `(${p.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Tipo */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                Tipo de Pesquisa
              </label>
              <Select value={surveyType} onValueChange={setSurveyType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todos os Tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  {surveyTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Pesquisa Específica */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Pesquisa</label>
              <Select value={surveyId} onValueChange={setSurveyId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todas as Pesquisas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Pesquisas</SelectItem>
                  {surveysList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Período Início */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Data Início</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Filtro Período Fim */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Data Fim</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total de Respostas */}
        <Card className="border shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total de Respostas
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-foreground">
                  {metrics?.totalResponses ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">no período filtrado</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-brand-vividBlue">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Média Geral de Satisfação */}
        <Card className="border shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Nota Média Geral
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold text-foreground">
                  {metrics?.overallAvgScore !== null && metrics?.overallAvgScore !== undefined
                    ? metrics.overallAvgScore.toFixed(1)
                    : '--'}
                </span>
                <span className="text-xs text-muted-foreground font-medium">/ 10.0</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-500">
              <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        {/* Nível de Qualidade Geral */}
        <Card className="border shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Classificação Geral
              </p>
              <div className="mt-1.5">
                {metrics?.overallAvgScore ? (
                  <Badge
                    className={
                      metrics.overallAvgScore >= 8.5
                        ? 'bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5'
                        : metrics.overallAvgScore >= 7.0
                          ? 'bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5'
                          : metrics.overallAvgScore >= 5.0
                            ? 'bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5'
                            : 'bg-red-100 text-red-800 text-xs px-2.5 py-0.5'
                    }
                  >
                    {metrics.overallAvgScore >= 8.5
                      ? 'Excelente (Zona de Encantamento)'
                      : metrics.overallAvgScore >= 7.0
                        ? 'Bom (Zona de Qualidade)'
                        : metrics.overallAvgScore >= 5.0
                          ? 'Atenção (Zona de Aperfeiçoamento)'
                          : 'Crítico (Zona de Correção Imediata)'}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Sem dados suficientes</span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
              <Award className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico 1: Distribuição Geral por Faixa de Nota */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Distribuição por Faixa de Avaliação
            </CardTitle>
            <CardDescription className="text-xs">
              Contagem e percentual de avaliações em cada intervalo de nota (0 a 10)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {metrics?.scoreDistribution && metrics.scoreDistribution.some((d) => d.count > 0) ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics.scoreDistribution}
                    margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis
                      dataKey="scoreRange"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [
                        `${val} votos (${item.payload.percentage}%)`,
                        'Quantidade',
                      ]}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {metrics.scoreDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={SCORE_COLORS[index % SCORE_COLORS.length]}
                        />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="top"
                        style={{ fontSize: 11, fontWeight: 'bold' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs">
                Nenhuma nota numérica registrada para os filtros selecionados.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela Resumo: Desempenho por Pesquisa */}
        <Card className="border shadow-sm bg-white dark:bg-slate-900 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Desempenho Consolidado por Pesquisa
            </CardTitle>
            <CardDescription className="text-xs">
              Volume de respostas e nota média apurada para cada formulário
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 overflow-y-auto max-h-[260px]">
            {metrics?.surveysBreakdown && metrics.surveysBreakdown.length > 0 ? (
              <div className="space-y-3">
                {metrics.surveysBreakdown.map((s) => (
                  <div
                    key={s.surveyId}
                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {s.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                          {s.type}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {s.plantName}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-sm text-foreground">
                          {s.avgScore !== null ? s.avgScore.toFixed(1) : '--'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {s.responsesCount} {s.responsesCount === 1 ? 'resposta' : 'respostas'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">
                Nenhuma pesquisa encontrada para os filtros.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO DETALHADA: RESULTADOS POR PERGUNTA */}
      <div className="space-y-4 pt-2">
        <div className="border-b pb-2 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-brand-vividBlue" />
              Detalhamento de Resultados por Pergunta
            </h2>
            <p className="text-xs text-muted-foreground">
              Análise individual de cada pergunta cadastrada (médias, gráficos de múltipla escolha e
              comentários de texto).
            </p>
          </div>
        </div>

        {metrics?.questionMetrics && metrics.questionMetrics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metrics.questionMetrics.map((qm, idx) => (
              <Card
                key={qm.questionId}
                className="border shadow-sm bg-white dark:bg-slate-900 flex flex-col"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {qm.surveyTitle}
                      </Badge>
                      <CardTitle className="text-sm font-semibold leading-snug text-foreground">
                        {idx + 1}. {qm.questionTitle}
                      </CardTitle>
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
                      {qm.totalAnswers} respostas
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                  {/* CASO A: PERGUNTA NUMÉRICA (0-10, 1-5 ESTRELAS OU ESCALA DE ROSTINHOS) */}
                  {(qm.questionType === 'rating_10' ||
                    qm.questionType === 'rating_5' ||
                    qm.questionType === 'smiley_5') && (
                    <div className="py-4 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border">
                      <div className="flex items-center gap-2">
                        {qm.questionType === 'smiley_5' ? (
                          <Smile className="h-6 w-6 text-emerald-600" />
                        ) : (
                          <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                        )}
                        <span className="text-3xl font-extrabold text-foreground">
                          {qm.avgRating !== null && qm.avgRating !== undefined
                            ? qm.avgRating.toFixed(1)
                            : '--'}
                        </span>
                        <span className="text-sm text-muted-foreground font-semibold">
                          / {qm.questionType === 'rating_10' ? '10.0' : '5.0'}
                          {qm.questionType === 'smiley_5'
                            ? ' (Rostinhos)'
                            : qm.questionType === 'rating_5'
                              ? ' estrelas'
                              : ''}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Média apurada entre todas as submissões
                      </p>
                      {qm.questionType === 'smiley_5' && qm.avgRating !== null && (
                        <div className="mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {qm.avgRating >= 4.5
                            ? 'Muito Satisfeito'
                            : qm.avgRating >= 3.5
                              ? 'Satisfeito'
                              : qm.avgRating >= 2.5
                                ? 'Regular'
                                : qm.avgRating >= 1.5
                                  ? 'Insatisfeito'
                                  : 'Muito Insatisfeito'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CASO B: MÚLTIPLA ESCOLHA COM GRÁFICO DE BARRAS */}
                  {qm.questionType === 'multiple_choice' && (
                    <div className="space-y-3 pt-1">
                      {qm.distribution && qm.distribution.length > 0 ? (
                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={qm.distribution}
                              layout="vertical"
                              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={false}
                                opacity={0.3}
                              />
                              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                              <YAxis
                                dataKey="label"
                                type="category"
                                width={110}
                                tick={{ fontSize: 10 }}
                              />
                              <Tooltip
                                formatter={(val: any, _, item: any) => [
                                  `${val} votos (${item.payload.percentage}%)`,
                                  'Opção',
                                ]}
                              />
                              <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]}>
                                {qm.distribution.map((_, dIdx) => (
                                  <Cell
                                    key={`bar-cell-${dIdx}`}
                                    fill={BAR_PALETTE[dIdx % BAR_PALETTE.length]}
                                  />
                                ))}
                                <LabelList
                                  dataKey="percentage"
                                  position="right"
                                  formatter={(v: any) => `${v}%`}
                                  style={{ fontSize: 10, fontWeight: 'bold' }}
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-6">
                          Sem escolhas computadas até o momento.
                        </p>
                      )}
                    </div>
                  )}

                  {/* CASO C: TEXTO LIVRE COM LISTA DE COMENTÁRIOS */}
                  {qm.questionType === 'text' && (
                    <div className="space-y-2 pt-1 max-h-56 overflow-y-auto pr-1">
                      {qm.textAnswers && qm.textAnswers.length > 0 ? (
                        qm.textAnswers.map((item, tIdx) => (
                          <div
                            key={tIdx}
                            className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border text-xs space-y-1"
                          >
                            <p className="text-foreground italic">"{item.text}"</p>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                              <span>
                                {item.location ? `Local: ${item.location}` : 'Avaliação Geral'}
                              </span>
                              <span>
                                {new Date(item.date).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-6">
                          Nenhum comentário por escrito registrado.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border shadow-sm p-12 text-center text-muted-foreground text-sm">
            Nenhuma resposta ou pergunta encontrada para os filtros selecionados.
          </Card>
        )}
      </div>
    </div>
  )
}

export default PesquisaSatisfacaoDashboard
