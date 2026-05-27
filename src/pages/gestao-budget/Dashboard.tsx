import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Check, ChevronsUpDown, DollarSign, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface BudgetEntry {
  id: string
  account_id: string
  cost_center_id: string
  budgeted_amount: number
  realized_amount: number
  reference_month: string
}

interface CostCenter {
  id: string
  name: string
  code: string | null
}

interface Account {
  id: string
  name: string
  code: string | null
  type: string
}

export default function DashboardBudget() {
  const { activeClient } = useAppStore()

  const [months, setMonths] = useState<{ value: string; label: string }[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('budgetDashboardMonths')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        /* intentionally ignored */
      }
    }
    return []
  })

  const [entries, setEntries] = useState<BudgetEntry[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  // Init months
  useEffect(() => {
    const opts = []
    const current = new Date()
    for (let i = 0; i < 12; i++) {
      const d = startOfMonth(subMonths(current, i))
      opts.push({
        value: format(d, 'yyyy-MM-dd'),
        label: format(d, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase()),
      })
    }
    setMonths(opts)
    if (selectedMonths.length === 0) {
      const initial = [opts[0].value]
      setSelectedMonths(initial)
      sessionStorage.setItem('budgetDashboardMonths', JSON.stringify(initial))
    }
  }, [])

  useEffect(() => {
    if (selectedMonths.length > 0) {
      sessionStorage.setItem('budgetDashboardMonths', JSON.stringify(selectedMonths))
    }
  }, [selectedMonths])

  // Fetch data
  useEffect(() => {
    if (!activeClient || selectedMonths.length === 0) return

    const fetchData = async () => {
      setLoading(true)

      const [ccRes, accRes, entriesRes] = await Promise.all([
        supabase.from('budget_cost_centers').select('*').eq('client_id', activeClient.id),
        supabase.from('budget_accounts').select('*').eq('client_id', activeClient.id),
        supabase
          .from('budget_entries')
          .select('*')
          .eq('client_id', activeClient.id)
          .in('reference_month', selectedMonths),
      ])

      if (ccRes.data) setCostCenters(ccRes.data as CostCenter[])
      if (accRes.data) setAccounts(accRes.data as Account[])
      if (entriesRes.data) setEntries(entriesRes.data as BudgetEntry[])

      setLoading(false)
    }

    fetchData()
  }, [activeClient, selectedMonths])

  const { totalBudgeted, totalRealized, variance, variancePercentage } = useMemo(() => {
    let budgeted = 0
    let realized = 0

    entries.forEach((e) => {
      budgeted += Number(e.budgeted_amount || 0)
      realized += Number(e.realized_amount || 0)
    })

    const varAmount = realized - budgeted
    const varPerc = budgeted > 0 ? (varAmount / budgeted) * 100 : 0

    return {
      totalBudgeted: budgeted,
      totalRealized: realized,
      variance: varAmount,
      variancePercentage: varPerc,
    }
  }, [entries])

  const chartDataByCostCenter = useMemo(() => {
    const dataMap: Record<string, { name: string; Orcado: number; Realizado: number }> = {}

    costCenters.forEach((cc) => {
      dataMap[cc.id] = {
        name: cc.code ? `${cc.code} - ${cc.name}` : cc.name,
        Orcado: 0,
        Realizado: 0,
      }
    })

    entries.forEach((e) => {
      if (dataMap[e.cost_center_id]) {
        dataMap[e.cost_center_id].Orcado += Number(e.budgeted_amount || 0)
        dataMap[e.cost_center_id].Realizado += Number(e.realized_amount || 0)
      }
    })

    return Object.values(dataMap).filter((d) => d.Orcado > 0 || d.Realizado > 0)
  }, [entries, costCenters])

  const tableDataByAccount = useMemo(() => {
    const dataMap: Record<string, { account: Account; budgeted: number; realized: number }> = {}

    accounts.forEach((acc) => {
      dataMap[acc.id] = { account: acc, budgeted: 0, realized: 0 }
    })

    entries.forEach((e) => {
      if (dataMap[e.account_id]) {
        dataMap[e.account_id].budgeted += Number(e.budgeted_amount || 0)
        dataMap[e.account_id].realized += Number(e.realized_amount || 0)
      }
    })

    return Object.values(dataMap)
      .filter((d) => d.budgeted > 0 || d.realized > 0)
      .map((d) => ({
        ...d,
        variance: d.realized - d.budgeted,
        variancePerc: d.budgeted > 0 ? ((d.realized - d.budgeted) / d.budgeted) * 100 : 0,
      }))
      .sort((a, b) => b.budgeted - a.budgeted)
  }, [entries, accounts])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const toggleMonth = (val: string) => {
    setSelectedMonths((prev) => {
      if (prev.includes(val)) {
        if (prev.length === 1) return prev
        return prev.filter((m) => m !== val)
      }
      return [...prev, val]
    })
  }

  const selectAll = () => {
    setSelectedMonths(months.map((m) => m.value))
  }

  const clearSelection = () => {
    if (months.length > 0) {
      setSelectedMonths([months[0].value])
    }
  }

  const filterLabel =
    selectedMonths.length === 0
      ? 'Selecione o(s) mês(es)'
      : selectedMonths.length === 1
        ? months.find((m) => m.value === selectedMonths[0])?.label
        : `${selectedMonths.length} meses selecionados`

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Budget</h1>
          <p className="text-muted-foreground">
            Acompanhe o orçado vs realizado do período selecionado
          </p>
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[280px] justify-between"
            >
              {filterLabel}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="end">
            <Command>
              <CommandInput placeholder="Buscar mês..." />
              <CommandList>
                <CommandEmpty>Nenhum mês encontrado.</CommandEmpty>
                <CommandGroup>
                  <div className="flex items-center justify-between px-2 pb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAll}
                      className="h-8 px-2 text-xs"
                    >
                      Selecionar Todos
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      className="h-8 px-2 text-xs"
                    >
                      Limpar
                    </Button>
                  </div>
                  <CommandSeparator />
                  {months.map((month) => (
                    <CommandItem
                      key={month.value}
                      value={month.label}
                      onSelect={() => toggleMonth(month.value)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedMonths.includes(month.value) ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {month.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orçado</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totalBudgeted)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Realizado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(totalRealized)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variação (R$)</CardTitle>
            {variance > 0 ? (
              <TrendingUp className="h-4 w-4 text-destructive" />
            ) : (
              <TrendingDown className="h-4 w-4 text-emerald-500" />
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div
                className={cn(
                  'text-2xl font-bold',
                  variance > 0 ? 'text-destructive' : 'text-emerald-500',
                )}
              >
                {variance > 0 ? '+' : ''}
                {formatCurrency(variance)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variação (%)</CardTitle>
            {variancePercentage > 0 ? (
              <TrendingUp className="h-4 w-4 text-destructive" />
            ) : (
              <TrendingDown className="h-4 w-4 text-emerald-500" />
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div
                className={cn(
                  'text-2xl font-bold',
                  variancePercentage > 0 ? 'text-destructive' : 'text-emerald-500',
                )}
              >
                {variancePercentage > 0 ? '+' : ''}
                {variancePercentage.toFixed(2)}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-6">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Orçado vs Realizado por Centro de Custo</CardTitle>
            <CardDescription>Comparativo financeiro no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : chartDataByCostCenter.length === 0 ? (
              <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                Nenhum dado encontrado
              </div>
            ) : (
              <ChartContainer
                config={{
                  Orcado: { label: 'Orçado', color: 'hsl(var(--primary))' },
                  Realizado: { label: 'Realizado', color: 'hsl(var(--destructive))' },
                }}
                className="h-[350px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartDataByCostCenter}
                    margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) =>
                        value.length > 15 ? value.substring(0, 15) + '...' : value
                      }
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => formatCurrency(value as number)}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="Orcado" fill="var(--color-Orcado)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Realizado" fill="var(--color-Realizado)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Detalhamento por Conta</CardTitle>
            <CardDescription>Consolidado das contas no período</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : tableDataByAccount.length === 0 ? (
              <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                Nenhum dado encontrado
              </div>
            ) : (
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-4">
                  {tableDataByAccount.map((row) => (
                    <div
                      key={row.account.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="space-y-1 w-1/2">
                        <p
                          className="text-sm font-medium leading-none truncate"
                          title={row.account.name}
                        >
                          {row.account.code ? `${row.account.code} - ` : ''}
                          {row.account.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{row.account.type}</p>
                      </div>
                      <div className="text-right w-1/2">
                        <p className="text-sm font-medium">
                          <span className="text-muted-foreground mr-2 text-xs">Real:</span>
                          {formatCurrency(row.realized)}
                        </p>
                        <div className="flex items-center justify-end gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Orç: {formatCurrency(row.budgeted)}
                          </span>
                          <Badge
                            variant={row.variance > 0 ? 'destructive' : 'secondary'}
                            className="text-[10px] px-1 py-0 h-4"
                          >
                            {row.variance > 0 ? '+' : ''}
                            {row.variancePerc.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
