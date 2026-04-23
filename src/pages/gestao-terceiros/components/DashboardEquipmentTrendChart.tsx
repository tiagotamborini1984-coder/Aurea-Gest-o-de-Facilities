import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, LabelList } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { format, parseISO } from 'date-fns'

export default function DashboardEquipmentTrendChart({
  data,
  target,
}: {
  data: any[]
  target: number
}) {
  const chartConfig = {
    absenteismo: {
      label: 'Indisponibilidade (%)',
      color: 'hsl(var(--primary))',
    },
  }

  return (
    <Card className="shadow-subtle border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base lg:text-lg font-bold">
          Evolução Diária - Indisponibilidade
        </CardTitle>
        <CardDescription>
          Acompanhamento diário da taxa de equipamentos indisponíveis no período
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full mt-4">
          {data && data.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => format(parseISO(val), 'dd/MM')}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}%`}
                  dx={-10}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ReferenceLine
                  y={target}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="3 3"
                  label={{
                    position: 'top',
                    value: 'Meta',
                    fill: 'hsl(var(--destructive))',
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="absenteismo"
                  stroke="var(--color-absenteismo)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'var(--color-absenteismo)', strokeWidth: 0 }}
                  activeDot={{
                    r: 6,
                    fill: 'var(--color-absenteismo)',
                    stroke: 'hsl(var(--background))',
                    strokeWidth: 2,
                  }}
                >
                  <LabelList
                    dataKey="absenteismo"
                    position="top"
                    offset={12}
                    className="fill-foreground font-medium"
                    fontSize={11}
                    formatter={(val: number) => `${val}%`}
                  />
                </Line>
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Sem dados no período
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
