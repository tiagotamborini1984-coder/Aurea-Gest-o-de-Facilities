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
import { Filter, Loader2, DollarSign, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react'
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
      color: '#1f2937',
    },
    realized: {
      label: 'Realizado',
      color: '#1e3a8a',
    },
  }

  const variance = data ? data.totalBudgeted - data.totalRealized : 0
  const variancePercentage = data?.totalBudgeted
    ? ((data.totalRealized / data.totalBudgeted) * 100).toFixed(1)
    : 0

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Budget</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[180px] justify-between">
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
              <Button variant="outline" className="w-full sm:w-[200px] justify-between">
                <span className="truncate">
                  {selectedCostCenters.length === 0
                    ? 'Todos Centros de Custo'
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

      {loading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
          <AlertCircle className="h-10 w-10 mb-4 opacity-50" />
          <p className="text-lg font-medium text-center px-4">
            Nenhum dado encontrado para os filtros selecionados
          </p>
          <p className="text-sm mt-2">Tente alterar os meses ou centros de custo.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orçado</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBRL(data.totalBudgeted)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Realizado</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBRL(data.totalRealized)}</div>
                <p className="text-xs text-muted-foreground">{variancePercentage}% do orçado</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Variação (Orçado - Realizado)</CardTitle>
                {variance >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    variance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatBRL(Math.abs(variance))} {variance >= 0 ? 'Positivo' : 'Negativo'}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Orçado vs Realizado (Mensal)</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.monthlyData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickFormatter={formatMonth}
                        axisLine={false}
                        tickLine={false}
                        tickMargin={10}
                      />
                      <YAxis
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                        tickMargin={10}
                      />
                      <ChartTooltip
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        content={
                          <ChartTooltipContent
                            formatter={(value: any) => formatBRL(Number(value))}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="budgeted" fill="var(--color-budgeted)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="realized" fill="var(--color-realized)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Por Centro de Custo</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.costCenterData}
                      layout="vertical"
                      margin={{ top: 10, right: 10, left: 40, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12 }}
                        width={100}
                      />
                      <ChartTooltip
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        content={
                          <ChartTooltipContent
                            formatter={(value: any) => formatBRL(Number(value))}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="budgeted" fill="var(--color-budgeted)" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="realized" fill="var(--color-realized)" radius={[0, 4, 4, 0]} />
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
