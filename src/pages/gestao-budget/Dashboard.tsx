import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDashboardBudget } from '@/hooks/use-dashboard-budget'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Filter,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function DashboardBudget() {
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [selectedCostCenters, setSelectedCostCenters] = useState<string[]>([])

  const { data, costCenters, availableMonths, loading } = useDashboardBudget(
    selectedMonths,
    selectedCostCenters,
  )

  const toggleMonth = (month: string) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month],
    )
  }

  const toggleCostCenter = (ccId: string) => {
    setSelectedCostCenters((prev) =>
      prev.includes(ccId) ? prev.filter((id) => id !== ccId) : [...prev, ccId],
    )
  }

  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatPct = (val: number) => `${val.toFixed(1)}%`

  const formatMonth = (monthStr: string) => {
    try {
      return format(parseISO(monthStr), 'MMM/yyyy', { locale: ptBR })
    } catch {
      return monthStr
    }
  }

  const chartConfig = {
    budgeted: {
      label: 'Orçado',
      color: '#1d848a',
    },
    realized: {
      label: 'Realizado',
      color: '#6e932b',
    },
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-6 w-48 mb-4 mt-6" />
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-[400px] col-span-1 rounded-xl" />
          <Skeleton className="h-[400px] col-span-2 rounded-xl" />
        </div>
      </div>
    )
  }

  const variance = data ? data.totalBudgeted - data.totalRealized : 0
  const pctUsed = data?.totalBudgeted ? (data.totalRealized / data.totalBudgeted) * 100 : 0

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Dashboard de Budget</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhamento financeiro: Orçado vs Realizado.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[180px] justify-between bg-white">
                <span className="truncate">
                  {selectedMonths.length === 0
                    ? 'Todos os Meses'
                    : `${selectedMonths.length} selecionado(s)`}
                </span>
                <Filter className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>Filtrar por Mês</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableMonths.map((month) => (
                <DropdownMenuCheckboxItem
                  key={month}
                  checked={selectedMonths.includes(month)}
                  onCheckedChange={() => toggleMonth(month)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {formatMonth(month)}
                </DropdownMenuCheckboxItem>
              ))}
              {availableMonths.length === 0 && (
                <div className="p-2 text-sm text-muted-foreground text-center">Nenhum mês</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[200px] justify-between bg-white">
                <span className="truncate">
                  {selectedCostCenters.length === 0
                    ? 'Todos os Centros'
                    : `${selectedCostCenters.length} selecionado(s)`}
                </span>
                <Filter className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>Centros de Custo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                {costCenters.map((cc) => (
                  <DropdownMenuCheckboxItem
                    key={cc.id}
                    checked={selectedCostCenters.includes(cc.id)}
                    onCheckedChange={() => toggleCostCenter(cc.id)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {cc.name}
                  </DropdownMenuCheckboxItem>
                ))}
                {costCenters.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Nenhum centro de custo
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!data ? (
        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground bg-white rounded-xl border border-dashed">
          <AlertCircle className="h-10 w-10 mb-4 opacity-50" />
          <p className="text-lg font-medium text-center px-4">
            Nenhum dado encontrado para os filtros selecionados
          </p>
          <p className="text-sm mt-2">Tente alterar os meses ou centros de custo.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* AI Insights */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-primary">
              <Sparkles className="h-5 w-5 text-blue-600" />{' '}
              <span className="text-blue-600">Aurea AI Insights</span>
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-l-4 border-l-red-500 shadow-sm rounded-r-xl">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-semibold text-red-600 flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" /> Atenção Crítica: Orçamento Estourado
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">
                    O centro de custo {data.insights.critical.cc} excedeu o orçamento em{' '}
                    {data.insights.critical.pct}%. A conta "{data.insights.critical.account}" é a
                    que mais gastou.
                  </p>
                  <Button variant="outline" size="sm" className="text-xs h-8">
                    Revisar Lançamentos <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500 shadow-sm rounded-r-xl">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-semibold text-amber-600 flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" /> Alerta de Consumo Elevado
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">
                    O centro de custo {data.insights.warning.cc} já consumiu{' '}
                    {data.insights.warning.pct}% do orçamento planejado para este mês. Fique atento.
                  </p>
                  <Button variant="outline" size="sm" className="text-xs h-8">
                    Ajustar Orçamento <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-purple-500 shadow-sm rounded-r-xl">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-semibold text-purple-600 flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4" /> Aurea AI Forecast (Mês Seguinte)
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">
                    Projeção de gastos para o próximo mês: {formatBRL(data.insights.forecast)}.
                    Baseado no KPI Orçado x Realizado atual.
                  </p>
                  <Button variant="outline" size="sm" className="text-xs h-8">
                    Planejar Próximo Mês <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card className="shadow-sm border-blue-100 bg-blue-50/10">
              <CardContent className="pt-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm font-semibold text-blue-600">Total Orçado</p>
                  <div className="p-1.5 bg-blue-100 rounded-md">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {formatBRL(data.totalBudgeted)}
                </h3>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-amber-100 bg-amber-50/10">
              <CardContent className="pt-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm font-semibold text-amber-600">Total Realizado</p>
                  <div className="p-1.5 bg-amber-100 rounded-md">
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {formatBRL(data.totalRealized)}
                </h3>
              </CardContent>
            </Card>
            <Card
              className={`shadow-sm ${variance < 0 ? 'border-red-100 bg-red-50/20' : 'border-emerald-100 bg-emerald-50/10'}`}
            >
              <CardContent className="pt-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                  <p
                    className={`text-sm font-semibold ${variance < 0 ? 'text-red-600' : 'text-emerald-600'}`}
                  >
                    Diferença (Saldo)
                  </p>
                  <div
                    className={`p-1.5 rounded-md ${variance < 0 ? 'bg-red-100' : 'bg-emerald-100'}`}
                  >
                    <AlertTriangle
                      className={`h-4 w-4 ${variance < 0 ? 'text-red-600' : 'text-emerald-600'}`}
                    />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {variance < 0 && '- '}
                  {formatBRL(Math.abs(variance))}
                </h3>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm font-semibold text-slate-600">% do Budget Utilizado</p>
                </div>
                <div>
                  <h3
                    className={`text-2xl font-bold mb-3 ${pctUsed > 100 ? 'text-red-600' : 'text-slate-800'}`}
                  >
                    {formatPct(pctUsed)}
                  </h3>
                  <div className="h-2.5 w-full bg-secondary overflow-hidden rounded-full">
                    <div
                      className={`h-full ${pctUsed > 100 ? 'bg-red-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min(pctUsed, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="col-span-1 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Consolidado Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: 'Total',
                          budgeted: data.totalBudgeted,
                          realized: data.totalRealized,
                        },
                      ]}
                      margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b' }}
                      />
                      <YAxis
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b' }}
                      />
                      <ChartTooltip
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        content={
                          <ChartTooltipContent
                            formatter={(value: any) => formatBRL(Number(value))}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} className="mt-4" />
                      <Bar
                        dataKey="budgeted"
                        fill="var(--color-budgeted)"
                        radius={[2, 2, 0, 0]}
                        maxBarSize={80}
                      />
                      <Bar
                        dataKey="realized"
                        fill="var(--color-realized)"
                        radius={[2, 2, 0, 0]}
                        maxBarSize={80}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="col-span-1 md:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Orçado vs Realizado por Centro de Custo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.costCenterData.slice(0, 8)}
                      margin={{ top: 20, right: 0, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                      />
                      <YAxis
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b' }}
                      />
                      <ChartTooltip
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        content={
                          <ChartTooltipContent
                            formatter={(value: any) => formatBRL(Number(value))}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} className="mt-4" />
                      <Bar
                        dataKey="budgeted"
                        fill="var(--color-budgeted)"
                        radius={[2, 2, 0, 0]}
                        maxBarSize={40}
                      />
                      <Bar
                        dataKey="realized"
                        fill="var(--color-realized)"
                        radius={[2, 2, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
