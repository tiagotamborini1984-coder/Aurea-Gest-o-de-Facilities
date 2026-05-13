import { StrategicData } from '@/hooks/use-dashboard-estrategico'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sparkles,
  Users,
  Wrench,
  AlertTriangle,
  DollarSign,
  Leaf,
  Home,
  TrendingDown,
} from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts'
import { cn } from '@/lib/utils'

export function PlantMetrics({ data }: { data: StrategicData }) {
  const { metrics, insights } = data

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Absenteísmo"
          icon={Users}
          value={`${metrics.absenteismo.taxa.toFixed(1)}%`}
          trend="Média diária"
          color="text-blue-600"
        />
        <MetricCard
          title="Tarefas Concluídas"
          icon={Wrench}
          value={metrics.tarefas.concluidas}
          trend={`${metrics.tarefas.atrasadas} atrasadas`}
          color="text-green-600"
        />
        <MetricCard
          title="Acidentes"
          icon={AlertTriangle}
          value={metrics.acidentes.total}
          trend="No período"
          color="text-amber-500"
        />
        <MetricCard
          title="Budget Usado"
          icon={DollarSign}
          value={`${((metrics.budget.realizado / metrics.budget.orcado) * 100).toFixed(1)}%`}
          trend={formatCurrency(metrics.budget.realizado)}
          color="text-purple-600"
        />
        <MetricCard
          title="Limpeza"
          icon={Leaf}
          value={metrics.limpeza.concluidas}
          trend={`${metrics.limpeza.pendentes} pendentes`}
          color="text-emerald-500"
        />
        <MetricCard
          title="Ocupação Imóveis"
          icon={Home}
          value={`${metrics.imoveis.ocupacao.toFixed(1)}%`}
          trend="Capacidade"
          color="text-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-gray-100">
          <CardHeader>
            <CardTitle className="text-gray-800 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-gray-500" />
              Evolução do Absenteísmo Diário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: 'Absenteísmo %', color: 'hsl(var(--chart-1))' } }}
              className="h-[300px] w-full"
            >
              <LineChart
                data={metrics.absenteismo.evolution}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'var(--color-value)' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-100 bg-gradient-to-br from-brand-deepBlue to-brand-vividBlue text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-yellow-300" />
              Insights da IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/10"
              >
                <p className="text-sm text-blue-50 leading-relaxed">{insight}</p>
              </div>
            ))}
            <div className="pt-2">
              <div className="text-xs text-blue-200 uppercase tracking-wider font-semibold mb-2">
                Diagnóstico Geral
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-green-400 w-[85%] rounded-full" />
                </div>
                <span className="text-sm font-medium">85% Saúde</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-gray-100">
          <CardHeader>
            <CardTitle className="text-gray-800">Status de Tarefas de Manutenção</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ChartContainer
              config={{
                concluidas: { label: 'Concluídas', color: '#10b981' },
                pendentes: { label: 'Pendentes', color: '#f59e0b' },
                atrasadas: { label: 'Atrasadas', color: '#ef4444' },
              }}
              className="h-[250px] w-full"
            >
              <RechartsPieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={[
                    { name: 'Concluídas', value: metrics.tarefas.concluidas },
                    { name: 'Pendentes', value: metrics.tarefas.pendentes },
                    { name: 'Atrasadas', value: metrics.tarefas.atrasadas },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
              </RechartsPieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-100">
          <CardHeader>
            <CardTitle className="text-gray-800">Execução Financeira (Budget)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                orcado: { label: 'Orçado', color: 'hsl(var(--chart-2))' },
                realizado: { label: 'Realizado', color: 'hsl(var(--chart-1))' },
              }}
              className="h-[250px] w-full"
            >
              <BarChart
                data={[
                  {
                    name: 'Budget Mensal',
                    orcado: metrics.budget.orcado,
                    realizado: metrics.budget.realizado,
                  },
                ]}
                margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$${value / 1000}k`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="orcado" fill="var(--color-orcado)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realizado" fill="var(--color-realizado)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  icon: Icon,
  value,
  trend,
  color,
}: {
  title: string
  icon: any
  value: string | number
  trend: string
  color: string
}) {
  return (
    <Card className="shadow-sm border-gray-100 transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={cn('p-2 rounded-lg bg-gray-50', color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">{trend}</p>
        </div>
      </CardContent>
    </Card>
  )
}
