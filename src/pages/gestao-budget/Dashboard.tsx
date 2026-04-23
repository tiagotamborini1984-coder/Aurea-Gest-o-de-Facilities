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
import { GLOBAL_CHART_COLORS } from '@/lib/color-utils'

export default function DashboardBudget() {
  const { profile } = useAppStore()
  const [entries, setEntries] = useState<any[]>([])
  const [costCenters, setCostCenters] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const [selectedCC, setSelectedCC] = useState<string>('all')

  useEffect(() => {
    if (!profile?.client_id)
      return supabase
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
  }, [profile?.client_id, selectedMonth, selectedCC])

  const fetchData = async () => {
    let query = supabase.from('budget_entries').select('*').eq('client_id', profile!.client_id)
    if (selectedMonth) {
      query = query.eq('reference_month', `${selectedMonth}-01`)
    }
    if (selectedCC && selectedCC !== 'all') {
      query = query.eq('cost_center_id', selectedCC)
    }
    const { data } = await query
    setEntries(data || [])
  }

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
      diff: r - b,
      diffPercent: b > 0 ? (r / b) * 100 : 0,
    }
  }, [entries])

  const chartData = useMemo(() => {
    if (selectedCC === 'all') {
      // Group by Cost Center
      const map: Record<string, { name: string; Orcado: number; Realizado: number }> = {}
      entries.forEach((e) => {
        const cc = costCenters.find((c) => c.id === e.cost_center_id)?.name || 'Outros'
        if (!map[cc]) map[cc] = { name: cc, Orcado: 0, Realizado: 0 }
        map[cc].Orcado += Number(e.budgeted_amount)
        map[cc].Realizado += Number(e.realized_amount)
      })
      return Object.values(map)
    } else {
      // Group by Account
      const map: Record<string, { name: string; Orcado: number; Realizado: number }> = {}
      entries.forEach((e) => {
        const acc = accounts.find((a) => a.id === e.account_id)?.name || 'Outras'
        if (!map[acc]) map[acc] = { name: acc, Orcado: 0, Realizado: 0 }
        map[acc].Orcado += Number(e.budgeted_amount)
        map[acc].Realizado += Number(e.realized_amount)
      })
      return Object.values(map)
    }
  }, [entries, selectedCC, costCenters, accounts])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="h-6 w-6 text-brand-vividBlue" />
            Dashboard de Budget
          </h1>
          <p className="text-gray-500 mt-1">Acompanhamento financeiro: Orçado vs Realizado.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Mês</Label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Centro de Custo</Label>
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
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900 shadow-sm border-blue-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Orçado</p>
                <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    totalBudgeted,
                  )}
                </p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-gray-900 shadow-sm border-amber-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Total Realizado
                </p>
                <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    totalRealized,
                  )}
                </p>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`bg-gradient-to-br shadow-sm ${diff > 0 ? 'from-red-50 border-red-100' : 'from-green-50 border-green-100'} to-white`}
        >
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p
                  className={`text-sm font-medium ${diff > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  Diferença (Saldo)
                </p>
                <p className="text-3xl font-bold mt-2 text-gray-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    diff,
                  )}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${diff > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                <AlertTriangle
                  className={`h-5 w-5 ${diff > 0 ? 'text-red-600' : 'text-green-600'}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-900 shadow-sm border-gray-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">% do Budget Utilizado</p>
                <p
                  className={`text-3xl font-bold mt-2 ${diffPercent > 100 ? 'text-red-600' : 'text-brand-vividBlue'}`}
                >
                  {diffPercent.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4">
              <div
                className={`h-1.5 rounded-full ${diffPercent > 100 ? 'bg-red-500' : 'bg-brand-vividBlue'}`}
                style={{ width: `${Math.min(diffPercent, 100)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-gray-800">
            Orçado vs Realizado -{' '}
            {selectedCC === 'all' ? 'Por Centro de Custo' : 'Por Conta Contábil'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickFormatter={(v) => `R$ ${v / 1000}k`}
                />
                <Tooltip
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(val) =>
                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      val as number,
                    )
                  }
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar
                  dataKey="Orcado"
                  name="Orçado"
                  fill={GLOBAL_CHART_COLORS[0]}
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey="Orcado"
                    position="top"
                    className="fill-slate-600 text-[10px] font-medium"
                    formatter={(val: number) => `R$ ${Math.round(val / 1000)}k`}
                  />
                </Bar>
                <Bar
                  dataKey="Realizado"
                  name="Realizado"
                  fill={GLOBAL_CHART_COLORS[1]}
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey="Realizado"
                    position="top"
                    className="fill-slate-600 text-[10px] font-medium"
                    formatter={(val: number) => `R$ ${Math.round(val / 1000)}k`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
