import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, LabelList } from 'recharts'
import { format, parseISO } from 'date-fns'

interface DashboardTrendChartProps {
  data: any[]
  target: number
}

export default function DashboardTrendChart({ data, target }: DashboardTrendChartProps) {
  if (!data || data.length === 0) return null

  const chartConfig = {
    absenteismo: {
      label: 'Absenteísmo (%)',
      color: 'hsl(var(--primary))',
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução Diária de Absenteísmo</CardTitle>
        <CardDescription>Índice de absenteísmo por dia no período selecionado</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(val) => {
                try {
                  return format(parseISO(val), 'dd/MM')
                } catch {
                  return val
                }
              }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickFormatter={(val) => `${val}%`}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine
              y={target}
              stroke="red"
              strokeDasharray="3 3"
              label={{
                position: 'insideTopLeft',
                value: `Meta (${target}%)`,
                fill: 'red',
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="absenteismo"
              stroke="var(--color-absenteismo)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            >
              <LabelList
                dataKey="absenteismo"
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
                formatter={(val: number) => `${val}%`}
              />
            </Line>
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
