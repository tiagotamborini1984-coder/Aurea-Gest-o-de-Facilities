import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Leaf, Sprout, Wind, Loader2 } from 'lucide-react'
import { useMasterData } from '@/hooks/use-master-data'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'
import { RankingList } from '../components/BIRankings'
import { cn } from '@/lib/utils'

export default function DashboardLJ() {
  const { profile } = useAppStore()
  const { plants } = useMasterData()
  const hasAccess = useHasAccess('Limpeza e Jardinagem')
  const [plantId, setPlantId] = useState('all')
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return
      setLoading(true)

      let q = supabase
        .from('cleaning_gardening_schedules')
        .select('*, areas:area_id(name, type)')
        .eq('client_id', profile.client_id)
        .gte('activity_date', startDate)
        .lte('activity_date', endDate)
      if (plantId !== 'all') q = q.eq('plant_id', plantId)

      const { data } = await q
      setSchedules(data || [])
      setLoading(false)
    }
    if (startDate && endDate) {
      fetchStats()
    }
  }, [profile, plantId, startDate, endDate])

  const kpis = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')

    const gardening = schedules.filter((s) => s.areas?.type === 'gardening')
    const gardeningValid = gardening.filter((s) => s.activity_date <= todayStr)
    const gardeningDone = gardeningValid.filter((s) => s.status === 'Realizado').length
    const gardeningAdherence = gardeningValid.length
      ? ((gardeningDone / gardeningValid.length) * 100).toFixed(1)
      : 0

    const cleaning = schedules.filter((s) => s.areas?.type === 'cleaning')
    const cleaningValid = cleaning.filter((s) => s.activity_date <= todayStr)
    const cleaningDone = cleaningValid.filter((s) => s.status === 'Realizado').length
    const cleaningAdherence = cleaningValid.length
      ? ((cleaningDone / cleaningValid.length) * 100).toFixed(1)
      : 0

    return {
      gardeningAdherence,
      cleaningAdherence,
      gTotal: gardeningValid.length,
      cTotal: cleaningValid.length,
    }
  }, [schedules])

  const chartData = useMemo(() => {
    const grouped: any = {}
    schedules.forEach((s) => {
      const aName = s.areas?.name || 'Desconhecida'
      if (!grouped[aName])
        grouped[aName] = { area: aName, Realizado: 0, NãoRealizado: 0, Pendente: 0 }
      if (s.status === 'Realizado') grouped[aName].Realizado++
      else if (s.status === 'Não Realizado') grouped[aName].NãoRealizado++
      else grouped[aName].Pendente++
    })
    return Object.values(grouped)
      .sort(
        (a: any, b: any) =>
          b.Realizado + b.NãoRealizado + b.Pendente - (a.Realizado + a.NãoRealizado + a.Pendente),
      )
      .slice(0, 10)
  }, [schedules])

  const plantRankingData = useMemo(() => {
    if (plantId !== 'all') return []

    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const validSchedules = schedules.filter((s) => s.activity_date <= todayStr)

    const grouped: Record<string, { total: number; done: number }> = {}

    validSchedules.forEach((s) => {
      if (!grouped[s.plant_id]) {
        grouped[s.plant_id] = { total: 0, done: 0 }
      }
      grouped[s.plant_id].total++
      if (s.status === 'Realizado') {
        grouped[s.plant_id].done++
      }
    })

    return Object.entries(grouped)
      .map(([pId, stats]) => {
        const plant = plants.find((p) => p.id === pId)
        const adherence = stats.total > 0 ? (stats.done / stats.total) * 100 : 0
        return {
          id: pId,
          name: plant?.name || 'Desconhecida',
          value: adherence.toFixed(1),
        }
      })
      .sort((a, b) => parseFloat(b.value) - parseFloat(a.value))
  }, [schedules, plants, plantId])

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-deepBlue/10 p-2.5 rounded-xl border border-brand-deepBlue/20 shadow-sm">
            <Leaf className="h-6 w-6 text-brand-deepBlue" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Dashboard Operacional
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Taxa de aderência e indicadores de serviços.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-card p-2 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36"
            />
            <span className="text-muted-foreground text-sm">até</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36"
            />
          </div>
          <Select value={plantId} onValueChange={setPlantId}>
            <SelectTrigger className="w-48 bg-muted">
              <SelectValue placeholder="Todas as Plantas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Plantas</SelectItem>
              {plants.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-deepBlue" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-950/20">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                  <Sprout className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    Taxa de Aderência (Jardinagem)
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                      {kpis.gardeningAdherence}%
                    </h3>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      de {kpis.gTotal} válidos até hoje
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-blue-200 bg-blue-50/30 dark:border-blue-900/30 dark:bg-blue-950/20">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                  <Wind className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Taxa de Aderência (Limpeza)
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {kpis.cleaningAdherence}%
                    </h3>
                    <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                      de {kpis.cTotal} válidos até hoje
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className={cn('grid gap-4 grid-cols-1', plantId === 'all' ? 'lg:grid-cols-3' : '')}>
            <Card className={cn('shadow-sm', plantId === 'all' ? 'lg:col-span-2' : '')}>
              <CardHeader className="bg-muted/30 border-b py-4">
                <CardTitle className="text-lg">Status por Área (Top 10)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {chartData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Sem dados para exibir.</p>
                ) : (
                  <ChartContainer
                    config={{
                      Realizado: { label: 'Realizado', color: 'hsl(var(--primary))' },
                      Pendente: { label: 'Pendente', color: '#f59e0b' },
                      NãoRealizado: { label: 'Não Realizado', color: '#ef4444' },
                    }}
                    className="h-[300px] w-full"
                  >
                    <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="area"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: 'currentColor' }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: 'currentColor' }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="Realizado" fill="#10b981" radius={[0, 0, 0, 0]} stackId="a">
                        <LabelList
                          dataKey="Realizado"
                          position="inside"
                          fill="#fff"
                          className="text-[10px] font-bold"
                          formatter={(val: number) => (val > 0 ? val : '')}
                        />
                      </Bar>
                      <Bar dataKey="Pendente" fill="#f59e0b" radius={[0, 0, 0, 0]} stackId="a">
                        <LabelList
                          dataKey="Pendente"
                          position="inside"
                          fill="#fff"
                          className="text-[10px] font-bold"
                          formatter={(val: number) => (val > 0 ? val : '')}
                        />
                      </Bar>
                      <Bar dataKey="NãoRealizado" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a">
                        <LabelList
                          dataKey="NãoRealizado"
                          position="inside"
                          fill="#fff"
                          className="text-[10px] font-bold"
                          formatter={(val: number) => (val > 0 ? val : '')}
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {plantId === 'all' && (
              <Card className="shadow-sm">
                <CardHeader className="bg-muted/30 border-b py-4">
                  <CardTitle className="text-lg">Ranking por Planta (Aderência)</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <RankingList items={plantRankingData} valueSuffix="%" />
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
