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
  User,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

const toLocalDatetime = (utcStr: string | null) => {
  if (!utcStr) return ''
  const d = new Date(utcStr)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function PlanejamentoManutencao() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(new Date())

  const [plants, setPlants] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [assignees, setAssignees] = useState<any[]>([])

  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all')

  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    planned_start: '',
    planned_end: '',
    assignee_id: 'unassigned',
  })
  const [updating, setUpdating] = useState(false)

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
  }, [selectedPlant, selectedArea, selectedAssignee])

  useEffect(() => {
    if (selectedTicket) {
      setEditForm({
        planned_start: toLocalDatetime(selectedTicket.planned_start),
        planned_end: toLocalDatetime(selectedTicket.planned_end),
        assignee_id: selectedTicket.assignee_id || 'unassigned',
      })
    }
  }, [selectedTicket])

  const loadAuxData = async () => {
    const [pRes, aRes, assignRes] = await Promise.all([
      supabase.from('plants').select('id, name').order('name'),
      supabase.from('maintenance_areas').select('id, name, plant_id').order('name'),
      supabase.from('profiles').select('id, name, role').order('name'),
    ])
    if (pRes.data) setPlants(pRes.data)
    if (aRes.data) setAreas(aRes.data)
    if (assignRes.data) setAssignees(assignRes.data)
  }

  const loadTickets = async () => {
    setLoading(true)
    let query = supabase
      .from('maintenance_tickets')
      .select(`
      id, ticket_number, description, planned_start, planned_end, assignee_id, plant_id, area_id, sublocation_id, asset_id, photos,
      assignee:profiles!maintenance_tickets_assignee_id_fkey(id, name),
      status:maintenance_statuses(step),
      area:maintenance_areas(name),
      sublocation:maintenance_sublocations(name),
      asset:maintenance_assets(name)
    `)
      .not('status.step', 'eq', 'Concluído')

    if (selectedPlant !== 'all') query = query.eq('plant_id', selectedPlant)
    if (selectedArea !== 'all') query = query.eq('area_id', selectedArea)
    if (selectedAssignee !== 'all') query = query.eq('assignee_id', selectedAssignee)

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

    // Optimistic update
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

    // Optimistic update
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, planned_start: null } : t)))

    const { error } = await supabase
      .from('maintenance_tickets')
      .update({ planned_start: null })
      .eq('id', id)

    if (error) loadTickets()
  }

  const handleUpdateTicketDates = async () => {
    if (!selectedTicket) return

    if (editForm.planned_start && editForm.planned_end) {
      if (new Date(editForm.planned_end) < new Date(editForm.planned_start)) {
        return toast.error('O fim planejado não pode ser anterior ao início planejado.')
      }
    }

    setUpdating(true)
    try {
      const payload = {
        planned_start: editForm.planned_start
          ? new Date(editForm.planned_start).toISOString()
          : null,
        planned_end: editForm.planned_end ? new Date(editForm.planned_end).toISOString() : null,
        assignee_id: editForm.assignee_id === 'unassigned' ? null : editForm.assignee_id,
      }
      const { error } = await supabase
        .from('maintenance_tickets')
        .update(payload)
        .eq('id', selectedTicket.id)

      if (error) throw error
      toast.success('O.S. atualizada com sucesso!')
      loadTickets()
      setSelectedTicket(null)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUpdating(false)
    }
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
          <p className="text-gray-500 mt-1">
            Arraste os chamados para agendar ou clique para editar datas.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-2 items-center flex-wrap">
            <Select
              value={selectedPlant}
              onValueChange={(v) => {
                setSelectedPlant(v)
                setSelectedArea('all')
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
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger className="w-[160px] bg-white">
                <MapPin className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Áreas</SelectItem>
                {areas
                  .filter((a) => selectedPlant === 'all' || a.plant_id === selectedPlant)
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="w-[160px] bg-white">
                <User className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Manutentor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Manutentores</SelectItem>
                {assignees
                  .filter((a) => a.role === 'Manutentor' || selectedAssignee === a.id)
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
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
                  onClick={() => setSelectedTicket(t)}
                  className="cursor-pointer active:cursor-move border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <GripHorizontal className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-bold text-gray-600">{t.ticket_number}</span>
                    </div>
                    <p className="text-sm line-clamp-2" title={t.description}>
                      {t.description}
                    </p>
                    {t.assignee && (
                      <div className="text-[10px] text-gray-500 mt-1 truncate">
                        {t.assignee.name}
                      </div>
                    )}
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
                      onClick={() => setSelectedTicket(t)}
                      className="border-l-4 border-l-blue-500 shadow-sm bg-blue-50/50 cursor-pointer active:cursor-move"
                    >
                      <CardContent className="p-3">
                        <span className="text-xs font-bold text-blue-700">{t.ticket_number}</span>
                        <p className="text-xs font-medium line-clamp-2 my-1">{t.description}</p>
                        {t.assignee && (
                          <div className="text-[10px] text-gray-500 mt-1 truncate flex items-center gap-1">
                            <User className="w-3 h-3" />
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

      <Sheet open={!!selectedTicket} onOpenChange={(v) => !v && setSelectedTicket(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Agendar OS: {selectedTicket?.ticket_number}</SheetTitle>
          </SheetHeader>
          {selectedTicket && (
            <div className="mt-6 space-y-5">
              <div>
                <Label className="text-gray-500 text-xs">Descrição</Label>
                <p className="text-sm font-medium mt-1 leading-snug">
                  {selectedTicket.description}
                </p>
              </div>

              <div>
                <Label className="text-gray-500 text-xs">Localização / Equipamento</Label>
                <p className="text-sm font-medium mt-1 leading-snug">
                  {selectedTicket.area?.name || 'N/A'}
                  {selectedTicket.sublocation?.name ? ` > ${selectedTicket.sublocation.name}` : ''}
                  {selectedTicket.asset?.name ? ` > ${selectedTicket.asset.name}` : ''}
                </p>
              </div>

              {selectedTicket.photos &&
                Array.isArray(selectedTicket.photos) &&
                selectedTicket.photos.length > 0 && (
                  <div>
                    <Label className="text-gray-500 text-xs mb-2 block">Anexos</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedTicket.photos.map((photo: any, i: number) => {
                        const url = typeof photo === 'string' ? photo : photo.url
                        if (!url) return null
                        return (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block relative w-16 h-16 border rounded-md overflow-hidden hover:opacity-80 transition-opacity"
                          >
                            <img
                              src={url}
                              alt={`Anexo ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}

              <div>
                <Label className="text-gray-500 text-xs mb-2 block">Manutentor Responsável</Label>
                <Select
                  value={editForm.assignee_id}
                  onValueChange={(v) => setEditForm({ ...editForm, assignee_id: v })}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sem Atribuição</SelectItem>
                    {assignees
                      .filter((a) => a.role === 'Manutentor' || editForm.assignee_id === a.id)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 border-t">
                <Label className="text-gray-700 font-semibold">Datas de Planejamento</Label>

                <div className="mt-4 space-y-4">
                  <div>
                    <Label className="text-gray-500 text-xs">Início Planejado (Estimado)</Label>
                    <Input
                      type="datetime-local"
                      value={editForm.planned_start}
                      onChange={(e) => setEditForm({ ...editForm, planned_start: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-500 text-xs">Fim Planejado (Estimado)</Label>
                    <Input
                      type="datetime-local"
                      value={editForm.planned_end}
                      min={editForm.planned_start}
                      onChange={(e) => setEditForm({ ...editForm, planned_end: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 pb-10">
                <Button
                  onClick={handleUpdateTicketDates}
                  disabled={updating}
                  className="w-full bg-brand-vividBlue h-10"
                >
                  {updating ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
