import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2 } from 'lucide-react'
import { PpeItemsTab } from './PpeItemsTab'
import { PpeLoansTab } from './PpeLoansTab'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'

export default function GestaoEPIs() {
  const { activeClient, profile, selectedPlant, setSelectedPlant } = useAppStore()
  const [plants, setPlants] = useState<any[]>([])

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
        })
  }, [clientId, profile])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de EPIs</h1>
          <p className="text-slate-500 text-sm">
            Controle de estoque e empréstimos de Equipamentos de Proteção Individual
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" />
          <Select value={selectedPlant} onValueChange={(v) => setSelectedPlant(v)}>
            <SelectTrigger className="w-[220px]">
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
      </div>
      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Inventário EPI</TabsTrigger>
          <TabsTrigger value="loans">Empréstimos</TabsTrigger>
        </TabsList>
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
