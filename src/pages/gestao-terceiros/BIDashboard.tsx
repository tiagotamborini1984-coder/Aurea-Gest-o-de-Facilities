import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Line, LineChart } from 'recharts'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { format, subDays } from 'date-fns'
import { Loader2 } from 'lucide-react'

export default function BIDashboard() {
  const { plants, contracted } = useMasterData()
  const [data, setData] = useState<any[]>([])
  const [trendData, setTrendData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (plants.length === 0) return

      const dateFrom = format(subDays(new Date(), 30), 'yyyy-MM-dd')
      const dateTo = format(new Date(), 'yyyy-MM-dd')

      const { data: logs } = await supabase
        .from('daily_logs')
        .select('*')
        .gte('date', dateFrom)
        .lte('date', dateTo)

      const safeLogs = logs || []

      // Chart 1: Plant Performance (Staff)
      const pData = plants.map((p) => {
        const plantLogs = safeLogs.filter((l) => l.plant_id === p.id && l.type === 'staff')
        const presencas = plantLogs.filter((l) => l.status).length
        const total = plantLogs.length
        const presencaRate = total > 0 ? (presencas / total) * 100 : 0
        const contr = contracted
          .filter((c) => c.plant_id === p.id && c.type === 'colaborador')
          .reduce((a, b) => a + b.quantity, 0)
        // Avg present per day
        const days = new Set(plantLogs.map((l) => l.date)).size || 1
        const avgPres = presencas / days
        const absRate = contr > 0 ? Math.max(0, ((contr - avgPres) / contr) * 100) : 0

        return {
          name: p.name.substring(0, 15),
          presenca: Number(presencaRate.toFixed(1)),
          absenteismo: Number(absRate.toFixed(1)),
        }
      })
      setData(pData)

      // Chart 2: Daily Equipment Trend
      const eqLogs = safeLogs.filter((l) => l.type === 'equipment')
      const dates = Array.from(new Set(eqLogs.map((l) => l.date))).sort()

      const tData = dates.map((d) => {
        const dLogs = eqLogs.filter((l) => l.date === d)
        const dPres = dLogs.filter((l) => l.status).length
        const disp = dLogs.length > 0 ? (dPres / dLogs.length) * 100 : 0
        return {
          name: format(new Date(d), 'dd/MM'),
          disp: Number(disp.toFixed(1)),
        }
      })
      setTrendData(tData.slice(-14)) // Last 14 days with data

      setLoading(false)
    }
    fetchData()
  }, [plants, contracted])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">BI Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Análise gráfica consolidada da operação (Últimos 30 dias).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-brand-light">
          <CardHeader>
            <CardTitle>Taxa de Presença vs Absenteísmo por Planta (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ChartContainer
              config={{
                presenca: { color: 'hsl(var(--primary))', label: 'Taxa Presença' },
                absenteismo: { color: 'hsl(var(--destructive))', label: 'Absenteísmo' },
              }}
              className="h-full w-full"
            >
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="presenca"
                  fill="var(--color-presenca)"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
                <Bar
                  dataKey="absenteismo"
                  fill="var(--color-absenteismo)"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-brand-light">
          <CardHeader>
            <CardTitle>Tendência de Disponibilidade - Equipamentos (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ChartContainer
              config={{ disp: { color: '#10b981', label: 'Disponibilidade (%)' } }}
              className="h-full w-full"
            >
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="disp"
                  stroke="var(--color-disp)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'var(--color-disp)' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
