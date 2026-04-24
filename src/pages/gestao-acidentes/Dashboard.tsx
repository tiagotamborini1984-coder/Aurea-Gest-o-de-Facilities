import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts'
import { Brain, AlertOctagon, ShieldAlert, Activity } from 'lucide-react'

export default function DashboardAcidentes() {
  const { activeClient, activePlant } = useAppStore()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!activeClient) return
      let query = supabase.from('accidents').select('*').eq('client_id', activeClient.id)
      if (activePlant && activePlant !== 'all') {
        query = query.eq('plant_id', activePlant)
      }
      const { data: acc } = await query
      if (acc) setData(acc)
      setLoading(false)
    }
    fetchData()
  }, [activeClient, activePlant])

  const severityCount = data.reduce(
    (acc, curr) => {
      acc[curr.severity] = (acc[curr.severity] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const pieData = Object.keys(severityCount).map((key) => ({
    name: key,
    value: severityCount[key],
    fill: key === 'Grave' ? '#ef4444' : key === 'Moderado' ? '#f59e0b' : '#3b82f6',
  }))

  const deptCount = data.reduce(
    (acc, curr) => {
      acc[curr.department] = (acc[curr.department] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const barData = Object.keys(deptCount).map((key) => ({
    name: key,
    total: deptCount[key],
  }))

  const getAIAnalysis = () => {
    if (data.length === 0)
      return 'Ainda não há dados suficientes de acidentes para gerar uma análise preditiva ou diagnóstica.'

    const topDept = Object.keys(deptCount).sort((a, b) => deptCount[b] - deptCount[a])[0]
    const graveCount = severityCount['Grave'] || 0
    const mostAffectedLocation = data.reduce(
      (acc, curr) => {
        acc[curr.location] = (acc[curr.location] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    const topLocation = Object.keys(mostAffectedLocation).sort(
      (a, b) => mostAffectedLocation[b] - mostAffectedLocation[a],
    )[0]

    return `Identificamos que o departamento de "${topDept}" apresenta a maior incidência de eventos adversos, com destaque para o local "${topLocation}". ${graveCount > 0 ? `Atenção crítica: registramos ${graveCount} acidentes classificados como GRAVES. É imperativo focar em ações preventivas imediatas.` : 'Até o momento, a maioria dos eventos é de severidade Leve/Moderada.'} Recomendamos revisar as condições físicas de "${topLocation}" e instaurar uma reciclagem das normas de segurança para as equipes afetadas.`
  }

  const chartConfig = {
    acidentes: { label: 'Acidentes', color: 'hsl(var(--primary))' },
  }

  const pieConfig = {
    Grave: { label: 'Grave', color: '#ef4444' },
    Moderado: { label: 'Moderado', color: '#f59e0b' },
    Leve: { label: 'Leve', color: '#3b82f6' },
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Gestão de Acidentes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visão geral e indicadores de segurança do trabalho.
          </p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-brand-deepBlue to-blue-900 border-none shadow-lg text-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Brain className="w-5 h-5 text-blue-300" />
            Aurea Safety Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-50 leading-relaxed text-sm md:text-base">
            {loading ? 'Analisando dados...' : getAIAnalysis()}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total de Eventos</CardTitle>
            <Activity className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Acidentes Graves</CardTitle>
            <AlertOctagon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{severityCount['Grave'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Ações Preventivas</CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">Integrado</div>
            <p className="text-xs text-gray-500 mt-1">Veja no Painel de Chamados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Incidentes por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="var(--color-acidentes)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Classificação de Gravidade</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ChartContainer config={pieConfig} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
