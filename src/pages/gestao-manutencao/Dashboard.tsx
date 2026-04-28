import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Activity, Clock, Target, Filter, MapPin, CheckCircle2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  const [aderencia, setAderencia] = useState({ proativo: 0, reativo: 0, total: 0 })
  const [typeData, setTypeData] = useState<any[]>([])
  const [mttrData, setMttrData] = useState<any[]>([])

  const [plants, setPlants] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [selectedArea, setSelectedArea] = useState<string>('all')

  useEffect(() => {
    loadAuxData()
  }, [])
  useEffect(() => {
    fetchStats()
  }, [selectedPlant, selectedArea])

  const loadAuxData = async () => {
    const [pRes, aRes] = await Promise.all([
      supabase.from('plants').select('id, name').order('name'),
      supabase.from('maintenance_areas').select('id, name, plant_id').order('name'),
    ])
    if (pRes.data) setPlants(pRes.data)
    if (aRes.data) setAreas(aRes.data)
  }

  const fetchStats = async () => {
    setLoading(true)
    try {
      let query = supabase.from('maintenance_tickets').select(
        `id, status_id, planned_start, planned_end, actual_start, actual_end, origin, plant_id, area_id, reported_at, created_at, updated_at,
          status:maintenance_statuses(step, is_terminal),
          type:maintenance_types(name),
          priority:maintenance_priorities(sla_hours)`,
      )

      if (selectedPlant !== 'all') query = query.eq('plant_id', selectedPlant)
      if (selectedArea !== 'all') query = query.eq('area_id', selectedArea)

      const { data: tickets } = await query

      if (tickets) {
        const total = tickets.length
        const open = tickets.filter((t: any) => t.status?.step === 'Aberto' || !t.status).length
        const planned = tickets.filter(
          (t: any) => t.status?.step === 'Planejado' || t.planned_start,
        ).length
        const completed = tickets.filter(
          (t: any) => t.status?.step === 'Concluído' || t.status?.is_terminal,
        ).length
        setStats({ total, open, planned, completed })

        const now = new Date()
        let proativoTotal = 0
        let proativoNoPrazo = 0
        let reativoTotal = 0
        let reativoNoPrazo = 0

        let proativoExec = 0
        let reativoExec = 0

        const monthlyMttr: Record<string, any> = {}
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthName = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          monthlyMttr[key] = {
            label: monthName,
            proativoSoma: 0,
            proativoQtd: 0,
            reativoSoma: 0,
            reativoQtd: 0,
          }
        }

        tickets.forEach((t: any) => {
          const typeName = t.type?.name?.toLowerCase() || ''
          const isProativo = typeName.includes('proativo') || typeName.includes('prev')
          const isReativo = typeName.includes('reativo') || typeName.includes('corr')

          if (!isProativo && !isReativo) return

          const reportedAt = new Date(t.reported_at || t.created_at)
          const slaHours = t.priority?.sla_hours || 0

          let limitDate = new Date(reportedAt.getTime() + slaHours * 60 * 60 * 1000)

          if (t.planned_end && isProativo) {
            limitDate = new Date(t.planned_end)
          }

          const isTerminal = t.status?.is_terminal || t.status?.step === 'Concluído'
          const endDate = t.actual_end
            ? new Date(t.actual_end)
            : isTerminal
              ? new Date(t.updated_at)
              : now

          const withinSLA = endDate <= limitDate

          if (t.planned_end || slaHours > 0) {
            if (isProativo) {
              proativoTotal++
              if (withinSLA) proativoNoPrazo++
            }
            if (isReativo) {
              reativoTotal++
              if (withinSLA) reativoNoPrazo++
            }
          }

          if (isTerminal) {
            if (isProativo) proativoExec++
            if (isReativo) reativoExec++

            const finalDate = t.actual_end ? new Date(t.actual_end) : new Date(t.updated_at)
            const monthKey = `${finalDate.getFullYear()}-${String(finalDate.getMonth() + 1).padStart(2, '0')}`
            if (monthlyMttr[monthKey]) {
              const repairHours = (finalDate.getTime() - reportedAt.getTime()) / (1000 * 60 * 60)
              if (isProativo) {
                monthlyMttr[monthKey].proativoSoma += Math.max(0, repairHours)
                monthlyMttr[monthKey].proativoQtd++
              }
              if (isReativo) {
                monthlyMttr[monthKey].reativoSoma += Math.max(0, repairHours)
                monthlyMttr[monthKey].reativoQtd++
              }
            }
          }
        })

        const adProativo = proativoTotal > 0 ? (proativoNoPrazo / proativoTotal) * 100 : 0
        const adReativo = reativoTotal > 0 ? (reativoNoPrazo / reativoTotal) * 100 : 0
        const adTotal =
          proativoTotal + reativoTotal > 0
            ? ((proativoNoPrazo + reativoNoPrazo) / (proativoTotal + reativoTotal)) * 100
            : 0

        setAderencia({ proativo: adProativo, reativo: adReativo, total: adTotal })

        const newTypeData = []
        if (proativoExec > 0)
          newTypeData.push({ name: 'Proativo (Prev.)', value: proativoExec, color: '#3b82f6' })
        if (reativoExec > 0)
          newTypeData.push({ name: 'Reativo (Corr.)', value: reativoExec, color: '#ef4444' })

        if (newTypeData.length === 0) {
          newTypeData.push({ name: 'Sem dados', value: 1, color: '#e5e7eb' })
        }
        setTypeData(newTypeData)

        const newMttrData = Object.values(monthlyMttr).map((m: any) => ({
          name: m.label.charAt(0).toUpperCase() + m.label.slice(1),
          Proativo: m.proativoQtd > 0 ? Number((m.proativoSoma / m.proativoQtd).toFixed(1)) : 0,
          Reativo: m.reativoQtd > 0 ? Number((m.reativoSoma / m.reativoQtd).toFixed(1)) : 0,
        }))
        setMttrData(newMttrData)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Activity className="h-8 w-8 text-brand-vividBlue" />
            Dashboard de Manutenção
          </h1>
          <p className="text-gray-500 mt-1">Indicadores e KPIs de performance</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select
            value={selectedPlant}
            onValueChange={(v) => {
              setSelectedPlant(v)
              setSelectedArea('all')
            }}
          >
            <SelectTrigger className="w-[180px] bg-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Plantas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Plantas</SelectItem>
              {plants.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedArea} onValueChange={setSelectedArea}>
            <SelectTrigger className="w-[180px] bg-white">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Áreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Áreas</SelectItem>
              {areas
                .filter((a) => selectedPlant === 'all' || a.plant_id === selectedPlant)
                .map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
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
            <CardTitle className="text-sm font-medium text-gray-500">Planejados</CardTitle>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              MTTR (Tempo Médio de Reparo - em horas)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                Carregando...
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-gray-500" />
              Taxa de Execução
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col items-center justify-center">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                Carregando...
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Aderência à Prog.
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                Carregando...
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-6">
                <div>
                  <div className="text-5xl font-bold text-gray-900">
                    {aderencia.total.toFixed(0)}%
                  </div>
                  <p className="text-sm text-gray-500 mt-1">SLA Respeitado (Geral)</p>
                </div>

                <div className="w-full">
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-gray-600">Meta: 90%</span>
                    <span className={aderencia.total >= 90 ? 'text-green-600' : 'text-amber-600'}>
                      {aderencia.total >= 90 ? 'Atingida' : 'Abaixo da meta'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all duration-500',
                        aderencia.total >= 90 ? 'bg-green-500' : 'bg-amber-500',
                      )}
                      style={{ width: `${Math.min(aderencia.total, 100)}%` }}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-gray-600">Proativos</span>
                        <span className="text-blue-600">{aderencia.proativo.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(aderencia.proativo, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-gray-600">Reativos</span>
                        <span className="text-red-500">{aderencia.reativo.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(aderencia.reativo, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
