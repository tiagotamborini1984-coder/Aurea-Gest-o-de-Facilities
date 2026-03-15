import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Line,
  LineChart,
} from 'recharts'

const mockData = [
  { name: 'Sem 1', presença: 95, absenteismo: 5 },
  { name: 'Sem 2', presença: 92, absenteismo: 8 },
  { name: 'Sem 3', presença: 88, absenteismo: 12 },
  { name: 'Sem 4', presença: 96, absenteismo: 4 },
]

export default function BIDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">BI Dashboard</h2>
        <p className="text-muted-foreground mt-1">Análise gráfica interativa da operação.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Taxa de Presença vs Absenteísmo</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer
              config={{
                presença: { color: 'hsl(var(--primary))', label: 'Presença' },
                absenteismo: { color: 'hsl(var(--destructive))', label: 'Absenteísmo' },
              }}
              className="h-full w-full"
            >
              <BarChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="presença" fill="var(--color-presença)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absenteismo" fill="var(--color-absenteismo)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Tendência de Disponibilidade (Equipamentos)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer
              config={{ disp: { color: '#10b981', label: 'Disponibilidade (%)' } }}
              className="h-full w-full"
            >
              <LineChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[80, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="presença"
                  stroke="var(--color-disp)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
