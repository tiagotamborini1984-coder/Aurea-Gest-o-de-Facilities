import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { Archive, UserCheck, UserMinus } from 'lucide-react'

export default function DashboardLockers() {
  const { activeClient } = useAppStore()
  const [plants, setPlants] = useState<any[]>([])
  const [locations, setLocations] = useState<string[]>([])

  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [selectedLocation, setSelectedLocation] = useState<string>('all')

  const [stats, setStats] = useState({ total: 0, occupied: 0, available: 0 })

  useEffect(() => {
    if (activeClient) {
      fetchPlants()
    }
  }, [activeClient])

  useEffect(() => {
    if (activeClient) {
      fetchLocations()
      fetchStats()
    }
  }, [activeClient, selectedPlant, selectedLocation])

  const fetchPlants = async () => {
    const { data } = await supabase.from('plants').select('*').eq('client_id', activeClient!.id)
    if (data) {
      setPlants(data)
      if (data.length === 1) {
        setSelectedPlant(data[0].id)
      }
    }
  }

  const fetchLocations = async () => {
    let query = supabase.from('lockers').select('location').eq('client_id', activeClient!.id)
    if (selectedPlant !== 'all') {
      query = query.eq('plant_id', selectedPlant)
    }
    const { data } = await query
    if (data) {
      const locs = Array.from(new Set(data.map((d) => d.location)))
      setLocations(locs)
    }
  }

  const fetchStats = async () => {
    let lockersQuery = supabase
      .from('lockers')
      .select('id, location, plant_id')
      .eq('client_id', activeClient!.id)
    if (selectedPlant !== 'all') lockersQuery = lockersQuery.eq('plant_id', selectedPlant)
    if (selectedLocation !== 'all') lockersQuery = lockersQuery.eq('location', selectedLocation)

    const { data: lockers } = await lockersQuery

    if (!lockers) return

    const lockerIds = lockers.map((l) => l.id)

    if (lockerIds.length === 0) {
      setStats({ total: 0, occupied: 0, available: 0 })
      return
    }

    const { data: occupations } = await supabase
      .from('locker_occupations')
      .select('locker_id')
      .eq('client_id', activeClient!.id)
      .eq('status', 'Ativo')
      .in('locker_id', lockerIds)

    const occupiedCount = occupations?.length || 0
    const totalCount = lockers.length

    setStats({
      total: totalCount,
      occupied: occupiedCount,
      available: totalCount - occupiedCount,
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard de Lockers</h1>
        <div className="flex items-center gap-3">
          <Select value={selectedPlant} onValueChange={setSelectedPlant}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="Todas as Plantas" />
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
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="Todos os Locais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Locais</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total de Lockers</CardTitle>
            <Archive className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Lockers Ocupados</CardTitle>
            <UserCheck className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{stats.occupied}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Lockers Disponíveis
            </CardTitle>
            <UserMinus className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{stats.available}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
