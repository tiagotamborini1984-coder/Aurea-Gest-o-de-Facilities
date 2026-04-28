import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  GripHorizontal,
  Filter,
  MapPin,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function PlanejamentoManutencao() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(new Date())

  const [plants, setPlants] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [selectedLocation, setSelectedLocation] = useState<string>('all')

  const weekDays = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date(currentWeek)
    const currentDay = d.getDay()
    const diff = d.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + i
    d.setDate(diff)
    return {
      date: d.toISOString().split('T')[0],
      label: new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit' }).format(d),
    }
  })

  useEffect(() => {
    loadAuxData()
  }, [])
  useEffect(() => {
    loadTickets()
  }, [selectedPlant, selectedLocation])

  const loadAuxData = async () => {
    const [pRes, lRes] = await Promise.all([
      supabase.from('plants').select('id, name').order('name'),
      supabase.from('locations').select('id, name, plant_id').order('name'),
    ])
    if (pRes.data) setPlants(pRes.data)
    if (lRes.data) setLocations(lRes.data)
  }

  const loadTickets = async () => {
    setLoading(true)
    let query = supabase
      .from('maintenance_tickets')
      .select(`
      id, ticket_number, description, planned_start, assignee_id, plant_id, location_id,
      assignee:profiles!maintenance_tickets_assignee_id_fkey(name),
      status:maintenance_statuses(step)
    `)
      .not('status.step', 'eq', 'Concluído')

    if (selectedPlant !== 'all') query = query.eq('plant_id', selectedPlant)
    if (selectedLocation !== 'all') query = query.eq('location_id', selectedLocation)

    const { data } = await query
    setTickets(data || [])
    setLoading(false)
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    const plannedDate = `${dateStr}T09:00:00Z`
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, planned_start: plannedDate } : t)))

    const { error } = await supabase
      .from('maintenance_tickets')
      .update({ planned_start: plannedDate })
      .eq('id', id)
    if (error) {
      toast.error('Erro ao agendar OS')
      loadTickets()
    } else toast.success('OS Agendada com sucesso')
  }

  const handleBacklogDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, planned_start: null } : t)))
    const { error } = await supabase
      .from('maintenance_tickets')
      .update({ planned_start: null })
      .eq('id', id)
    if (error) loadTickets()
  }

  const moveWeek = (days: number) => {
    const d = new Date(currentWeek)
    d.setDate(d.getDate() + days)
    setCurrentWeek(d)
  }

  const backlogTickets = tickets.filter((t) => !t.planned_start)

  return (
    <div className="p-6 h-full flex flex-col animate-fade-in-up">
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <CalendarCheck className="h-8 w-8 text-brand-vividBlue" /> Agenda de Planejamento
          </h1>
          <p className="text-gray-500 mt-1">Arraste os chamados para agendar a execução.</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-2 items-center">
            <Select
              value={selectedPlant}
              onValueChange={(v) => {
                setSelectedPlant(v)
                setSelectedLocation('all')
              }}
            >
              <SelectTrigger className="w-[160px] bg-white">
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
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[160px] bg-white">
                <MapPin className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Locais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Locais</SelectItem>
                {locations
                  .filter((l) => selectedPlant === 'all' || l.plant_id === selectedPlant)
                  .map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 bg-white border px-2 py-1 rounded-md">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveWeek(-7)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium px-2 text-sm capitalize">
              {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
                currentWeek,
              )}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveWeek(7)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[500px]">
        {/* Backlog */}
        <div
          className="w-full lg:w-72 bg-gray-50 border rounded-xl p-4 flex flex-col shrink-0"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleBacklogDrop}
        >
          <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b flex justify-between">
            Aguardando Agenda{' '}
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              {backlogTickets.length}
            </span>
          </h3>
          <div className="space-y-3 overflow-y-auto pb-10">
            {loading ? (
              <p className="text-center text-xs text-gray-500">Carregando...</p>
            ) : (
              backlogTickets.map((t) => (
                <Card
                  key={t.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, t.id)}
                  className="cursor-move border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <GripHorizontal className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-bold text-gray-600">{t.ticket_number}</span>
                    </div>
                    <p className="text-sm line-clamp-2" title={t.description}>
                      {t.description}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
            {!loading && backlogTickets.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-4 border-2 border-dashed rounded-lg">
                Nenhuma OS no backlog
              </div>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
          {weekDays.map((day) => {
            const dayTickets = tickets.filter(
              (t) => t.planned_start && t.planned_start.startsWith(day.date),
            )
            return (
              <div
                key={day.date}
                className="bg-white border rounded-xl p-3 flex flex-col transition-colors hover:bg-gray-50/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, day.date)}
              >
                <h4 className="text-center font-medium text-gray-500 text-sm mb-3 pb-2 border-b capitalize">
                  {day.label}
                </h4>
                <div className="flex-1 border-2 border-transparent hover:border-dashed hover:border-blue-300 rounded-lg p-1 transition-all space-y-2 min-h-[100px]">
                  {dayTickets.map((t) => (
                    <Card
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      className="border-l-4 border-l-blue-500 shadow-sm bg-blue-50/50 cursor-move"
                    >
                      <CardContent className="p-3">
                        <span className="text-xs font-bold text-blue-700">{t.ticket_number}</span>
                        <p className="text-xs font-medium line-clamp-2 my-1">{t.description}</p>
                        {t.assignee && (
                          <div className="text-[10px] text-gray-500 mt-1 truncate">
                            {t.assignee.name}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
