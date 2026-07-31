import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bar, BarChart, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart as PieIcon, Users, CalendarCheck, Clock, CheckCircle2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { getMonthlyVacationCounts, getVacations } from '@/services/vacations'
import type { Vacation } from '@/services/vacations'
import { RegisteredVacations } from '@/pages/ferias/components/RegisteredVacations'

export default function FeriasDashboard() {
  const { activeClient } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [plants, setPlants] = useState<any[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [allVacations, setAllVacations] = useState<Vacation[]>([])

  const loadPlants = useCallback(async () => {
    const { data } = await supabase.from('plants').select('id, name').order('name')
    if (data) setPlants(data)
  }, [])

  const loadData = useCallback(async () => {
    if (!activeClient) return
    setLoading(true)
    try {
      const [monthly, vacs] = await Promise.all([
        getMonthlyVacationCounts(activeClient.id, selectedYear, selectedPlant),
        getVacations(activeClient.id, selectedPlant),
      ])
      setMonthlyData(monthly)
      setAllVacations(vacs)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [activeClient, selectedYear, selectedPlant])

  useEffect(() => {
    loadPlants()
  }, [loadPlants])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalScheduled = allVacations.filter((v) => v.status === 'scheduled').length
  const totalApproved = allVacations.filter((v) => v.status === 'approved').length
  const totalCompleted = allVacations.filter((v) => v.status === 'completed').length

  const chartConfig = {
    scheduled: { label: 'Agendado', color: '#eab308' },
    approved: { label: 'Aprovado', color: '#22c55e' },
    completed: { label: 'Concluído', color: '#ef4444' },
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <PieIcon className="h-8 w-8 text-brand-vividBlue" />
            Dashboard de Gestão de Férias
          </h1>
          <p className="text-gray-500 mt-1">Visão geral das férias por mês</p>
        </div>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Planta</Label>
            <Select value={selectedPlant} onValueChange={setSelectedPlant}>
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue placeholder="Planta" />
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
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Ano</Label>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[120px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-yellow-400 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" /> Agendados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalScheduled}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-green-500" /> Aprovados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalApproved}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-red-500" /> Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalCompleted}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            Colaboradores em Férias por Mês ({selectedYear})
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              Carregando...
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="w-full h-full min-h-[350px]">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="scheduled" name="Agendado" fill="#eab308" radius={[4, 4, 0, 0]} />
                <Bar dataKey="approved" name="Aprovado" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Concluído" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <RegisteredVacations clientId={activeClient?.id || ''} plantId={selectedPlant} />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Resumo Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-gray-400 py-8">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="p-3 text-left font-semibold text-slate-700">Mês</th>
                    <th className="p-3 text-center font-semibold text-slate-700">Total</th>
                    <th className="p-3 text-center font-semibold text-yellow-600">Agendados</th>
                    <th className="p-3 text-center font-semibold text-green-600">Aprovados</th>
                    <th className="p-3 text-center font-semibold text-red-600">Concluídos</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((m, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-700">{m.month}</td>
                      <td className="p-3 text-center font-bold text-slate-900">{m.count}</td>
                      <td className="p-3 text-center text-yellow-600">{m.scheduled}</td>
                      <td className="p-3 text-center text-green-600">{m.approved}</td>
                      <td className="p-3 text-center text-red-600">{m.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
