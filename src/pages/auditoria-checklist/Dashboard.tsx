import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Loader2, ClipboardCheck, TrendingUp, Building2, LayoutList } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'

const COLORS = ['#1e3a8a', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#6366f1', '#ec4899']

export default function AuditoriaDashboard() {
  const { profile } = useAppStore()
  const { plants } = useMasterData()
  const hasAccess = useHasAccess('Auditoria e Checklist')

  const [executions, setExecutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [filterPlant, setFilterPlant] = useState('all')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('audit_executions')
        .select('*, audits!inner(*)')
        .eq('audits.client_id', profile.client_id)
      setExecutions(data || [])
      setLoading(false)
    }
    load()
  }, [profile])

  const filtered = useMemo(() => {
    return executions.filter((e) => {
      const matchP = filterPlant === 'all' || e.plant_id === filterPlant
      const matchT = filterType === 'all' || e.audits?.type === filterType
      return matchP && matchT
    })
  }, [executions, filterPlant, filterType])

  const kpis = useMemo(() => {
    const total = filtered.length
    const finished = filtered.filter((e) => e.status === 'Finalizado')
    const totalFinished = finished.length

    let sumPercentage = 0
    finished.forEach((e) => {
      if (e.max_score > 0) sumPercentage += (e.final_score / e.max_score) * 100
    })
    const avgScore = totalFinished > 0 ? (sumPercentage / totalFinished).toFixed(1) : '0'

    return { total, totalFinished, avgScore }
  }, [filtered])

  const plantData = useMemo(() => {
    const groups: any = {}
    filtered.forEach((e) => {
      const pName = plants.find((p) => p.id === e.plant_id)?.name || 'Outras'
      if (!groups[pName]) groups[pName] = { name: pName, value: 0 }
      groups[pName].value++
    })
    return Object.values(groups).sort((a: any, b: any) => b.value - a.value)
  }, [filtered, plants])

  const typeData = useMemo(() => {
    const groups: any = {}
    filtered.forEach((e) => {
      const tName = e.audits?.type || 'Sem Tipo'
      if (!groups[tName]) groups[tName] = { name: tName, value: 0 }
      groups[tName].value++
    })
    return Object.values(groups).sort((a: any, b: any) => b.value - a.value)
  }, [filtered])

  const typesAvailable = Array.from(new Set(executions.map((e) => e.audits?.type).filter(Boolean)))

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Dashboard de Auditorias
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Visão analítica de performance e execução.
          </p>
        </div>
        <div className="flex gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm w-full sm:w-auto">
          <Select value={filterPlant} onValueChange={setFilterPlant}>
            <SelectTrigger className="w-full sm:w-48 bg-slate-50 border-slate-200 h-9">
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
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-40 bg-slate-50 border-slate-200 h-9">
              <SelectValue placeholder="Tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              {typesAvailable.map((t) => (
                <SelectItem key={t as string} value={t as string}>
                  {t as string}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-deepBlue" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-sm border-gray-200 hover:shadow-md transition-all">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                  <ClipboardCheck className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Total de Auditorias
                  </p>
                  <h3 className="text-4xl font-black text-slate-800">{kpis.total}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-gray-200 hover:shadow-md transition-all">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                  <TrendingUp className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Score Médio (%)
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-slate-800">{kpis.avgScore}%</h3>
                    <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                      {kpis.totalFinished} concl.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-gray-200 hover:shadow-md transition-all">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                  <LayoutList className="h-7 w-7 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Pendentes
                  </p>
                  <h3 className="text-4xl font-black text-slate-800">
                    {kpis.total - kpis.totalFinished}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="bg-slate-50/50 border-b border-gray-200 py-4 flex flex-row items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-500" />
                <CardTitle className="text-lg text-slate-800 m-0">Volume por Planta</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={plantData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                      />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                      <Bar dataKey="value" fill="#1e3a8a" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="bg-slate-50/50 border-b border-gray-200 py-4 flex flex-row items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-slate-500" />
                <CardTitle className="text-lg text-slate-800 m-0">Distribuição por Tipo</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={typeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {typeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
