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
  LineChart,
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
      color: 'hsl(var(--chart-1))',
    },
    realized: {
      label: 'Realizado',
      color: 'hsl(var(--chart-2))',
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

  const totalForecast = data?.totalForecast ?? 0
  const variance = data ? data.totalBudgeted - data.totalRealized : 0
  const forecastVariance = data ? totalForecast - data.totalRealized : 0
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
              <Button variant="outline" className="w-full sm:w-[180px] justify-between font-medium">
                <span className="truncate">
                  {selectedMonths.length === 0
                    ? 'Todos os Meses'
                    : `${selectedMonths.length} selecionado(s)`}
                </span>
                <Filter className="ml-2 h-4 w-4 opacity-70" />
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
              <Button variant="outline" className="w-full sm:w-[200px] justify-between font-medium">
                <span className="truncate">
                  {selectedCostCenters.length === 0
                    ? 'Todos os Centros'
                    : `${selectedCostCenters.length} selecionado(s)`}
                </span>
                <Filter className="ml-2 h-4 w-4 opacity-70" />
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
        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground bg-card rounded-xl border border-dashed">
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
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />{' '}
              <span className="text-blue-600 dark:text-blue-400">Aurea AI Insights</span>
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {data.insights.critical ? (
                <Card className="border-l-4 border-l-red-500 shadow-sm rounded-r-xl bg-card">
                  <CardContent className="pt-6">
                    <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4" /> Atenção Crítica: Orçamento Estourado
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">
                      O centro de custo {data.insights.critical.cc} excedeu o orçamento em{' '}
                      {data.insights.critical.pct}%. A conta "{data.insights.critical.account}" é a
                      que mais gastou.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 hover:bg-accent hover:text-accent-foreground border-border"
                    >
                      Revisar Lançamentos <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-l-4 border-l-emerald-500 shadow-sm rounded-r-xl bg-card">
                  <CardContent className="pt-6">
                    <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4" /> Orçamento Saudável
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">
                      Nenhum centro de custo estourou o orçamento planejado. Excelente trabalho de
                      gestão!
                    </p>
                  </CardContent>
                </Card>
              )}
              {data.insights.warning ? (
                <Card className="border-l-4 border-l-amber-500 shadow-sm rounded-r-xl bg-card">
                  <CardContent className="pt-6">
                    <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4" /> Alerta de Consumo Elevado
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">
                      O centro de custo {data.insights.warning.cc} já consumiu{' '}
                      {data.insights.warning.pct}% do orçamento planejado para este mês. Fique
                      atento.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 hover:bg-accent hover:text-accent-foreground border-border"
                    >
                      Ajustar Orçamento <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-l-4 border-l-emerald-500 shadow-sm rounded-r-xl bg-card">
                  <CardContent className="pt-6">
                    <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4" /> Alertas Limpos
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">
                      Não há centros de custo em zona de risco (acima de 90%) no momento.
                    </p>
                  </CardContent>
                </Card>
              )}
              <Card className="border-l-4 border-l-purple-500 shadow-sm rounded-r-xl bg-card">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4" /> Aurea AI Forecast (Mês Seguinte)
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">
                    Valor de forecast cadastrado: {formatBRL(data.insights.forecast)}. Baseado nos
                    lançamentos de forecast do período selecionado.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 hover:bg-accent hover:text-accent-foreground border-border"
                  >
                    Planejar Próximo Mês <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card className="shadow-sm border-blue-200/50 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10">
              <CardContent className="pt-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    Total Orçado
                  </p>
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-md">
                    <DollarSign className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  {formatBRL(data.totalBudgeted)}
                </h3>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-amber-200/50 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10">
              <CardContent className="pt-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-500">
                    Total Realizado
                  </p>
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-md">
                    <TrendingUp className="h-4 w-4 text-amber-700 dark:text-amber-500" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  {formatBRL(data.totalRealized)}
                </h3>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-purple-200/50 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-900/10">
              <CardContent className="pt-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                    Total Forecast
                  </p>
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-md">
                    <LineChart className="h-4 w-4 text-purple-700 dark:text-purple-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground">{formatBRL(totalForecast)}</h3>
              </CardContent>
            </Card>
            <Card
              className={`shadow-sm ${variance < 0 ? 'border-red-200/50 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10' : 'border-emerald-200/50 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/10'}`}
            >
              <CardContent className="pt-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                  <p
                    className={`text-sm font-semibold ${variance < 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}
                  >
                    Saldo (Orçado − Realizado)
                  </p>
                  <div
                    className={`p-1.5 rounded-md ${variance < 0 ? 'bg-red-100 dark:bg-red-900/50' : 'bg-emerald-100 dark:bg-emerald-900/50'}`}
                  >
                    <AlertTriangle
                      className={`h-4 w-4 ${variance < 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}
                    />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  {variance < 0 && '- '}
                  {formatBRL(Math.abs(variance))}
                </h3>
              </CardContent>
            </Card>
            <Card
              className={`shadow-sm ${forecastVariance < 0 ? 'border-red-200/50 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10' : 'border-emerald-200/50 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/10'}`}
            >
              <CardContent className="pt-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                  <p
                    className={`text-sm font-semibold ${forecastVariance < 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}
                  >
                    Saldo (Forecast − Realizado)
                  </p>
                  <div
                    className={`p-1.5 rounded-md ${forecastVariance < 0 ? 'bg-red-100 dark:bg-red-900/50' : 'bg-emerald-100 dark:bg-emerald-900/50'}`}
                  >
                    <AlertTriangle
                      className={`h-4 w-4 ${forecastVariance < 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}
                    />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  {forecastVariance < 0 && '- '}
                  {formatBRL(Math.abs(forecastVariance))}
                </h3>
              </CardContent>
            </Card>
            <Card className="shadow-sm bg-card">
              <CardContent className="pt-6 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm font-semibold text-muted-foreground">
                    % do Budget Utilizado
                  </p>
                </div>
                <div>
                  <h3
                    className={`text-2xl font-bold mb-3 ${pctUsed > 100 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}
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
                        tick={{ fill: 'currentColor' }}
                        className="text-muted-foreground text-xs"
                      />
                      <YAxis
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'currentColor' }}
                        className="text-muted-foreground text-xs"
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
                        tick={{ fontSize: 12, fill: 'currentColor' }}
                        className="text-muted-foreground text-xs"
                      />
                      <YAxis
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'currentColor' }}
                        className="text-muted-foreground text-xs"
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
