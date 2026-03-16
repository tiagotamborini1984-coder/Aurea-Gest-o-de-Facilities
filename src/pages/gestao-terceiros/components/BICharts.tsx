import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Line, LineChart, Cell } from 'recharts'
import { cn } from '@/lib/utils'

export function ChartPlants({
  data,
  onPlantClick,
  selectedPlantId,
}: {
  data: any[]
  onPlantClick: (id: string) => void
  selectedPlantId: string | null
}) {
  return (
    <div className="h-[300px] w-full mt-2">
      <ChartContainer
        config={{
          presenca: { color: 'hsl(var(--primary))', label: 'Taxa Presença' },
          absenteismo: { color: 'hsl(var(--destructive))', label: 'Absenteísmo' },
        }}
        className="h-full w-full"
      >
        <BarChart
          data={data}
          onClick={(e) => {
            if (e?.activePayload?.length) {
              onPlantClick(e.activePayload[0].payload.id)
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} />
          <YAxis tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="presenca" radius={[4, 4, 0, 0]} barSize={40} cursor="pointer">
            {data.map((entry, index) => (
              <Cell
                key={`cell-pres-${index}`}
                fill="var(--color-presenca)"
                className={cn(
                  'transition-opacity duration-300',
                  selectedPlantId && selectedPlantId !== entry.id ? 'opacity-30' : 'opacity-100',
                )}
              />
            ))}
          </Bar>
          <Bar dataKey="absenteismo" radius={[4, 4, 0, 0]} barSize={40} cursor="pointer">
            {data.map((entry, index) => (
              <Cell
                key={`cell-abs-${index}`}
                fill="var(--color-absenteismo)"
                className={cn(
                  'transition-opacity duration-300',
                  selectedPlantId && selectedPlantId !== entry.id ? 'opacity-30' : 'opacity-100',
                )}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Dica: Clique em uma coluna para filtrar os rankings.
      </p>
    </div>
  )
}

export function ChartTrend({ data }: { data: any[] }) {
  return (
    <div className="h-[300px] w-full mt-2">
      <ChartContainer
        config={{ disp: { color: '#10b981', label: 'Disponibilidade (%)' } }}
        className="h-full w-full"
      >
        <LineChart data={data}>
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
    </div>
  )
}
