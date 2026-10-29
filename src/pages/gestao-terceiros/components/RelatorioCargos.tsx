import React, { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  TrendingDown,
  Clock,
  Users,
  ChevronDown,
  ChevronRight,
  UserPlus,
  UserMinus,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { cn } from '@/lib/utils'
import { useCargoCalculations, CargoSummary, CargoMonthPoint } from '../hooks/useCargoCalculations'

interface RelatorioCargosProps {
  employees: any[]
  contracted: any[]
  functions: any[]
  plants: any[]
  companies: any[]
  selectedPlants: string[]
  selectedCompanies?: string[]
  onCompanyChange?: (c: string, checked: boolean) => void
  onClearCompanies?: () => void
  dateFrom: string
  dateTo: string
  onDateFromChange: (val: string) => void
  onDateToChange: (val: string) => void
}

export default function RelatorioCargos({
  employees,
  contracted,
  functions,
  plants,
  companies,
  selectedPlants,
  selectedCompanies = [],
  onCompanyChange,
  onClearCompanies,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: RelatorioCargosProps) {
  const [selectedFunctionId, setSelectedFunctionId] = useState<string>('all')
  const [expandedCargoId, setExpandedCargoId] = useState<string | null>(null)
  const [showCharts, setShowCharts] = useState<boolean>(true)
  const [filterOnlyBelow, setFilterOnlyBelow] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')

  const { cargos, totals, monthsList } = useCargoCalculations({
    employees,
    contracted,
    functions,
    plants,
    companies,
    selectedPlants,
    selectedFunctionId,
    selectedCompanies,
    dateFrom,
    dateTo,
  })

  // Filtra por busca e flag de apenas abaixo
  const displayedCargos = useMemo(() => {
    return cargos.filter((c) => {
      if (filterOnlyBelow && !c.isCurrentlyAbaixo && c.mesesAbaixoCount === 0) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return c.functionName.toLowerCase().includes(q)
      }
      return true
    })
  }, [cargos, filterOnlyBelow, searchQuery])

  // Cargo selecionado para visualização no gráfico
  const selectedCargoForChart: CargoSummary | undefined = useMemo(() => {
    if (expandedCargoId) {
      return cargos.find((c) => c.functionId === expandedCargoId)
    }
    return displayedCargos[0] || cargos[0]
  }, [expandedCargoId, displayedCargos, cargos])

  const toggleExpand = (fId: string) => {
    setExpandedCargoId((prev) => (prev === fId ? null : fId))
  }

  // Lista de cargos disponíveis para o Select (quando nenhuma empresa está filtrada, mostra todos com dados;
  // se empresa estiver filtrada, mostra somente os cargos vinculados)
  const availableFunctions = useMemo(() => {
    // Se cargos foram computados, usamos as funções correspondentes para o select não exibir cargos órfãos
    const functionIdsWithData = new Set(cargos.map((c) => c.functionId))
    return functions.filter((f) => functionIdsWithData.has(f.id))
  }, [cargos, functions])

  // Prepara dados para o gráfico comparativo
  const chartData = useMemo(() => {
    if (!selectedCargoForChart) return []
    return selectedCargoForChart.series.map((pt) => ({
      mes: pt.monthLabel,
      efetivo: pt.efetivo,
      ideal: pt.quadroIdeal,
      deficit: pt.deficit,
      admissoes: pt.admissoes,
      desligamentos: pt.desligamentos,
      tempoReposicao: pt.tempoMedioReposicaoDias || 0,
    }))
  }, [selectedCargoForChart])

  return (
    <div className="space-y-6">
      {/* 1. RESUMO NO TOPO - CARDS DE INDICADORES EXECUTIVOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Cargos Abaixo do Quadro */}
        <Card className="border-red-200 bg-gradient-to-br from-red-50/70 to-white shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-red-900">
              Cargos Abaixo do Quadro
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-red-900">
                {totals.cargosAbaixoAtualmente}
              </span>
              <span className="text-xs text-red-700 font-medium">
                de {totals.totalCargosAnalisados} cargos
              </span>
            </div>
            <p className="text-xs text-red-600 mt-1">
              {totals.totalDeficitAtual > 0
                ? `Déficit total atual de ${totals.totalDeficitAtual} vaga(s) em aberto`
                : 'Nenhum déficit de quadro ativo'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Maior Tempo Médio de Reposição */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50/70 to-white shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-900">
              Maior Tempo de Reposição
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-900">
                {totals.maiorTempoMedioReposicao ? `${totals.maiorTempoMedioReposicao.dias}d` : '—'}
              </span>
              <span className="text-xs text-amber-700 font-medium truncate max-w-[150px]">
                {totals.maiorTempoMedioReposicao
                  ? totals.maiorTempoMedioReposicao.cargo
                  : 'Sem reposições registradas'}
              </span>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              Tempo decorrido entre desligamento e nova admissão
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Tempo Médio Geral */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50/70 to-white shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-blue-900">
              Média Geral de Reposição
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-blue-900">
                {totals.tempoMedioReposicaoGeral !== null
                  ? `${totals.tempoMedioReposicaoGeral} dias`
                  : '—'}
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Média ponderada entre todos os cargos no período
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Turnover / Movimentações no Período */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Movimentações no Período
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-emerald-700">
                <UserPlus className="h-4 w-4" />
                <span className="text-2xl font-bold">{totals.totalAdmissoesPeriodo}</span>
                <span className="text-xs font-medium">admissões</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5 text-rose-700">
                <UserMinus className="h-4 w-4" />
                <span className="text-2xl font-bold">{totals.totalDesligamentosPeriodo}</span>
                <span className="text-xs font-medium">saídas</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Histórico rastreado nos {monthsList.length} meses analisados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. FILTROS ESPECÍFICOS DA ABA POR CARGO */}
      <Card className="shadow-sm border-gray-100 print:hidden">
        <CardContent className="p-5 space-y-4 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Filtro Período Início */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 uppercase font-bold tracking-wider">
                De (Mês/Ano)
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="h-10 border-slate-200"
              />
            </div>

            {/* Filtro Período Fim */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 uppercase font-bold tracking-wider">
                Até (Mês/Ano)
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="h-10 border-slate-200"
              />
            </div>

            {/* Filtro Cargo */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 uppercase font-bold tracking-wider">
                Cargo
              </Label>
              <Select
                value={
                  selectedFunctionId !== 'all' &&
                  !availableFunctions.some((f) => f.id === selectedFunctionId)
                    ? 'all'
                    : selectedFunctionId
                }
                onValueChange={setSelectedFunctionId}
              >
                <SelectTrigger className="h-10 border-slate-200">
                  <SelectValue placeholder="Todos os Cargos" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">
                    Todos os Cargos (
                    {availableFunctions.length > 0 ? availableFunctions.length : functions.length})
                  </SelectItem>
                  {(availableFunctions.length > 0 ? availableFunctions : functions).map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Empresa */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700 uppercase font-bold tracking-wider">
                Empresa Parceira
              </Label>
              <Select
                value={
                  selectedCompanies.length === 1
                    ? selectedCompanies[0]
                    : selectedCompanies.length === 0
                      ? 'all'
                      : 'multiple'
                }
                onValueChange={(val) => {
                  if (val === 'all') {
                    if (onClearCompanies) onClearCompanies()
                  } else if (onCompanyChange) {
                    // Seleciona exclusivamente essa empresa
                    if (onClearCompanies) onClearCompanies()
                    onCompanyChange(val, true)
                  }
                }}
              >
                <SelectTrigger className="h-10 border-slate-200">
                  <SelectValue placeholder="Todas as Empresas">
                    {selectedCompanies.length === 0
                      ? 'Todas as Empresas'
                      : selectedCompanies.length === 1
                        ? selectedCompanies[0]
                        : `${selectedCompanies.length} empresas selecionadas`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Empresas</SelectItem>
                  {selectedCompanies.length > 1 && (
                    <SelectItem value="multiple" disabled>
                      {selectedCompanies.length} selecionadas no painel
                    </SelectItem>
                  )}
                  {companies.map((c) => (
                    <SelectItem key={c.id || c.name} value={c.name || c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Buscar cargo na lista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[240px] h-9 text-xs border-slate-200"
              />
              <Button
                variant={filterOnlyBelow ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterOnlyBelow(!filterOnlyBelow)}
                className={cn(
                  'h-9 text-xs',
                  filterOnlyBelow
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'text-slate-700 border-slate-300',
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                {filterOnlyBelow ? 'Mostrando apenas com déficit' : 'Filtrar apenas com déficit'}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCharts(!showCharts)}
                className="h-9 text-xs text-slate-600 hover:text-slate-900"
              >
                <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                {showCharts ? 'Ocultar Gráfico' : 'Ver Gráfico Detalhado'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. GRÁFICO HISTÓRICO COMPARATIVO POR CARGO */}
      {showCharts && selectedCargoForChart && (
        <Card className="shadow-sm border-gray-100 overflow-hidden print:break-inside-avoid">
          <CardHeader className="bg-slate-50/60 pb-3 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-brand-deepBlue" />
                  Evolução Mensal: {selectedCargoForChart.functionName}
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparação do Efetivo Ativo vs. Quadro Ideal e dias médios para reposição
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedCargoForChart.isCurrentlyAbaixo && (
                  <Badge variant="destructive" className="text-xs">
                    Déficit atual de {selectedCargoForChart.currentDeficit} vaga(s)
                  </Badge>
                )}
                {selectedCargoForChart.mediaTempoReposicaoDias !== null && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-amber-50 text-amber-800 border-amber-200"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Tempo médio: {selectedCargoForChart.mediaTempoReposicaoDias} dias
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes" stroke="#64748b" fontSize={11} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#f59e0b"
                    fontSize={11}
                    unit="d"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'Efetivo Ativo') return [value, 'Efetivo Ativo']
                      if (name === 'Quadro Ideal') return [value, 'Quadro Ideal']
                      if (name === 'Déficit (Abaixo)') return [value, 'Déficit']
                      if (name === 'Tempo de Reposição')
                        return [value > 0 ? `${value} dias` : 'Sem eventos', 'Tempo Reposição']
                      return [value, name]
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar
                    yAxisId="left"
                    dataKey="efetivo"
                    name="Efetivo Ativo"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="ideal"
                    name="Quadro Ideal"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="deficit"
                    name="Déficit (Abaixo)"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="tempoReposicao"
                    name="Tempo de Reposição"
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. TABELA PRINCIPAL POR CARGO COM SÉRIES EXPANSÍVEIS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none">
        <div className="p-4 bg-slate-50/80 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Relatório Consolidado de Cargos, Efetivo e Reposição
            </h3>
            <p className="text-xs text-slate-500">
              Clique em uma linha para abrir a série histórica mensal completa do cargo
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Total de {displayedCargos.length} cargo(s) listado(s)
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="print:border-collapse print:w-full">
            <TableHeader className="bg-slate-50/90 border-b border-gray-200 print:bg-transparent">
              <TableRow>
                <TableHead className="w-8 print:hidden" />
                <TableHead className="font-semibold text-slate-800 h-12">Cargo</TableHead>
                <TableHead className="font-semibold text-slate-800 text-center">
                  Efetivo Atual
                </TableHead>
                <TableHead className="font-semibold text-slate-800 text-center">
                  Quadro Ideal
                </TableHead>
                <TableHead className="font-semibold text-slate-800 text-center">
                  Déficit Atual
                </TableHead>
                <TableHead className="font-semibold text-slate-800 text-center">
                  Meses Abaixo
                </TableHead>
                <TableHead className="font-semibold text-slate-800 text-center">
                  Admissões Período
                </TableHead>
                <TableHead className="font-semibold text-slate-800 text-center">
                  Desligamentos
                </TableHead>
                <TableHead className="font-semibold text-slate-800 text-center">
                  Tempo Médio Reposição
                </TableHead>
                <TableHead className="font-semibold text-slate-800 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedCargos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                    Nenhum cargo encontrado para os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                displayedCargos.map((cargo) => {
                  const isExpanded = expandedCargoId === cargo.functionId
                  const isAbaixo = cargo.isCurrentlyAbaixo

                  return (
                    <React.Fragment key={cargo.functionId}>
                      <TableRow
                        onClick={() => toggleExpand(cargo.functionId)}
                        className={cn(
                          'cursor-pointer transition-colors border-b border-gray-100',
                          isExpanded ? 'bg-slate-50 font-medium' : 'hover:bg-slate-50/60',
                          isAbaixo && !isExpanded ? 'bg-red-50/20' : '',
                        )}
                      >
                        <TableCell className="w-8 py-3 text-slate-400 print:hidden">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-brand-deepBlue" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 py-3">
                          <div className="flex items-center gap-2">
                            <span>{cargo.functionName}</span>
                            {cargo.currentQuadroIdeal === 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-slate-500 font-normal px-1 py-0"
                              >
                                Sem quadro ideal
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-800 py-3">
                          {cargo.currentEfetivo}
                        </TableCell>
                        <TableCell className="text-center text-slate-700 py-3">
                          {cargo.currentQuadroIdeal > 0 ? cargo.currentQuadroIdeal : '—'}
                        </TableCell>
                        <TableCell className="text-center py-3">
                          {cargo.currentDeficit > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                              -{cargo.currentDeficit}
                            </span>
                          ) : (
                            <span className="text-emerald-700 text-xs font-semibold">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-3">
                          <span
                            className={cn(
                              'text-xs font-semibold px-2 py-0.5 rounded',
                              cargo.mesesAbaixoCount > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'text-slate-600',
                            )}
                          >
                            {cargo.mesesAbaixoCount} de {cargo.totalMesesAnalisados} (
                            {cargo.taxaDeficitMeses}%)
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-3 text-emerald-700 font-semibold">
                          +{cargo.totalAdmissoesPeriodo}
                        </TableCell>
                        <TableCell className="text-center py-3 text-rose-700 font-semibold">
                          -{cargo.totalDesligamentosPeriodo}
                        </TableCell>
                        <TableCell className="text-center py-3">
                          {cargo.mediaTempoReposicaoDias !== null ? (
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold',
                                cargo.mediaTempoReposicaoDias > 30
                                  ? 'bg-rose-100 text-rose-800'
                                  : cargo.mediaTempoReposicaoDias > 15
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800',
                              )}
                            >
                              <Clock className="h-3 w-3" />
                              {cargo.mediaTempoReposicaoDias} dias
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-3">
                          {isAbaixo ? (
                            <Badge variant="destructive" className="text-xs">
                              Abaixo
                            </Badge>
                          ) : cargo.currentQuadroIdeal > 0 ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white">
                              Conforme
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs text-slate-600">
                              Não definido
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* DETALHAMENTO MENSAL EXPANDIDO */}
                      {isExpanded && (
                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                          <TableCell colSpan={10} className="p-4 sm:p-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                  <Calendar className="h-4 w-4 text-brand-deepBlue" />
                                  Série Mensal Detalhada: {cargo.functionName}
                                </h4>
                                <span className="text-xs text-slate-500">
                                  Destaques em vermelho/âmbar indicam meses em que o cargo ficou
                                  abaixo do ideal
                                </span>
                              </div>

                              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                <Table>
                                  <TableHeader className="bg-slate-100/70">
                                    <TableRow>
                                      <TableHead className="font-semibold text-slate-700 text-xs">
                                        Mês
                                      </TableHead>
                                      <TableHead className="font-semibold text-slate-700 text-center text-xs">
                                        Efetivo Ativo
                                      </TableHead>
                                      <TableHead className="font-semibold text-slate-700 text-center text-xs">
                                        Quadro Ideal
                                      </TableHead>
                                      <TableHead className="font-semibold text-slate-700 text-center text-xs">
                                        Déficit
                                      </TableHead>
                                      <TableHead className="font-semibold text-slate-700 text-center text-xs">
                                        Admissões
                                      </TableHead>
                                      <TableHead className="font-semibold text-slate-700 text-center text-xs">
                                        Desligamentos
                                      </TableHead>
                                      <TableHead className="font-semibold text-slate-700 text-center text-xs">
                                        Tempo Reposição
                                      </TableHead>
                                      <TableHead className="font-semibold text-slate-700 text-center text-xs">
                                        Situação
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {cargo.series.map((month) => (
                                      <TableRow
                                        key={month.monthKey}
                                        className={cn(
                                          'border-b border-slate-100 text-xs',
                                          month.isAbaixoDoQuadro ? 'bg-red-50/40' : '',
                                        )}
                                      >
                                        <TableCell className="font-bold text-slate-800 uppercase">
                                          {month.monthLabel}
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-slate-800">
                                          {month.efetivo}
                                        </TableCell>
                                        <TableCell className="text-center text-slate-700">
                                          {month.quadroIdeal > 0 ? month.quadroIdeal : '—'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          {month.deficit > 0 ? (
                                            <span className="font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                              -{month.deficit}
                                            </span>
                                          ) : (
                                            <span className="text-emerald-700 font-semibold">
                                              0
                                            </span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-center font-semibold text-emerald-700">
                                          {month.admissoes > 0 ? `+${month.admissoes}` : '0'}
                                        </TableCell>
                                        <TableCell className="text-center font-semibold text-rose-700">
                                          {month.desligamentos > 0
                                            ? `-${month.desligamentos}`
                                            : '0'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          {month.tempoMedioReposicaoDias !== null ? (
                                            <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                                              <Clock className="h-3 w-3" />
                                              {month.tempoMedioReposicaoDias} dias
                                            </span>
                                          ) : (
                                            <span className="text-slate-400">—</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                          {month.isAbaixoDoQuadro ? (
                                            <Badge variant="destructive" className="text-[10px]">
                                              Abaixo do Quadro
                                            </Badge>
                                          ) : month.quadroIdeal > 0 ? (
                                            <Badge className="bg-emerald-600 text-white text-[10px]">
                                              Conforme
                                            </Badge>
                                          ) : (
                                            <span className="text-slate-400 text-[10px]">
                                              Sem ideal
                                            </span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
