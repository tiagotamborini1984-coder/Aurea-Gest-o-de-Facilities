import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  LineChart,
  Cell,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import { cn } from '@/lib/utils'
import { GLOBAL_CHART_COLORS } from '@/lib/color-utils'

export function ChartPlants({ data, colors }: { data: any[]; colors: any }) {
  return (
    <div className="h-[300px] w-full mt-2">
      <ChartContainer
        config={{
          presenca: { color: colors.primary, label: 'Taxa Presença' },
          absenteismo: { color: colors.secondary, label: 'Absenteísmo' },
        }}
        className="h-full w-full"
      >
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} fontSize={10} />
          <YAxis tickLine={false} axisLine={false} fontSize={10} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="presenca" fill="var(--color-presenca)" radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="presenca"
              position="top"
              className="fill-slate-700 text-[9px]"
              formatter={(val: number) => `${val}%`}
            />
          </Bar>
          <Bar dataKey="absenteismo" fill="var(--color-absenteismo)" radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="absenteismo"
              position="top"
              className="fill-slate-700 text-[9px]"
              formatter={(val: number) => `${val}%`}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}

export function ChartLocalAbs({ data, colors }: { data: any[]; colors: any }) {
  return (
    <div className="h-[300px] w-full mt-2">
      <ChartContainer
        config={{ absenteismo: { color: colors.secondary, label: 'Absenteísmo %' } }}
        className="h-full w-full"
      >
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} />
          <YAxis
            dataKey="name"
            type="category"
            tickLine={false}
            axisLine={false}
            fontSize={10}
            width={100}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="absenteismo" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={GLOBAL_CHART_COLORS[index % GLOBAL_CHART_COLORS.length]}
              />
            ))}
            <LabelList
              dataKey="absenteismo"
              position="right"
              className="fill-slate-700 text-[10px]"
              formatter={(val: number) => `${val}%`}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}

export function ChartEqDisp({ data, colors }: { data: any[]; colors: any }) {
  return (
    <div className="h-[300px] w-full mt-2">
      <ChartContainer
        config={{ disp: { color: colors.tertiary, label: 'Disponibilidade %' } }}
        className="h-full w-full"
      >
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} fontSize={10} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={10} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="disp" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={GLOBAL_CHART_COLORS[index % GLOBAL_CHART_COLORS.length]}
              />
            ))}
            <LabelList
              dataKey="disp"
              position="top"
              className="fill-slate-700 text-[10px]"
              formatter={(val: number) => `${val}%`}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}

export function ChartComparativeAbs({
  data,
  locations,
  colors,
}: {
  data: any[]
  locations: any[]
  colors: any
}) {
  const lineColors = [colors.secondary, colors.primary, colors.tertiary, '#f59e0b', '#8b5cf6']
  return (
    <div className="h-[300px] w-full mt-2">
      <ChartContainer config={{}} className="h-full w-full">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            fontSize={10}
            angle={data.length > 7 ? -45 : 0}
            textAnchor={data.length > 7 ? 'end' : 'middle'}
            height={data.length > 7 ? 50 : 30}
          />
          <YAxis tickLine={false} axisLine={false} fontSize={10} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {locations.map((loc, i) => (
            <Line
              key={loc.id}
              type="monotone"
              dataKey={loc.name}
              stroke={lineColors[i % lineColors.length]}
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  )
}

export function ChartGoals({ data, colors }: { data: any[]; colors: any }) {
  return (
    <div className="h-[300px] w-full mt-2">
      <ChartContainer
        config={{ value: { color: colors.primary, label: 'Atingimento %' } }}
        className="h-full w-full"
      >
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} fontSize={10} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={10} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="value"
              position="top"
              className="fill-slate-700 text-[10px]"
              formatter={(val: number) => `${val}%`}
            />
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.value >= 80
                    ? colors.primary
                    : entry.value >= 50
                      ? colors.tertiary
                      : colors.secondary
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}
