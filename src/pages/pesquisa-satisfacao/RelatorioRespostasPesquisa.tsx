import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { satisfactionSurveyService } from '@/services/satisfaction-surveys'
import {
  SatisfactionSurvey,
  DetailedSurveyResponse,
  SurveyResponseAnswer,
} from '@/types/satisfaction-surveys'
import {
  buildQuestionsHierarchy,
  exportSurveyResponsesToXlsx,
  exportSurveyResponsesToCSV,
  formatAnswerValue,
  QuestionHierarchyNode,
} from './utils/survey-report-export'
import { SurveyResponseDetailModal } from './components/SurveyResponseDetailModal'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Filter,
  Layers,
  Search,
  FileSpreadsheet,
  FileText,
  Building2,
  RefreshCw,
  Eye,
  GitBranch,
  Smile,
  Star,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  TableProperties,
  BarChart3,
  SlidersHorizontal,
  Printer,
} from 'lucide-react'
import { generateSurveyReportPdf } from './utils/survey-pdf-export'
import { toast } from 'sonner'

export function RelatorioRespostasPesquisa() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeClient, selectedMasterClient } = useAppStore()

  const currentClientId =
    activeClient?.id ||
    (selectedMasterClient && selectedMasterClient !== 'all' ? selectedMasterClient : undefined)

  // Filtros principais
  const [surveyId, setSurveyId] = useState<string>(searchParams.get('surveyId') || '')
  const [plantId, setPlantId] = useState<string>(searchParams.get('plantId') || 'all')
  const [startDate, setStartDate] = useState<string>(searchParams.get('startDate') || '')
  const [endDate, setEndDate] = useState<string>(searchParams.get('endDate') || '')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Paginação e visualização
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [viewMode, setViewMode] = useState<'condensed' | 'expanded'>('condensed')

  // Dados
  const [surveysList, setSurveysList] = useState<SatisfactionSurvey[]>([])
  const [currentSurvey, setCurrentSurvey] = useState<SatisfactionSurvey | null>(null)
  const [responses, setResponses] = useState<DetailedSurveyResponse[]>([])
  const [plants, setPlants] = useState<{ id: string; name: string; code?: string }[]>([])
  const [loading, setLoading] = useState(true)

  // Modal de detalhes individuais
  const [selectedResponse, setSelectedResponse] = useState<DetailedSurveyResponse | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // 1. Carregar lista de pesquisas e plantas disponíveis
  useEffect(() => {
    const fetchMetadata = async () => {
      let qPlants = supabase.from('plants').select('id, name, code').order('name')
      if (currentClientId) {
        qPlants = qPlants.eq('client_id', currentClientId)
      }
      const { data: plantsData } = await qPlants
      if (plantsData) setPlants(plantsData)

      try {
        const surveysData = await satisfactionSurveyService.getSurveys(currentClientId)
        setSurveysList(surveysData)

        // Se nenhum surveyId foi selecionado na URL, selecionar a primeira pesquisa
        if (!surveyId && surveysData.length > 0) {
          setSurveyId(surveysData[0].id)
        }
      } catch (err) {
        console.error('Erro ao carregar pesquisas:', err)
      }
    }

    fetchMetadata()
  }, [currentClientId])

  // 2. Atualizar URL quando os filtros mudarem
  useEffect(() => {
    const params: Record<string, string> = {}
    if (surveyId) params.surveyId = surveyId
    if (plantId && plantId !== 'all') params.plantId = plantId
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    setSearchParams(params, { replace: true })
  }, [surveyId, plantId, startDate, endDate])

  // 3. Carregar respostas detalhadas da pesquisa selecionada
  const loadResponses = async () => {
    if (!surveyId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await satisfactionSurveyService.getDetailedSurveyResponses({
        surveyId,
        clientId: currentClientId,
        plantId: plantId === 'all' ? undefined : plantId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        searchTerm: searchTerm || undefined,
      })
      setCurrentSurvey(data.survey)
      setResponses(data.responses)
      setCurrentPage(1)
    } catch (err: any) {
      console.error('Erro ao carregar relatório detalhado:', err)
      toast.error('Não foi possível carregar as respostas desta pesquisa.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadResponses()
  }, [surveyId, plantId, startDate, endDate])

  // Recarregar com debounce na busca
  useEffect(() => {
    const timer = setTimeout(() => {
      loadResponses()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // 4. Árvore hierárquica das perguntas (Pai -> Filha -> Subfilha)
  const questionsHierarchy: QuestionHierarchyNode[] = useMemo(() => {
    if (!currentSurvey?.questions) return []
    return buildQuestionsHierarchy(currentSurvey.questions)
  }, [currentSurvey])

  // Respostas paginadas
  const totalResponsesCount = responses.length
  const totalPages = Math.ceil(totalResponsesCount / pageSize) || 1
  const paginatedResponses = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return responses.slice(start, start + pageSize)
  }, [responses, currentPage, pageSize])

  // Métricas rápidas da pesquisa selecionada
  const stats = useMemo(() => {
    let numericSum = 0
    let numericCount = 0
    let smileySatisfiedCount = 0
    let smileyTotal = 0

    for (const r of responses) {
      for (const a of r.answers || []) {
        if (a.numeric_value !== null && a.numeric_value !== undefined) {
          const val = Number(a.numeric_value)
          const qType = a.question?.question_type
          const normVal = qType === 'rating_5' || qType === 'smiley_5' ? (val / 5) * 10 : val
          numericSum += normVal
          numericCount += 1

          if (qType === 'smiley_5') {
            smileyTotal += 1
            if (val >= 4) smileySatisfiedCount += 1
          }
        }
      }
    }

    const avgScore = numericCount > 0 ? Number((numericSum / numericCount).toFixed(1)) : null
    const satisfactionRate =
      smileyTotal > 0 ? Math.round((smileySatisfiedCount / smileyTotal) * 100) : null

    return {
      avgScore,
      satisfactionRate,
      total: responses.length,
    }
  }, [responses])

  // Handlers de exportação
  const handleExportXlsx = () => {
    if (!currentSurvey || responses.length === 0) {
      toast.error('Nenhuma resposta para exportar.')
      return
    }
    try {
      exportSurveyResponsesToXlsx(
        currentSurvey.title,
        currentSurvey.survey_type,
        questionsHierarchy,
        responses,
      )
      toast.success('Relatório Excel (XLSX) gerado com sucesso!')
    } catch (e: any) {
      console.error(e)
      toast.error('Erro ao gerar arquivo Excel.')
    }
  }

  const handleExportCSV = () => {
    if (!currentSurvey || responses.length === 0) {
      toast.error('Nenhuma resposta para exportar.')
      return
    }
    try {
      exportSurveyResponsesToCSV(
        currentSurvey.title,
        currentSurvey.survey_type,
        questionsHierarchy,
        responses,
      )
      toast.success('Relatório CSV exportado com sucesso!')
    } catch (e: any) {
      console.error(e)
      toast.error('Erro ao exportar CSV.')
    }
  }

  const handleExportPdf = () => {
    if (!currentSurvey || responses.length === 0) {
      toast.error('Nenhuma resposta para exportar em PDF.')
      return
    }
    try {
      const selectedPlant = plants.find((p) => p.id === plantId)
      const plantLabel =
        plantId === 'all'
          ? 'Todas as Plantas'
          : selectedPlant
            ? `${selectedPlant.name}${selectedPlant.code ? ` (${selectedPlant.code})` : ''}`
            : currentSurvey.plants?.name || 'Todas as Plantas'

      let periodLabel = 'Todo o histórico'
      if (startDate && endDate) {
        periodLabel = `${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} até ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
      } else if (startDate) {
        periodLabel = `A partir de ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
      } else if (endDate) {
        periodLabel = `Até ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
      }

      generateSurveyReportPdf({
        survey: currentSurvey,
        plantName: plantLabel,
        periodLabel,
        stats,
        hierarchy: questionsHierarchy,
        responses,
        clientName: activeClient?.name,
      })
      toast.success('Janela de impressão em PDF aberta!')
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Erro ao gerar PDF.')
    }
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
                Voltar para Lista de Pesquisas
              </Link>
            </Button>
            <span className="text-muted-foreground text-xs">•</span>
            <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs">
              <Link
                to={
                  surveyId
                    ? `/pesquisa-satisfacao/dashboard?surveyId=${surveyId}`
                    : '/pesquisa-satisfacao/dashboard'
                }
              >
                <BarChart3 className="h-3.5 w-3.5 mr-1 text-primary" />
                Ver no Dashboard
              </Link>
            </Button>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TableProperties className="h-6 w-6 text-brand-vividBlue" />
            Relatório Detalhado de Respostas por Pesquisa
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visualize todas as respostas registradas com data/horário, planta, ponto de coleta e
            hierarquia de perguntas e subperguntas condicionais.
          </p>
        </div>

        {/* Botões de Ação & Exportação */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadResponses}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={loading || responses.length === 0}
            className="gap-1.5 text-xs border-blue-200 text-brand-deepBlue hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            <Printer className="h-3.5 w-3.5 text-brand-vividBlue" />
            Exportar PDF
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                disabled={loading || responses.length === 0}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar Dados
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleExportPdf} className="cursor-pointer gap-2">
                <Printer className="h-4 w-4 text-brand-vividBlue" />
                <div>
                  <p className="font-semibold text-xs">Exportar Relatório em PDF</p>
                  <p className="text-[10px] text-muted-foreground">
                    Layout de impressão com KPIs e respostas
                  </p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportXlsx} className="cursor-pointer gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <div>
                  <p className="font-semibold text-xs">Exportar para Excel (.xlsx)</p>
                  <p className="text-[10px] text-muted-foreground">Com hierarquia e formatação</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="font-semibold text-xs">Exportar para CSV (.csv)</p>
                  <p className="text-[10px] text-muted-foreground">
                    Separado por ponto-e-vírgula (;)
                  </p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Barra de Seleção de Pesquisa e Filtros */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Filter className="h-3.5 w-3.5" />
              Seleção de Pesquisa & Filtros
            </div>

            {(plantId !== 'all' || startDate || endDate || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPlantId('all')
                  setStartDate('')
                  setEndDate('')
                  setSearchTerm('')
                }}
                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Seletor de Pesquisa */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold text-brand-deepBlue dark:text-blue-400 flex items-center gap-1">
                <Layers className="h-3 w-3" />
                Pesquisa a Consultar *
              </label>
              <Select value={surveyId} onValueChange={setSurveyId}>
                <SelectTrigger className="h-9 text-xs font-medium">
                  <SelectValue placeholder="Selecione uma pesquisa" />
                </SelectTrigger>
                <SelectContent>
                  {surveysList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title} ({s.survey_type}) {s.plants?.name ? `- ${s.plants.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Planta */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                Planta / Unidade
              </label>
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

            {/* Período Início */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Data Início</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Período Fim */}
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

          {/* Segunda linha: Busca por texto e alternância de visualização */}
          <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por comentário, local ou resposta..."
                className="pl-8 h-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
              <span className="text-muted-foreground text-[11px]">
                Modo de exibição das perguntas:
              </span>
              <div className="inline-flex rounded-lg border bg-slate-50 dark:bg-slate-900 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('condensed')}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    viewMode === 'condensed'
                      ? 'bg-white dark:bg-slate-800 font-semibold text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Resumido (Cards)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('expanded')}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    viewMode === 'expanded'
                      ? 'bg-white dark:bg-slate-800 font-semibold text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Tabela Completa (Colunas)
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cabeçalho da Pesquisa Ativa & KPI Cards Rápidos */}
      {currentSurvey && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 border rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-50 text-brand-deepBlue border-blue-200"
                >
                  {currentSurvey.survey_type}
                </Badge>
                {currentSurvey.is_active ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-200 text-xs">
                    Ativa
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Inativa
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground font-mono">
                  ID: #{currentSurvey.id.slice(0, 8)}
                </span>
              </div>
              <h2 className="text-lg font-bold text-foreground">{currentSurvey.title}</h2>
              {currentSurvey.description && (
                <p className="text-xs text-muted-foreground max-w-2xl">
                  {currentSurvey.description}
                </p>
              )}
            </div>

            {/* Mini KPIs */}
            <div className="flex items-center gap-4 shrink-0 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border">
              <div className="text-center px-2">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                  Respostas
                </span>
                <span className="text-xl font-extrabold text-foreground">{stats.total}</span>
              </div>

              {stats.satisfactionRate !== null && (
                <div className="text-center px-2 border-l border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium uppercase tracking-wider flex items-center justify-center gap-0.5">
                    <Smile className="h-3 w-3" /> Satisfação
                  </span>
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {stats.satisfactionRate}%
                  </span>
                </div>
              )}

              {stats.avgScore !== null && (
                <div className="text-center px-2 border-l border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider flex items-center justify-center gap-0.5">
                    <Star className="h-3 w-3 fill-amber-400" /> Nota Média
                  </span>
                  <span className="text-xl font-extrabold text-foreground">
                    {stats.avgScore.toFixed(1)}
                  </span>
                </div>
              )}

              <div className="text-center px-2 border-l border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                  Perguntas
                </span>
                <span className="text-xl font-extrabold text-foreground">
                  {questionsHierarchy.length}
                </span>
              </div>
            </div>
          </div>

          {/* Banner Explicativo da Hierarquia */}
          {questionsHierarchy.some((n) => n.level > 0) && (
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-start gap-2.5 text-xs text-blue-950 dark:text-blue-200">
              <GitBranch className="h-4 w-4 text-brand-vividBlue shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">
                  Esta pesquisa possui subperguntas condicionais:
                </span>
                <p className="text-[11px] text-blue-800 dark:text-blue-300 mt-0.5">
                  Perguntas marcadas com ↳ são exibidas somente quando o respondente seleciona a
                  condição estipulada na pergunta pai (ex: nota baixa ou motivo específico).
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TABELA DE RESPOSTAS */}
      <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-muted-foreground">
            <RefreshCw className="h-7 w-7 animate-spin mb-3 text-brand-vividBlue" />
            <span className="text-sm font-medium">Carregando relatório de respostas...</span>
            <span className="text-xs text-muted-foreground mt-0.5">
              Buscando detalhes completos de cada submissão
            </span>
          </div>
        ) : responses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-muted-foreground">
              <TableProperties className="h-6 w-6 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Nenhuma resposta encontrada</h3>
            <p className="text-xs text-muted-foreground max-w-md mt-1">
              {searchTerm || startDate || endDate || plantId !== 'all'
                ? 'Nenhuma resposta atende aos filtros de data, planta ou termo de busca selecionados. Experimente limpar os filtros.'
                : 'Esta pesquisa ainda não recebeu nenhuma submissão de resposta através dos tablets ou formulário público.'}
            </p>
            {currentSurvey && (
              <div className="flex items-center gap-2 mt-4">
                <Button size="sm" variant="outline" asChild className="gap-1.5 text-xs">
                  <Link to={`/p/${currentSurvey.id}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir Formulário Público
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === 'condensed' ? (
          /* MODO CONDENSADO: TABELA DE SUBMISSÕES COM EXPANSÃO RÁPIDA E RESUMO */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                <TableRow>
                  <TableHead className="w-[180px]">Data e Horário</TableHead>
                  <TableHead className="w-[200px]">Planta e Local</TableHead>
                  <TableHead>Resumo das Respostas</TableHead>
                  <TableHead className="text-center w-[120px]">Perguntas Respondidas</TableHead>
                  <TableHead className="text-right w-[110px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedResponses.map((resp, idx) => {
                  const dateObj = new Date(resp.submitted_at)
                  const dateFormatted = dateObj.toLocaleDateString('pt-BR')
                  const timeFormatted = dateObj.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                  const plantName =
                    resp.plant?.name || resp.survey?.plants?.name || 'Todas as Plantas'
                  const location = resp.location_name || resp.survey?.location_name || 'Geral'

                  // Mapa de respostas
                  const answerMap = new Map<string, SurveyResponseAnswer>()
                  for (const a of resp.answers || []) {
                    answerMap.set(a.question_id, a)
                  }

                  return (
                    <TableRow
                      key={resp.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                    >
                      {/* Data e Horário */}
                      <TableCell>
                        <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-brand-vividBlue" />
                          {dateFormatted}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {timeFormatted}
                        </div>
                      </TableCell>

                      {/* Planta e Local */}
                      <TableCell>
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {plantName}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          Local: {location}
                        </div>
                      </TableCell>

                      {/* Resumo das Respostas */}
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2 max-w-2xl py-1">
                          {questionsHierarchy.map((node) => {
                            const ans = answerMap.get(node.question.id || '')
                            if (!ans) return null
                            const formatted = formatAnswerValue(ans, node.question.question_type)
                            const isSub = node.level > 0

                            return (
                              <div
                                key={node.question.id}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${
                                  isSub
                                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60'
                                    : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                                }`}
                                title={`${node.question.title}: ${formatted.display}`}
                              >
                                {isSub && <GitBranch className="h-2.5 w-2.5 text-blue-600" />}
                                <span className="font-medium text-muted-foreground text-[10px] max-w-[120px] truncate">
                                  {node.question.title}:
                                </span>
                                <span className="font-bold text-foreground text-xs">
                                  {formatted.display}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </TableCell>

                      {/* Contagem de Perguntas Respondidas */}
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs font-mono">
                          {resp.answers?.length || 0} de {questionsHierarchy.length}
                        </Badge>
                      </TableCell>

                      {/* Ação: Ver Detalhes */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedResponse(resp)
                            setModalOpen(true)
                          }}
                          className="h-8 gap-1.5 text-xs text-brand-deepBlue hover:bg-blue-50 dark:hover:bg-blue-950"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* MODO EXPANDIDO: UMA COLUNA POR PERGUNTA / SUBPERGUNTA */
          <div className="overflow-x-auto">
            <Table className="min-w-max">
              <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                <TableRow>
                  <TableHead className="w-[160px] sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                    Data e Horário
                  </TableHead>
                  <TableHead className="w-[180px]">Planta e Local</TableHead>

                  {/* Colunas para cada pergunta e subpergunta hierárquica */}
                  {questionsHierarchy.map((node) => (
                    <TableHead
                      key={node.question.id}
                      className={`min-w-[220px] max-w-[280px] ${
                        node.level > 0 ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                      }`}
                    >
                      <div className="space-y-0.5">
                        {node.level > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                            <GitBranch className="h-2.5 w-2.5" />
                            <span>
                              Subpergunta {node.level > 1 ? `(Nível ${node.level + 1})` : ''}
                            </span>
                          </div>
                        )}
                        <span
                          className="font-semibold text-xs text-foreground line-clamp-2"
                          title={node.question.title}
                        >
                          {node.level > 0 ? `↳ ${node.question.title}` : node.question.title}
                        </span>
                        {node.parentQuestion && (
                          <span className="text-[10px] text-muted-foreground block truncate">
                            de: "{node.parentQuestion.title}"
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}

                  <TableHead className="text-right w-[90px] sticky right-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-[-1px_0_0_0_#e2e8f0]">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedResponses.map((resp) => {
                  const dateObj = new Date(resp.submitted_at)
                  const dateFormatted = dateObj.toLocaleDateString('pt-BR')
                  const timeFormatted = dateObj.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                  const plantName =
                    resp.plant?.name || resp.survey?.plants?.name || 'Todas as Plantas'
                  const location = resp.location_name || resp.survey?.location_name || 'Geral'

                  const answerMap = new Map<string, SurveyResponseAnswer>()
                  for (const a of resp.answers || []) {
                    answerMap.set(a.question_id, a)
                  }

                  return (
                    <TableRow
                      key={resp.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                    >
                      {/* Data / Hora Sticky */}
                      <TableCell className="sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                        <div className="font-semibold text-xs text-foreground">{dateFormatted}</div>
                        <div className="text-[11px] text-muted-foreground">{timeFormatted}</div>
                      </TableCell>

                      {/* Planta e Local */}
                      <TableCell>
                        <div className="text-xs font-semibold text-foreground truncate">
                          {plantName}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{location}</div>
                      </TableCell>

                      {/* Cada pergunta */}
                      {questionsHierarchy.map((node) => {
                        const ans = answerMap.get(node.question.id || '')
                        const formatted = formatAnswerValue(ans, node.question.question_type)
                        const isAnswered = Boolean(ans)

                        return (
                          <TableCell
                            key={node.question.id}
                            className={node.level > 0 ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''}
                          >
                            {isAnswered ? (
                              <div className="text-xs font-medium text-foreground">
                                {formatted.display}
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">
                                — (não acionada)
                              </span>
                            )}
                          </TableCell>
                        )
                      })}

                      {/* Ação Sticky */}
                      <TableCell className="text-right sticky right-0 bg-white dark:bg-slate-900 z-10 shadow-[-1px_0_0_0_#e2e8f0]">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedResponse(resp)
                            setModalOpen(true)
                          }}
                          className="h-8 w-8 text-brand-deepBlue"
                          title="Ver detalhes da resposta"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Rodapé de Paginação */}
        {responses.length > 0 && (
          <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              Exibindo{' '}
              <strong className="text-foreground">{(currentPage - 1) * pageSize + 1}</strong> a{' '}
              <strong className="text-foreground">
                {Math.min(currentPage * pageSize, totalResponsesCount)}
              </strong>{' '}
              de <strong className="text-foreground">{totalResponsesCount}</strong> respostas
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-2">
                <span>Itens por página:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-7 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="h-7 px-2 text-xs"
              >
                Anterior
              </Button>
              <span className="font-semibold text-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-7 px-2 text-xs"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes Individuais da Resposta */}
      <SurveyResponseDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        response={selectedResponse}
        hierarchy={questionsHierarchy}
      />
    </div>
  )
}

export default RelatorioRespostasPesquisa
