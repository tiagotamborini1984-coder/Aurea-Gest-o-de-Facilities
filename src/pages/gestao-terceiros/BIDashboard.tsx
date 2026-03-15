import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Line, LineChart } from 'recharts'
import { useMasterData } from '@/hooks/use-master-data'

export default function BIDashboard() {
  const { plants } = useMasterData()

  // Generate dynamic mock data based on actual plants
  const plantData =
    plants.length > 0
      ? plants.map((p) => ({
          name: p.name.substring(0, 15),
          presenca: Math.floor(Math.random() * 20) + 80,
          absenteismo: Math.floor(Math.random() * 15) + 2,
        }))
      : [
          { name: 'Semana 1', presenca: 95, absenteismo: 5 },
          { name: 'Semana 2', presenca: 92, absenteismo: 8 },
        ]

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">BI Dashboard</h2>
        <p className="text-muted-foreground mt-1">Análise gráfica consolidada da operação.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-brand-light">
          <CardHeader>
            <CardTitle>Presença vs Absenteísmo por Planta (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ChartContainer
              config={{
                presenca: { color: 'hsl(var(--primary))', label: 'Taxa de Presença' },
                absenteismo: { color: 'hsl(var(--destructive))', label: 'Absenteísmo' },
              }}
              className="h-full w-full"
            >
              <BarChart data={plantData}>
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
            <CardTitle>Tendência de Disponibilidade - Frota/Equipamentos</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ChartContainer
              config={{ disp: { color: '#10b981', label: 'Disponibilidade (%)' } }}
              className="h-full w-full"
            >
              <LineChart data={plantData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis domain={[70, 100]} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="presenca"
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
