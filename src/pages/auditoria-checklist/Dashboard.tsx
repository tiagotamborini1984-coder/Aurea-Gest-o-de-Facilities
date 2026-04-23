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
  LabelList,
} from 'recharts'
import { GLOBAL_CHART_COLORS } from '@/lib/color-utils'
import {
  Loader2,
  ClipboardCheck,
  TrendingUp,
  Building2,
  LayoutList,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'

export default function AuditoriaDashboard() {
  const { profile } = useAppStore()
  const { plants } = useMasterData()
  const hasAccess = useHasAccess('Auditoria e Checklist')

  const [executions, setExecutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [filterPlant, setFilterPlant] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterTitle, setFilterTitle] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      setLoading(true)
      let query = supabase
        .from('audit_executions')
        .select('*, audits!inner(*)')
        .eq('audits.client_id', profile.client_id)

      if (profile.role !== 'Administrador' && profile.role !== 'Master') {
        const authPlants = profile.authorized_plants || []
        if (authPlants.length > 0) {
          query = query.in('plant_id', authPlants)
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000')
        }
      }

      const { data } = await query
      setExecutions(data || [])
      setLoading(false)
    }
    load()
  }, [profile])

  const filtered = useMemo(() => {
    return executions.filter((e) => {
      const matchP = filterPlant === 'all' || e.plant_id === filterPlant
      const matchT = filterType === 'all' || e.audits?.type === filterType
      const matchTitle = filterTitle === 'all' || e.audits?.title === filterTitle

      let matchDate = true
      if (dateRange?.from) {
        const itemDate = new Date(e.created_at)
        if (itemDate < dateRange.from) matchDate = false

        if (!dateRange.to) {
          const toDate = new Date(dateRange.from)
          toDate.setHours(23, 59, 59, 999)
          if (itemDate > toDate) matchDate = false
        }
      }
      if (dateRange?.to) {
        const itemDate = new Date(e.created_at)
        const toDate = new Date(dateRange.to)
        toDate.setHours(23, 59, 59, 999)
        if (itemDate > toDate) matchDate = false
      }

      return matchP && matchT && matchTitle && matchDate
    })
  }, [executions, filterPlant, filterType, filterTitle, dateRange])

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
  const titlesAvailable = Array.from(
    new Set(executions.map((e) => e.audits?.title).filter(Boolean)),
  )

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
        <div className="flex flex-wrap gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm w-full sm:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full sm:w-auto min-w-[200px] justify-start text-left font-normal bg-slate-50 border-slate-200 h-9',
                  !dateRange && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd/MM/yy')} - {format(dateRange.to, 'dd/MM/yy')}
                    </>
                  ) : (
                    format(dateRange.from, 'dd/MM/yy')
                  )
                ) : (
                  <span>Período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Select value={filterPlant} onValueChange={setFilterPlant}>
            <SelectTrigger className="w-full sm:w-40 bg-slate-50 border-slate-200 h-9">
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
            <SelectTrigger className="w-full sm:w-36 bg-slate-50 border-slate-200 h-9">
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

          <Select value={filterTitle} onValueChange={setFilterTitle}>
            <SelectTrigger className="w-full sm:w-48 bg-slate-50 border-slate-200 h-9">
              <SelectValue placeholder="Títulos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Títulos</SelectItem>
              {titlesAvailable.map((t) => (
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
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                        {plantData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={GLOBAL_CHART_COLORS[index % GLOBAL_CHART_COLORS.length]}
                          />
                        ))}
                        <LabelList
                          dataKey="value"
                          position="top"
                          className="fill-slate-700 font-medium text-[11px]"
                        />
                      </Bar>
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
                          <Cell
                            key={`cell-${index}`}
                            fill={GLOBAL_CHART_COLORS[index % GLOBAL_CHART_COLORS.length]}
                          />
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
