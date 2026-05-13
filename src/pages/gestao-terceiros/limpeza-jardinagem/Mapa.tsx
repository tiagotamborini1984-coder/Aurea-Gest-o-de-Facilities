import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Map as MapIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'

export default function MapaLJ() {
  const { plants } = useMasterData()
  const { profile } = useAppStore()
  const hasAccess = useHasAccess('Limpeza e Jardinagem')

  const [selectedPlantId, setSelectedPlantId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [serviceType, setServiceType] = useState<string>('all')

  const [areas, setAreas] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])

  const selectedPlant = plants.find((p) => p.id === selectedPlantId)

  useEffect(() => {
    if (!selectedPlantId || !profile) return

    const loadData = async () => {
      const areasQuery = supabase
        .from('cleaning_gardening_areas')
        .select('*')
        .eq('plant_id', selectedPlantId)
        .eq('client_id', profile.client_id)

      let schedulesQuery = supabase
        .from('cleaning_gardening_schedules')
        .select('*, cleaning_gardening_areas!inner(type)')
        .eq('plant_id', selectedPlantId)
        .eq('client_id', profile.client_id)
        .eq('activity_date', selectedDate)

      if (serviceType !== 'all') {
        schedulesQuery = schedulesQuery.eq('cleaning_gardening_areas.type', serviceType)
      }

      const [{ data: areasData }, { data: schedulesData }] = await Promise.all([
        areasQuery,
        schedulesQuery,
      ])

      setAreas(areasData || [])
      setSchedules(schedulesData || [])
    }

    loadData()
  }, [selectedPlantId, selectedDate, profile, serviceType])

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  const getAreaColor = (area: any) => {
    const areaSchedules = schedules.filter((s) => s.area_id === area.id)
    if (areaSchedules.length === 0) return { fill: 'rgba(156, 163, 175, 0.4)', stroke: '#9ca3af' } // Cinza - Sem Atividade

    const hasUrgent = areaSchedules.some((s) => s.is_urgent)
    if (hasUrgent) return { fill: 'rgba(249, 115, 22, 0.6)', stroke: '#ea580c' } // Laranja - Emergencial

    const hasNaoRealizado = areaSchedules.some((s) => s.status === 'Não Realizado')
    if (hasNaoRealizado) return { fill: 'rgba(239, 68, 68, 0.6)', stroke: '#dc2626' } // Vermelho - Não Realizado

    const hasPendente = areaSchedules.some((s) => s.status === 'Pendente')
    if (hasPendente) return { fill: 'rgba(234, 179, 8, 0.6)', stroke: '#ca8a04' } // Amarelo - Pendente / Planejado

    return { fill: 'rgba(34, 197, 94, 0.6)', stroke: '#16a34a' } // Verde - Realizado
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MapIcon className="h-6 w-6 text-brand-vividBlue" />
          <h1 className="text-2xl font-bold text-gray-800">Mapa Operacional</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Tipo de Serviço" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Ambos</SelectItem>
              <SelectItem value="gardening">Apenas Jardinagem</SelectItem>
              <SelectItem value="cleaning">Apenas Limpeza</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-40"
          />
          <Select value={selectedPlantId} onValueChange={setSelectedPlantId}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Selecione a Planta" />
            </SelectTrigger>
            <SelectContent>
              {plants.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="bg-gray-50/50 border-b">
          <CardTitle className="text-lg">Visualização Dinâmica</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {!selectedPlantId ? (
            <div className="text-center py-16 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
              Selecione uma planta acima para visualizar o mapa.
            </div>
          ) : !selectedPlant?.map_url ? (
            <div className="text-center py-16 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
              Esta planta não possui um mapa cadastrado. Configure-o no módulo de Áreas.
            </div>
          ) : (
            <div className="w-full overflow-auto flex justify-center bg-gray-100 p-4 rounded-lg">
              <div className="relative inline-block max-w-full shadow-sm bg-white border border-gray-200">
                <img
                  src={selectedPlant.map_url}
                  alt="Mapa da Planta"
                  className="block max-w-full h-auto"
                />
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  {areas.map((area) => {
                    if (!area.polygon_data || area.polygon_data.length === 0) return null
                    const colors = getAreaColor(area)
                    return (
                      <polygon
                        key={area.id}
                        points={area.polygon_data.map((p: any) => `${p.x},${p.y}`).join(' ')}
                        fill={colors.fill}
                        stroke={colors.stroke}
                        strokeWidth="0.5"
                        vectorEffect="non-scaling-stroke"
                        className="transition-colors duration-500 ease-in-out hover:opacity-80 cursor-pointer"
                      >
                        <title>
                          {area.name} ({area.type === 'cleaning' ? 'Limpeza' : 'Jardinagem'})
                          {schedules
                            .filter((s) => s.area_id === area.id)
                            .map((s) => `\n- ${s.description} (${s.status})`)}
                        </title>
                      </polygon>
                    )
                  })}
                </svg>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 md:gap-6 mt-8 justify-center text-sm font-medium text-gray-700">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-green-500 shadow-sm border border-green-600"></span>{' '}
              Realizado
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-yellow-500 shadow-sm border border-yellow-600"></span>{' '}
              Planejado / Pendente
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-red-500 shadow-sm border border-red-600"></span>{' '}
              Não Realizado
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-orange-500 shadow-sm border border-orange-600"></span>{' '}
              Emergencial
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-gray-400 shadow-sm border border-gray-500"></span>{' '}
              Sem Atividade
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
