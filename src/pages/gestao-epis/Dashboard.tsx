import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarDays, Building2 } from 'lucide-react'
import { PpeItemsTab } from './PpeItemsTab'
import { PpeLoansTab } from './PpeLoansTab'
import { PpeDashboardTab } from './PpeDashboardTab'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'

interface PlantOption {
  id: string
  name: string
}

export default function GestaoEPIs() {
  const { activeClient, profile } = useAppStore()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [plants, setPlants] = useState<PlantOption[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>('all')

  const clientId = activeClient?.id || profile?.client_id

  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    setEndDate(end.toISOString().split('T')[0])
    setStartDate(start.toISOString().split('T')[0])
  }, [])

  const fetchPlants = useCallback(async () => {
    if (!clientId || !profile) return

    try {
      let plantList: PlantOption[] = []

      if (profile.role === 'Master' || profile.role === 'Administrador') {
        const { data } = await supabase
          .from('plants')
          .select('id, name')
          .eq('client_id', clientId)
          .order('name')
        plantList = (data as PlantOption[]) || []
      } else {
        const { data: plantIds } = await supabase.rpc('get_user_authorized_plants')
        const ids = (plantIds as string[]) || []
        if (ids.length > 0) {
          const { data } = await supabase
            .from('plants')
            .select('id, name')
            .eq('client_id', clientId)
            .in('id', ids)
            .order('name')
          plantList = (data as PlantOption[]) || []
        }
      }

      setPlants(plantList)

      if (plantList.length === 1) {
        setSelectedPlant(plantList[0].id)
      } else if (plantList.length > 1) {
        setSelectedPlant('all')
      }
    } catch {
      setPlants([])
    }
  }, [clientId, profile])

  useEffect(() => {
    fetchPlants()
  }, [fetchPlants])

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
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-500 leading-none">Planta</span>
              <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione a planta" />
                </SelectTrigger>
                <SelectContent>
                  {plants.length > 1 && (
                    <SelectItem value="all">Todas as Plantas Autorizadas</SelectItem>
                  )}
                  {plants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {activeTab === 'dashboard' && (
            <>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-slate-500 leading-none">Data Inicial</span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-[150px]"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-500 leading-none">Data Final</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[150px]"
                />
              </div>
            </>
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
          <PpeDashboardTab startDate={startDate} endDate={endDate} plantId={selectedPlant} />
        </TabsContent>
        <TabsContent value="items" className="mt-4">
          <PpeItemsTab plantId={selectedPlant} plants={plants} />
        </TabsContent>
        <TabsContent value="loans" className="mt-4">
          <PpeLoansTab plantId={selectedPlant} plants={plants} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
