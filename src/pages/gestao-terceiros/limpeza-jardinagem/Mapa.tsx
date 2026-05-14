import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import {
  Map as MapIcon,
  AlertTriangle,
  Info,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { format } from 'date-fns'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'

export default function MapaLJ() {
  const { plants } = useMasterData()
  const { profile } = useAppStore()
  const hasAccess = useHasAccess('Limpeza e Jardinagem')

  const [selectedPlantId, setSelectedPlantId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [serviceType, setServiceType] = useState<string>('gardening')

  const [areas, setAreas] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])

  const selectedPlant = plants.find((p) => p.id === selectedPlantId)

  useEffect(() => {
    if (!selectedPlantId || !profile) return

    const loadData = async () => {
      // Sempre carrega todas as áreas para não "sumir" com o polígono do mapa
      const { data: areasData, error: areasError } = await supabase
        .from('cleaning_gardening_areas')
        .select('*')
        .eq('plant_id', selectedPlantId)
        .eq('client_id', profile.client_id)

      if (areasError) console.error('Error fetching areas:', areasError)

      const fetchedAreas = areasData || []

      if (fetchedAreas.length === 0) {
        setAreas([])
        setSchedules([])
        return
      }

      // Busca todos os cronogramas da planta na data
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('cleaning_gardening_schedules')
        .select('*')
        .eq('plant_id', selectedPlantId)
        .eq('client_id', profile.client_id)
        .eq('activity_date', selectedDate)

      if (schedulesError) console.error('Error fetching schedules:', schedulesError)

      setAreas(fetchedAreas)
      setSchedules(schedulesData || [])
    }

    loadData()
  }, [selectedPlantId, selectedDate, profile])

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (mapContainerRef.current?.requestFullscreen) {
        mapContainerRef.current.requestFullscreen().catch((err) => {
          console.warn(`Error attempting to enable fullscreen: ${err.message}`)
        })
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  // Helper variables to show messages
  const hasGardeningAreas = areas.some(
    (a) => a.type === 'gardening' && a.polygon_data && a.polygon_data.length > 0,
  )
  const hasGardeningSchedules = schedules.some(
    (s) => areas.find((a) => a.id === s.area_id)?.type === 'gardening',
  )

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
              <SelectItem value="gardening">Apenas Jardinagem</SelectItem>
              <SelectItem value="cleaning">Apenas Limpeza</SelectItem>
              <SelectItem value="all">Ambos</SelectItem>
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
            <div>
              {serviceType === 'gardening' && !hasGardeningAreas && (
                <div className="flex items-start gap-3 bg-yellow-50 text-yellow-800 p-4 rounded-md mb-4 text-sm font-medium border border-yellow-200">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="mb-1">
                      <strong>Nenhuma área de Jardinagem encontrada no mapa.</strong>
                    </p>
                    <p className="text-yellow-700 font-normal">
                      Se você cadastrou um cronograma na área "Utilidades" (ou outra) e ele não
                      aparece, é provável que essa área esteja cadastrada como "Limpeza". Áreas de
                      Limpeza ficam ocultas quando o filtro "Apenas Jardinagem" está ativo.
                    </p>
                  </div>
                </div>
              )}

              {serviceType === 'gardening' && hasGardeningAreas && !hasGardeningSchedules && (
                <div className="flex items-center gap-3 bg-blue-50 text-blue-800 p-4 rounded-md mb-4 text-sm font-medium border border-blue-200">
                  <Info className="h-5 w-5 shrink-0" />
                  <p>
                    As áreas de Jardinagem estão visíveis, mas não há atividades agendadas para a
                    data selecionada ({format(new Date(selectedDate + 'T00:00:00'), 'dd/MM/yyyy')}).
                  </p>
                </div>
              )}

              <div
                ref={mapContainerRef}
                className={cn(
                  'flex flex-col bg-gray-50 border border-gray-200 rounded-lg overflow-hidden',
                  isFullscreen ? 'w-screen h-screen' : 'h-[600px] w-full',
                )}
              >
                <div className="flex items-center justify-between p-2 bg-white border-b border-gray-200 shrink-0">
                  <span className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                    <MapIcon className="h-4 w-4" />
                    {isFullscreen ? 'Modo Tela Cheia' : 'Mapa'}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs w-12 text-center font-medium">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-4 bg-gray-300 mx-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={toggleFullscreen}
                    >
                      {isFullscreen ? (
                        <Minimize className="h-4 w-4" />
                      ) : (
                        <Maximize className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex-1 w-full overflow-auto bg-gray-100 p-4 relative">
                  <div className="min-w-full min-h-full flex items-center justify-center">
                    <div
                      className="relative shadow-sm bg-white border border-gray-300 transition-all duration-200"
                      style={{ width: `${Math.round(zoom * 100)}%`, minWidth: 'min-content' }}
                    >
                      <img
                        src={selectedPlant.map_url}
                        alt="Mapa da Planta"
                        className="block w-full h-auto max-w-none"
                        draggable={false}
                      />
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="absolute inset-0 w-full h-full pointer-events-none"
                      >
                        {areas.map((area) => {
                          if (!area.polygon_data || area.polygon_data.length === 0) return null

                          const isFilteredOut = serviceType !== 'all' && area.type !== serviceType
                          if (isFilteredOut) return null // Oculta completamente áreas fora do filtro

                          const colors = getAreaColor(area)
                          return (
                            <polygon
                              key={area.id}
                              points={area.polygon_data.map((p: any) => `${p.x},${p.y}`).join(' ')}
                              fill={colors.fill}
                              stroke={colors.stroke}
                              strokeWidth="0.5"
                              vectorEffect="non-scaling-stroke"
                              className="transition-colors duration-500 ease-in-out pointer-events-auto hover:opacity-80 cursor-pointer"
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
                </div>
              </div>

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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
