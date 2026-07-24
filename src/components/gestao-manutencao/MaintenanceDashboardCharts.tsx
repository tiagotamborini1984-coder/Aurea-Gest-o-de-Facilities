import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase/client'
import { GaugeChart } from '@/components/gestao-manutencao/GaugeChart'
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { ChartContainer } from '@/components/ui/chart'
import { Target, CheckCircle2, BarChart3 } from 'lucide-react'

interface AreaData {
  area_id: string | null
  area_name: string
  count: number
}

interface DashboardMetrics {
  completed_by_area: AreaData[]
  schedule_adherence: number | null
  preventive_adherence: number | null
}

const PIE_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16',
  '#06b6d4',
  '#a855f7',
]

export function MaintenanceDashboardCharts({
  selectedPlant,
  dateStart,
  dateEnd,
}: {
  selectedPlant: string
  dateStart: string
  dateEnd: string
}) {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      const { data, error } = await (supabase as any).rpc('get_maintenance_dashboard_metrics', {
        p_client_id: null,
        p_plant_id: selectedPlant === 'all' ? null : selectedPlant,
        p_date_start: dateStart,
        p_date_end: dateEnd,
      })
      if (cancelled) return
      if (!error && data) {
        setMetrics(data as DashboardMetrics)
      }
      setLoading(false)
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [selectedPlant, dateStart, dateEnd])

  const pieData = (metrics?.completed_by_area || []).filter((a) => a.count > 0)

  const pieConfig = pieData.reduce(
    (acc, item, idx) => {
      acc[item.area_name] = {
        label: item.area_name,
        color: PIE_COLORS[idx % PIE_COLORS.length],
      }
      return acc
    },
    {} as Record<string, { label: string; color: string }>,
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-500 shrink-0" />
            Aderência à Programação
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center pt-4">
          {loading ? (
            <Skeleton className="h-[140px] w-[220px]" />
          ) : (
            <GaugeChart
              value={metrics?.schedule_adherence ?? null}
              label="Aderência"
              description="Tickets executados dentro do prazo planejado (±1 dia)"
            />
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            Aderência à Manutenção Preventiva
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center pt-4">
          {loading ? (
            <Skeleton className="h-[140px] w-[220px]" />
          ) : (
            <GaugeChart
              value={metrics?.preventive_adherence ?? null}
              label="Aderência"
              description="Preventivas concluídas até a data planejada"
            />
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500 shrink-0" />
            Chamados Concluídos por Área
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[220px]">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Skeleton className="h-[160px] w-[160px] rounded-full" />
            </div>
          ) : pieData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Sem dados no período selecionado
            </div>
          ) : (
            <ChartContainer config={pieConfig} className="w-full h-full">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  dataKey="count"
                  nameKey="area_name"
                  labelLine={false}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} chamado(s)`, name]}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
