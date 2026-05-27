import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Check,
  ChevronsUpDown,
  Filter,
  Loader2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDashboardBudget } from '@/hooks/use-dashboard-budget'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartConfig,
} from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useAppStore } from '@/store/AppContext'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function DashboardBudget() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedMonths = searchParams.getAll('month')
  const selectedCostCenters = searchParams.getAll('cc')

  const { data, costCenters, availableMonths, loading } = useDashboardBudget(
    selectedMonths,
    selectedCostCenters,
  )
  const { activeClient } = useAppStore()

  const primaryColor = activeClient?.primary_color || 'hsl(var(--primary))'
  const secondaryColor = activeClient?.secondary_color || '#10b981'

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatMonth = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM/yyyy', { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  const toggleMonth = (month: string) => {
    const next = selectedMonths.includes(month)
      ? selectedMonths.filter((m) => m !== month)
      : [...selectedMonths, month]

    const newParams = new URLSearchParams(searchParams)
    newParams.delete('month')
    next.forEach((m) => newParams.append('month', m))
    setSearchParams(newParams, { replace: true })
  }

  const toggleCostCenter = (id: string) => {
    const next = selectedCostCenters.includes(id)
      ? selectedCostCenters.filter((c) => c !== id)
      : [...selectedCostCenters, id]

    const newParams = new URLSearchParams(searchParams)
    newParams.delete('cc')
    next.forEach((c) => newParams.append('cc', c))
    setSearchParams(newParams, { replace: true })
  }

  const chartConfig = {
    budgeted: {
      label: 'Orçado',
      color: primaryColor,
    },
    realized: {
      label: 'Realizado',
      color: secondaryColor,
    },
  } satisfies ChartConfig

  const chartData =
    data?.monthlyData?.map((d: any) => ({
      ...d,
      monthLabel: formatMonth(d.month),
    })) || []

  const totalBudgeted = data?.totalBudgeted || 0
  const totalRealized = data?.totalRealized || 0
  const balance = totalBudgeted - totalRealized
  const variance = totalBudgeted > 0 ? ((totalRealized - totalBudgeted) / totalBudgeted) * 100 : 0

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard de Budget</h2>
          <p className="text-muted-foreground">Visão geral do orçamento planejado vs realizado</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[220px] justify-between">
                {selectedMonths.length === 0
                  ? 'Todos os Meses'
                  : `${selectedMonths.length} meses selecionados`}
                <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[220px]">
              <ScrollArea className="h-64">
                {availableMonths.map((m) => (
                  <DropdownMenuCheckboxItem
                    key={m}
                    checked={selectedMonths.includes(m)}
                    onCheckedChange={() => toggleMonth(m)}
                  >
                    {formatMonth(m)}
                  </DropdownMenuCheckboxItem>
                ))}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[250px] justify-between">
                {selectedCostCenters.length === 0
                  ? 'Todos os Centros de Custo'
                  : `${selectedCostCenters.length} CCs selecionados`}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Buscar centro de custo..." />
                <CommandList>
                  <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                  <CommandGroup>
                    <ScrollArea className="h-64">
                      {costCenters.map((cc) => (
                        <CommandItem
                          key={cc.id}
                          value={cc.name}
                          onSelect={() => toggleCostCenter(cc.id)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedCostCenters.includes(cc.id) ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {cc.name}
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <div className="flex justify-center items-center h-64 border rounded-xl border-dashed">
          <p className="text-muted-foreground">
            Nenhum dado encontrado para os filtros selecionados.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orçado</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalBudgeted)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Realizado</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalRealized)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo (Orçado - Realizado)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'text-2xl font-bold',
                    balance >= 0 ? 'text-emerald-600' : 'text-rose-600',
                  )}
                >
                  {formatCurrency(balance)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Variação %</CardTitle>
                {variance > 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-rose-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                )}
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'text-2xl font-bold',
                    variance <= 0 ? 'text-emerald-600' : 'text-rose-600',
                  )}
                >
                  {variance > 0 ? '+' : ''}
                  {variance.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Em relação ao orçado</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Orçado vs Realizado por Mês</CardTitle>
                <CardDescription>Evolução mensal do orçamento</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                {chartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="monthLabel"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        fontSize={12}
                      />
                      <YAxis
                        tickFormatter={(v) => `R$ ${v / 1000}k`}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        fontSize={12}
                        width={80}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dashed" />}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="budgeted" fill="var(--color-budgeted)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="realized" fill="var(--color-realized)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center border-dashed border rounded-md">
                    <p className="text-muted-foreground text-sm">
                      Dados insuficientes para o gráfico.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Por Centro de Custo</CardTitle>
                <CardDescription>Maiores despesas por área</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {data?.costCenterData?.map((cc: any, i: number) => {
                      const perc = cc.budgeted > 0 ? (cc.realized / cc.budgeted) * 100 : 0
                      return (
                        <div key={i} className="flex items-center">
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">{cc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Orçado: {formatCurrency(cc.budgeted)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatCurrency(cc.realized)}</p>
                            <p
                              className={cn(
                                'text-xs',
                                perc <= 100 ? 'text-emerald-500' : 'text-rose-500',
                              )}
                            >
                              {perc.toFixed(1)}% do Orçado
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    {data?.costCenterData?.length === 0 && (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        Nenhum dado encontrado.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
