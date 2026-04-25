import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { Activity, Clock, Target } from 'lucide-react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export default function DashboardManutencao() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, open: 0, planned: 0, completed: 0 })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const { data: tickets } = await supabase
        .from('maintenance_tickets')
        .select('id, status_id, planned_start, origin, status:maintenance_statuses(step)')

      if (tickets) {
        const total = tickets.length
        const open = tickets.filter((t) => t.status?.step === 'Aberto' || !t.status).length
        const planned = tickets.filter(
          (t) => t.status?.step === 'Planejado' || t.planned_start,
        ).length
        const completed = tickets.filter((t) => t.status?.step === 'Concluído').length
        setStats({ total, open, planned, completed })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const typeData = [
    { name: 'Proativo (Prev.)', value: 65, color: '#3b82f6' },
    { name: 'Reativo (Corr.)', value: 35, color: '#ef4444' },
  ]

  const mttrData = [
    { name: 'Jan', Proativo: 2.4, Reativo: 14.5 },
    { name: 'Fev', Proativo: 2.1, Reativo: 12.0 },
    { name: 'Mar', Proativo: 2.8, Reativo: 15.2 },
    { name: 'Abr', Proativo: 1.9, Reativo: 11.5 },
    { name: 'Mai', Proativo: 2.0, Reativo: 10.8 },
  ]

  if (loading)
    return <div className="p-8 text-center text-gray-500">Carregando painel gerencial...</div>

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Activity className="h-8 w-8 text-brand-vividBlue" />
          Dashboard de Manutenção
        </h1>
        <p className="text-gray-500 mt-1">Indicadores e KPIs de performance (estilo CMMS)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total de Chamados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Em Aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.open}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Planejados (Agenda)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.planned}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Concluídos (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              MTTR (Tempo Médio de Reparo - em horas)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mttrData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Legend />
                <Bar dataKey="Proativo" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Reativo" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-gray-500" />
              Taxa de Execução
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
