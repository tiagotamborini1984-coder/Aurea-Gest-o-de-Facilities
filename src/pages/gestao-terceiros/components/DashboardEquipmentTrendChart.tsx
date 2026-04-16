import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

interface DataPoint {
  date: string
  absenteismo: number
  presentes: number
  contratado: number
}

interface Props {
  data: DataPoint[]
  target?: number
}

export default function DashboardEquipmentTrendChart({ data, target = 4 }: Props) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      formattedDate: format(parseISO(d.date), 'dd/MM', { locale: ptBR }),
      indisponibilidade: d.absenteismo,
    }))
  }, [data])

  if (chartData.length === 0) return null

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Evolução Diária de Indisponibilidade</CardTitle>
        <CardDescription>
          Acompanhamento da taxa de indisponibilidade de equipamentos no período selecionado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            indisponibilidade: {
              label: 'Indisponibilidade (%)',
              color: 'hsl(var(--chart-1))',
            },
          }}
          className="h-[300px] w-full"
        >
          <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--muted-foreground)/0.2)"
            />
            <XAxis
              dataKey="formattedDate"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={(value) => `${value}%`}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine
              y={target}
              stroke="hsl(var(--destructive))"
              strokeDasharray="3 3"
              label={{
                position: 'top',
                value: `Meta (${target}%)`,
                fill: 'hsl(var(--destructive))',
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="indisponibilidade"
              stroke="var(--color-indisponibilidade)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--color-indisponibilidade)' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
