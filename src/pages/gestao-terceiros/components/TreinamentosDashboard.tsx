import { useMasterData } from '@/hooks/use-master-data'
import { EmployeeWithTrainings } from '@/pages/gestao-terceiros/hooks/use-treinamentos'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from 'recharts'
import { CheckCircle2, XCircle, FileText, Activity } from 'lucide-react'

export function TreinamentosDashboard({ data }: { data: EmployeeWithTrainings[] }) {
  const { plants } = useMasterData()

  const statsByPlant = data.reduce(
    (acc, emp) => {
      if (!acc[emp.plant_id]) {
        acc[emp.plant_id] = {
          total: 0,
          valid: 0,
          expired: 0,
          plant_id: emp.plant_id,
        }
      }

      emp.trainings.forEach((t) => {
        if (t.is_required) {
          acc[emp.plant_id].total++
          if (t.status === 'valid') {
            acc[emp.plant_id].valid++
          } else {
            acc[emp.plant_id].expired++
          }
        }
      })

      return acc
    },
    {} as Record<string, { total: number; valid: number; expired: number; plant_id: string }>,
  )

  const plantsData = Object.values(statsByPlant)
    .map((stat) => {
      const plant = plants?.find((p: any) => p.id === stat.plant_id)
      const adherence = stat.total > 0 ? Math.round((stat.valid / stat.total) * 100) : 0
      return {
        ...stat,
        plant_name: plant?.name || 'Desconhecida',
        adherence,
      }
    })
    .sort((a, b) => b.adherence - a.adherence)

  const overall = plantsData.reduce(
    (acc, curr) => {
      acc.total += curr.total
      acc.valid += curr.valid
      acc.expired += curr.expired
      return acc
    },
    { total: 0, valid: 0, expired: 0 },
  )

  const overallAdherence = overall.total > 0 ? Math.round((overall.valid / overall.total) * 100) : 0

  const chartConfig = {
    adherence: {
      label: 'Aderência (%)',
      color: 'hsl(var(--primary))',
    },
  }

  if (plantsData.length === 0) {
    return (
      <div className="flex justify-center p-8 bg-card rounded-xl border border-border text-muted-foreground shadow-sm mt-4">
        Nenhum dado encontrado para gerar o dashboard.
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total (Obrigatórios)
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overall.total}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Válidos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overall.valid}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes/Vencidos
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overall.expired}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-brand-vividBlue/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aderência Geral
            </CardTitle>
            <Activity className="h-4 w-4 text-brand-vividBlue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallAdherence}%</div>
            <Progress value={overallAdherence} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Aderência por Planta</CardTitle>
            <CardDescription>
              Percentual de treinamentos válidos em relação aos obrigatórios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={plantsData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="plant_name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="adherence" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {plantsData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.adherence >= 80
                          ? '#22c55e'
                          : entry.adherence >= 50
                            ? '#eab308'
                            : '#ef4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Detalhamento por Planta</CardTitle>
            <CardDescription>Quantidade de treinamentos obrigatórios por status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {plantsData.map((plant) => (
                <div
                  key={plant.plant_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="space-y-1 w-full max-w-[200px]">
                    <p
                      className="text-sm font-medium leading-none truncate"
                      title={plant.plant_name}
                    >
                      {plant.plant_name}
                    </p>
                    <div className="flex items-center gap-3 text-xs mt-1.5">
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {plant.valid}
                      </span>
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <XCircle className="w-3.5 h-3.5" /> {plant.expired}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-1 justify-end ml-4">
                    <Progress
                      value={plant.adherence}
                      className="h-2 flex-1 max-w-[120px] hidden sm:block bg-muted"
                    />
                    <span className="text-sm font-bold w-12 text-right">{plant.adherence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
