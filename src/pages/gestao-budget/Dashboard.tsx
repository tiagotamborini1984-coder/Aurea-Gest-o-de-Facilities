import { useState, useEffect, useMemo } from 'react'
import { DollarSign, TrendingUp, AlertTriangle, Wallet } from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  LabelList,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

export default function DashboardBudget() {
  const { profile } = useAppStore()
  const [allEntries, setAllEntries] = useState<any[]>([])
  const [costCenters, setCostCenters] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const [selectedCC, setSelectedCC] = useState<string>('all')

  useEffect(() => {
    if (!profile?.client_id) return

    supabase
      .from('budget_cost_centers')
      .select('*')
      .eq('client_id', profile.client_id)
      .then(({ data }) => setCostCenters(data || []))

    supabase
      .from('budget_accounts')
      .select('*')
      .eq('client_id', profile.client_id)
      .then(({ data }) => setAccounts(data || []))
  }, [profile?.client_id])

  useEffect(() => {
    if (!profile?.client_id) return
    fetchData()
  }, [profile?.client_id, selectedMonth])

  const fetchData = async () => {
    let query = supabase.from('budget_entries').select('*').eq('client_id', profile!.client_id)
    if (selectedMonth) {
      query = query.eq('reference_month', `${selectedMonth}-01`)
    }
    const { data } = await query
    setAllEntries(data || [])
  }

  const entries = useMemo(() => {
    if (selectedCC === 'all') return allEntries
    return allEntries.filter((e) => e.cost_center_id === selectedCC)
  }, [allEntries, selectedCC])

  const { totalBudgeted, totalRealized, diff, diffPercent } = useMemo(() => {
    let b = 0,
      r = 0
    entries.forEach((e) => {
      b += Number(e.budgeted_amount)
      r += Number(e.realized_amount)
    })
    return {
      totalBudgeted: b,
      totalRealized: r,
      diff: b - r, // Saldo positivo se orçado > realizado
      diffPercent: b > 0 ? (r / b) * 100 : 0,
    }
  }, [entries])

  const costCenterChartData = useMemo(() => {
    const map: Record<string, { name: string; Orcado: number; Realizado: number }> = {}
    allEntries.forEach((e) => {
      const ccObj = costCenters.find((c) => c.id === e.cost_center_id)
      const cc = ccObj?.code || ccObj?.name || 'Outros'
      if (!map[cc]) map[cc] = { name: cc, Orcado: 0, Realizado: 0 }
      map[cc].Orcado += Number(e.budgeted_amount)
      map[cc].Realizado += Number(e.realized_amount)
    })
    return Object.values(map).sort((a, b) => b.Orcado - a.Orcado)
  }, [allEntries, costCenters])

  const accountChartData = useMemo(() => {
    const map: Record<string, { name: string; Orcado: number; Realizado: number }> = {}
    entries.forEach((e) => {
      const acc = accounts.find((a) => a.id === e.account_id)?.name || 'Outras'
      if (!map[acc]) map[acc] = { name: acc, Orcado: 0, Realizado: 0 }
      map[acc].Orcado += Number(e.budgeted_amount)
      map[acc].Realizado += Number(e.realized_amount)
    })
    return Object.values(map).sort((a, b) => b.Orcado - a.Orcado)
  }, [entries, accounts])

  const chartConfig = {
    Orcado: {
      label: 'Orçado',
      color: '#16798a',
    },
    Realizado: {
      label: 'Realizado',
      color: '#618c21',
    },
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="h-6 w-6 text-brand-vividBlue" />
            Dashboard de Budget
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhamento financeiro: Orçado vs Realizado.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mês</Label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Centro de Custo</Label>
            <Select value={selectedCC} onValueChange={setSelectedCC}>
              <SelectTrigger className="h-9 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Centros</SelectItem>
                {costCenters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 shadow-sm border-blue-100 dark:border-blue-900">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Orçado</p>
                <p className="text-3xl font-bold mt-2 text-foreground">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    totalBudgeted,
                  )}
                </p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 dark:bg-amber-950/20 shadow-sm border-amber-100 dark:border-amber-900">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Total Realizado
                </p>
                <p className="text-3xl font-bold mt-2 text-foreground">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    totalRealized,
                  )}
                </p>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`shadow-sm ${diff < 0 ? 'bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900' : 'bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900'}`}
        >
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p
                  className={`text-sm font-medium ${diff < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
                >
                  Diferença (Saldo)
                </p>
                <p className="text-3xl font-bold mt-2 text-foreground">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    diff,
                  )}
                </p>
              </div>
              <div
                className={`p-2 rounded-lg ${diff < 0 ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'}`}
              >
                <AlertTriangle
                  className={`h-5 w-5 ${diff < 0 ? 'text-red-600 dark:text-red-300' : 'text-green-600 dark:text-green-300'}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">% do Budget Utilizado</p>
                <p
                  className={`text-3xl font-bold mt-2 ${diffPercent > 100 ? 'text-red-600 dark:text-red-400' : 'text-brand-vividBlue dark:text-blue-400'}`}
                >
                  {diffPercent.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5 mt-4">
              <div
                className={`h-1.5 rounded-full ${diffPercent > 100 ? 'bg-red-500 dark:bg-red-500' : 'bg-brand-vividBlue dark:bg-blue-500'}`}
                style={{ width: `${Math.min(diffPercent, 100)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 flex flex-col shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Consolidado Geral</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <BarChart
                data={[{ name: 'Total', Orcado: totalBudgeted, Realizado: totalRealized }]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(v) => `R$ ${v / 1000}k`}
                />
                <ChartTooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                  content={
                    <ChartTooltipContent
                      formatter={(val) =>
                        new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(val as number)
                      }
                    />
                  }
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar
                  dataKey="Orcado"
                  name="Orçado"
                  fill="var(--color-Orcado)"
                  radius={[4, 4, 0, 0]}
                  barSize={60}
                >
                  <LabelList
                    dataKey="Orcado"
                    position="top"
                    className="fill-foreground text-[10px] font-medium"
                    formatter={(val: number) => `R$ ${Math.round(val / 1000)}k`}
                  />
                </Bar>
                <Bar
                  dataKey="Realizado"
                  name="Realizado"
                  fill="var(--color-Realizado)"
                  radius={[4, 4, 0, 0]}
                  barSize={60}
                >
                  <LabelList
                    dataKey="Realizado"
                    position="top"
                    className="fill-foreground text-[10px] font-medium"
                    formatter={(val: number) => `R$ ${Math.round(val / 1000)}k`}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 flex flex-col shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">
              Orçado vs Realizado por Centro de Custo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <BarChart
                data={costCenterChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(v) => `R$ ${v / 1000}k`}
                />
                <ChartTooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                  content={
                    <ChartTooltipContent
                      formatter={(val) =>
                        new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(val as number)
                      }
                    />
                  }
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar
                  dataKey="Orcado"
                  name="Orçado"
                  fill="var(--color-Orcado)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                >
                  <LabelList
                    dataKey="Orcado"
                    position="top"
                    className="fill-foreground text-[10px] font-medium"
                    formatter={(val: number) => `R$ ${Math.round(val / 1000)}k`}
                  />
                </Bar>
                <Bar
                  dataKey="Realizado"
                  name="Realizado"
                  fill="var(--color-Realizado)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                >
                  <LabelList
                    dataKey="Realizado"
                    position="top"
                    className="fill-foreground text-[10px] font-medium"
                    formatter={(val: number) => `R$ ${Math.round(val / 1000)}k`}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {selectedCC !== 'all' && accountChartData.length > 0 && (
          <Card className="animate-fade-in lg:col-span-3 shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                Detalhamento por Conta Contábil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px] w-full">
                <BarChart
                  data={accountChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(v) => `R$ ${v / 1000}k`}
                  />
                  <ChartTooltip
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    content={
                      <ChartTooltipContent
                        formatter={(val) =>
                          new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(val as number)
                        }
                      />
                    }
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar
                    dataKey="Orcado"
                    name="Orçado"
                    fill="var(--color-Orcado)"
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList
                      dataKey="Orcado"
                      position="top"
                      className="fill-foreground text-[10px] font-medium"
                      formatter={(val: number) => `R$ ${Math.round(val / 1000)}k`}
                    />
                  </Bar>
                  <Bar
                    dataKey="Realizado"
                    name="Realizado"
                    fill="var(--color-Realizado)"
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList
                      dataKey="Realizado"
                      position="top"
                      className="fill-foreground text-[10px] font-medium"
                      formatter={(val: number) => `R$ ${Math.round(val / 1000)}k`}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
