import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Wrench, MapPin, Clock, Plus, Filter } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

export default function ChamadosManutencao() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const { user } = useAuth()

  const [plants, setPlants] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [sublocations, setSublocations] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [priorities, setPriorities] = useState<any[]>([])
  const [statuses, setStatuses] = useState<any[]>([])

  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [selectedLocation, setSelectedLocation] = useState<string>('all')

  const [form, setForm] = useState({
    description: '',
    priority_id: '',
    plant_id: '',
    location_id: '',
    sublocation_id: '',
    asset_id: '',
  })

  const formLocations = useMemo(
    () => locations.filter((l) => l.plant_id === form.plant_id),
    [locations, form.plant_id],
  )
  const formSublocations = useMemo(
    () => sublocations.filter((s) => s.location_id === form.location_id),
    [sublocations, form.location_id],
  )
  const formAssets = useMemo(
    () =>
      assets.filter(
        (a) =>
          a.plant_id === form.plant_id &&
          (!form.location_id || a.location_id === form.location_id) &&
          (!form.sublocation_id || a.sublocation_id === form.sublocation_id),
      ),
    [assets, form],
  )

  useEffect(() => {
    loadAuxData()
  }, [])
  useEffect(() => {
    loadTickets()
  }, [selectedPlant, selectedLocation])
  useEffect(() => {
    if (plants.length === 1 && !form.plant_id) setForm((f) => ({ ...f, plant_id: plants[0].id }))
  }, [plants, form.plant_id])

  const loadAuxData = async () => {
    const [pRes, lRes, subRes, aRes, prioRes, statRes] = await Promise.all([
      supabase.from('plants').select('id, name').order('name'),
      supabase.from('locations').select('id, name, plant_id').order('name'),
      supabase.from('maintenance_sublocations').select('id, name, location_id').order('name'),
      supabase
        .from('maintenance_assets')
        .select('id, name, plant_id, location_id, sublocation_id')
        .order('name'),
      supabase.from('maintenance_priorities').select('*').order('name'),
      supabase.from('maintenance_statuses').select('*').order('order_index'),
    ])
    if (pRes.data) setPlants(pRes.data)
    if (lRes.data) setLocations(lRes.data)
    if (subRes.data) setSublocations(subRes.data)
    if (aRes.data) setAssets(aRes.data)
    if (prioRes.data) setPriorities(prioRes.data)
    if (statRes.data) setStatuses(statRes.data)
  }

  const loadTickets = async () => {
    setLoading(true)
    let q = supabase
      .from('maintenance_tickets')
      .select(`
      *, priority:maintenance_priorities(id, name, color), status:maintenance_statuses(id, name, color, step),
      asset:maintenance_assets(name), location:locations(name), sublocation:maintenance_sublocations(name),
      plant:plants(name), assignee:profiles!maintenance_tickets_assignee_id_fkey(name)
    `)
      .order('created_at', { ascending: false })

    if (selectedPlant !== 'all') q = q.eq('plant_id', selectedPlant)
    if (selectedLocation !== 'all') q = q.eq('location_id', selectedLocation)

    const { data } = await q
    setTickets(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!form.plant_id) throw new Error('Planta é obrigatória')
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user?.id)
        .single()
      if (!profile?.client_id) throw new Error('Cliente não encontrado')

      const year = new Date().getFullYear()
      const { data: latest } = await supabase
        .from('maintenance_tickets')
        .select('ticket_number')
        .eq('client_id', profile.client_id)
        .like('ticket_number', `MAN-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1)
      let seq = 1
      if (latest && latest.length > 0) seq = parseInt(latest[0].ticket_number.split('-')[2], 10) + 1
      const ticketNumber = `MAN-${year}-${seq.toString().padStart(4, '0')}`

      const initStatus = statuses.find((s) => s.step === 'Aberto') || statuses[0]

      const { error } = await supabase.from('maintenance_tickets').insert({
        client_id: profile.client_id,
        plant_id: form.plant_id,
        location_id: form.location_id || null,
        sublocation_id: form.sublocation_id || null,
        asset_id: form.asset_id || null,
        ticket_number: ticketNumber,
        description: form.description,
        priority_id: form.priority_id || null,
        status_id: initStatus?.id || null,
        origin: 'Manual',
        requester_name: user?.email,
      })

      if (error) throw error
      toast.success('OS criada!')
      setOpen(false)
      setForm({
        description: '',
        priority_id: '',
        plant_id: '',
        location_id: '',
        sublocation_id: '',
        asset_id: '',
      })
      loadTickets()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const columns = ['Aberto', 'Planejado', 'Em Execução', 'Concluído']

  return (
    <div className="p-6 h-full flex flex-col animate-fade-in-up">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Wrench className="h-8 w-8 text-brand-vividBlue" /> Gestão de Chamados (OS)
          </h1>
          <p className="text-gray-500 mt-1">Kanban de Ordem de Serviço em tempo real.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button className="bg-brand-vividBlue">
                <Plus className="h-4 w-4 mr-2" />
                Nova O.S.
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Criar Nova Ordem de Serviço</SheetTitle>
              </SheetHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-6 pb-6">
                <div className="space-y-2">
                  <Label>Planta</Label>
                  <Select
                    required
                    value={form.plant_id}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        plant_id: v,
                        location_id: '',
                        sublocation_id: '',
                        asset_id: '',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
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
                <div className="space-y-2">
                  <Label>Área / Local</Label>
                  <Select
                    disabled={!form.plant_id}
                    value={form.location_id}
                    onValueChange={(v) =>
                      setForm({ ...form, location_id: v, sublocation_id: '', asset_id: '' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formLocations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sublocal</Label>
                  <Select
                    disabled={!form.location_id}
                    value={form.sublocation_id}
                    onValueChange={(v) => setForm({ ...form, sublocation_id: v, asset_id: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formSublocations.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Equipamento / Ativo</Label>
                  <Select
                    disabled={!form.plant_id}
                    value={form.asset_id}
                    onValueChange={(v) => setForm({ ...form, asset_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formAssets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={form.priority_id}
                    onValueChange={(v) => setForm({ ...form, priority_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição do Problema</Label>
                  <Textarea
                    required
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Descreva o problema..."
                  />
                </div>
                <Button type="submit" className="w-full bg-brand-vividBlue">
                  Salvar OS
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const colTickets = tickets.filter(
            (t) => t.status?.step === column || (!t.status && column === 'Aberto'),
          )
          return (
            <div
              key={column}
              className="flex-none w-80 bg-gray-100 rounded-xl p-3 flex flex-col h-full border"
            >
              <div className="font-semibold text-gray-700 mb-3 px-2 flex justify-between items-center">
                {column} <Badge variant="secondary">{colTickets.length}</Badge>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 px-1">
                {colTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:border-brand-vividBlue/50 transition-colors shadow-sm"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono font-bold text-gray-500">
                          {ticket.ticket_number}
                        </span>
                        {ticket.priority && (
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: ticket.priority.color,
                              color: ticket.priority.color,
                            }}
                            className="text-[10px] px-1 h-5"
                          >
                            {ticket.priority.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium leading-snug line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-2">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">
                          {ticket.location?.name || ticket.plant?.name || 'Sem local'}
                        </span>
                      </div>
                      {ticket.asset && (
                        <div className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded inline-block">
                          Ativo: {ticket.asset.name}
                        </div>
                      )}
                      <div className="pt-2 border-t flex justify-between items-center">
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Clock className="h-3 w-3" />
                          {new Date(ticket.reported_at).toLocaleDateString()}
                        </div>
                        {ticket.assignee ? (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                              {ticket.assignee.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Não atribuído</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {colTickets.length === 0 && (
                  <div className="h-20 border-2 border-dashed rounded-lg flex items-center justify-center text-xs text-gray-400">
                    Nenhum chamado
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Sheet open={!!selectedTicket} onOpenChange={(v) => !v && setSelectedTicket(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>OS: {selectedTicket?.ticket_number}</SheetTitle>
          </SheetHeader>
          {selectedTicket && (
            <div className="mt-6 space-y-4">
              <div>
                <Label className="text-gray-500">Descrição</Label>
                <p className="text-sm font-medium mt-1">{selectedTicket.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge style={{ backgroundColor: selectedTicket.status?.color, color: '#fff' }}>
                      {selectedTicket.status?.name || 'Aberto'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">Prioridade</Label>
                  <div className="mt-1">
                    {selectedTicket.priority ? (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: selectedTicket.priority.color,
                          color: selectedTicket.priority.color,
                        }}
                      >
                        {selectedTicket.priority.name}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">Planta</Label>
                  <p className="text-sm">{selectedTicket.plant?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Local</Label>
                  <p className="text-sm">{selectedTicket.location?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Sublocal</Label>
                  <p className="text-sm">{selectedTicket.sublocation?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Equipamento</Label>
                  <p className="text-sm">{selectedTicket.asset?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Criado em</Label>
                  <p className="text-sm">
                    {new Date(selectedTicket.reported_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Responsável</Label>
                  <p className="text-sm">{selectedTicket.assignee?.name || 'Não atribuído'}</p>
                </div>
              </div>
              {selectedTicket.closure_notes && (
                <div className="mt-4">
                  <Label className="text-gray-500">Notas de Fechamento</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded-md mt-1">
                    {selectedTicket.closure_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
