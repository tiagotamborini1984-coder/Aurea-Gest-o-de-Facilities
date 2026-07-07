import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Building2, CalendarDays } from 'lucide-react'
import { PpeItemsTab } from './PpeItemsTab'
import { PpeLoansTab } from './PpeLoansTab'
import { PpeDashboardTab } from './PpeDashboardTab'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'

export default function GestaoEPIs() {
  const { activeClient, profile, selectedPlant, setSelectedPlant } = useAppStore()
  const [plants, setPlants] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const clientId = activeClient?.id || profile?.client_id

  useEffect(() => {
    if (!clientId)
      return supabase
        .from('plants')
        .select('id, name')
        .eq('client_id', clientId)
        .order('name')
        .then(({ data }) => {
          if (!data) return
          let filtered = data
          if (profile && profile.role !== 'Master' && profile.role !== 'Administrador') {
            const auth = (profile as any).authorized_plants || []
            filtered = data.filter((p: any) => auth.includes(p.id))
          }
          setPlants(filtered)
          if (filtered.length === 1) {
            setSelectedPlant(filtered[0].id)
          }
        })
  }, [clientId, profile, setSelectedPlant])

  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    setEndDate(end.toISOString().split('T')[0])
    setStartDate(start.toISOString().split('T')[0])
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de EPIs</h1>
          <p className="text-slate-500 text-sm">
            Controle de estoque e empréstimos de Equipamentos de Proteção Individual
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
            <Select value={selectedPlant} onValueChange={(v) => setSelectedPlant(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas as Unidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Unidades</SelectItem>
                {plants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {activeTab === 'dashboard' && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[150px]"
              />
              <span className="text-slate-400 text-sm">até</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
          )}
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="items">Inventário EPI</TabsTrigger>
          <TabsTrigger value="loans">Empréstimos</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4">
          <PpeDashboardTab startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="items" className="mt-4">
          <PpeItemsTab />
        </TabsContent>
        <TabsContent value="loans" className="mt-4">
          <PpeLoansTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
