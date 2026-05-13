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
  Medal,
} from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'

export function PlantMetrics({ data }: { data: StrategicData }) {
  const { metrics, insights, rankings, plant } = data
  const isConsolidated = plant.id === 'all'

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Resumo Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Absenteísmo"
          icon={Users}
          value={`${metrics.terceiros.absenteismo.toFixed(1)}%`}
          trend="Média diária"
          color="text-blue-600"
        />
        <MetricCard
          title="Tarefas Concluídas"
          icon={Wrench}
          value={metrics.tarefas.concluidas}
          trend={`${metrics.tarefas.atrasadas} atrasadas`}
          color="text-emerald-600"
        />
        <MetricCard
          title="Acidentes"
          icon={AlertTriangle}
          value={metrics.acidentes.total}
          trend="No período"
          color="text-amber-500"
        />
        <MetricCard
          title="Budget Realizado"
          icon={DollarSign}
          value={formatCurrency(metrics.budget.realizado)}
          trend={`${((metrics.budget.realizado / (metrics.budget.orcado || 1)) * 100).toFixed(1)}% do orçado`}
          color="text-purple-600"
        />
        <MetricCard
          title="Limpeza"
          icon={Leaf}
          value={metrics.limpeza.concluidas}
          trend={`${metrics.limpeza.pendentes} pendentes`}
          color="text-green-500"
        />
        <MetricCard
          title="Ocupação Imóveis"
          icon={Home}
          value={`${metrics.imoveis.ocupacao.toFixed(1)}%`}
          trend="Capacidade"
          color="text-indigo-500"
        />
      </div>

      {/* Rankings na Visão Consolidada */}
      {isConsolidated && rankings && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
          <RankingCard
            title="Menor Absenteísmo"
            data={rankings.absenteismo}
            valueFormatter={(v) => `${v.toFixed(1)}%`}
          />
          <RankingCard
            title="Mais Tarefas Concluídas"
            data={rankings.tarefas}
            valueFormatter={(v) => v.toString()}
          />
          <RankingCard
            title="Maior Uso do Budget"
            data={rankings.budget}
            valueFormatter={(v) => `${v.toFixed(1)}%`}
          />
        </div>
      )}

      {/* Análise por Módulos */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-brand-vividBlue" />
          Análise Detalhada por Módulo
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ModuleCard title="Gestão de Terceiros" icon={Users} color="bg-blue-50 text-blue-600">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Headcount</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.terceiros.headcount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Taxa de Absenteísmo</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.terceiros.absenteismo.toFixed(1)}%
                </p>
              </div>
            </div>
            <InsightList items={insights.terceiros} />
          </ModuleCard>

          <ModuleCard
            title="Gestão de Tarefas"
            icon={Wrench}
            color="bg-emerald-50 text-emerald-600"
          >
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Concluídas</p>
                <p className="text-2xl font-bold text-emerald-600">{metrics.tarefas.concluidas}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold text-amber-500">{metrics.tarefas.pendentes}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Atrasadas</p>
                <p className="text-2xl font-bold text-red-500">{metrics.tarefas.atrasadas}</p>
              </div>
            </div>
            <InsightList items={insights.tarefas} />
          </ModuleCard>

          <ModuleCard
            title="Gestão de Budget"
            icon={DollarSign}
            color="bg-purple-50 text-purple-600"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Orçado</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(metrics.budget.orcado)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Realizado</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(metrics.budget.realizado)}
                </p>
              </div>
            </div>
            <InsightList items={insights.budget} />
          </ModuleCard>

          <ModuleCard title="Limpeza e Jardinagem" icon={Leaf} color="bg-green-50 text-green-600">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Concluídas</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.limpeza.concluidas}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.limpeza.pendentes}</p>
              </div>
            </div>
            <InsightList items={insights.limpeza} />
          </ModuleCard>

          <ModuleCard
            title="Gestão de Acidentes"
            icon={AlertTriangle}
            color="bg-amber-50 text-amber-600"
          >
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.acidentes.total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Leves</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {metrics.acidentes.gravidade.leve}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Moderados</p>
                <p className="text-2xl font-bold text-orange-600">
                  {metrics.acidentes.gravidade.moderado}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Graves</p>
                <p className="text-2xl font-bold text-red-600">
                  {metrics.acidentes.gravidade.grave}
                </p>
              </div>
            </div>
            <InsightList items={insights.acidentes} />
          </ModuleCard>

          <ModuleCard title="Gestão de Imóveis" icon={Home} color="bg-indigo-50 text-indigo-600">
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Taxa de Ocupação Média</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.imoveis.ocupacao.toFixed(1)}%
                </p>
              </div>
            </div>
            <InsightList items={insights.imoveis} />
          </ModuleCard>
        </div>
      </div>

      {/* Gráfico e IA Geral */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-gray-100">
          <CardHeader>
            <CardTitle className="text-gray-800 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-gray-500" />
              Evolução do Absenteísmo Diário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: 'Absenteísmo %', color: 'hsl(var(--chart-1))' } }}
              className="h-[250px] w-full"
            >
              <LineChart
                data={metrics.terceiros.evolution}
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
              Diagnóstico Estratégico Global (IA)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InsightList items={insights.geral} textClass="text-blue-50 text-base" />
            <div className="pt-6">
              <div className="text-xs text-blue-200 uppercase tracking-wider font-semibold mb-2">
                Saúde Operacional
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
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={cn('p-2 rounded-lg bg-gray-50', color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 truncate">{trend}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function RankingCard({
  title,
  data,
  valueFormatter,
}: {
  title: string
  data: { plantName: string; value: number }[]
  valueFormatter: (v: number) => string
}) {
  return (
    <Card className="shadow-sm border-gray-100 bg-gray-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-800 flex items-center gap-2 uppercase tracking-wide">
          <Medal className="h-4 w-4 text-brand-vividBlue" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 mt-2">
          {data.slice(0, 5).map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center text-sm border-b border-gray-200/50 pb-2 last:border-0 last:pb-0"
            >
              <span className="flex items-center gap-2">
                <span className="text-gray-400 font-mono w-4">{idx + 1}.</span>
                <span
                  className="font-medium text-gray-700 truncate max-w-[150px]"
                  title={item.plantName}
                >
                  {item.plantName}
                </span>
              </span>
              <span className="font-semibold text-gray-900">{valueFormatter(item.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ModuleCard({
  title,
  icon: Icon,
  color,
  children,
}: {
  title: string
  icon: any
  color: string
  children: React.ReactNode
}) {
  return (
    <Card className="shadow-sm border-gray-100 hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0 border-b border-gray-50">
        <CardTitle className="text-base text-gray-800 font-semibold">{title}</CardTitle>
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex-1">{children}</CardContent>
    </Card>
  )
}

function InsightList({
  items,
  textClass = 'text-gray-600',
}: {
  items: string[]
  textClass?: string
}) {
  if (!items || items.length === 0) return null
  return (
    <ul className="space-y-2 mt-4 pt-4 border-t border-black/5">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2 text-sm leading-relaxed">
          <Sparkles className="h-4 w-4 shrink-0 text-brand-vividBlue mt-0.5 opacity-70" />
          <span className={textClass}>{item}</span>
        </li>
      ))}
    </ul>
  )
}
