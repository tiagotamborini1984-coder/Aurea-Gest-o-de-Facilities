import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Wrench, MapPin, Clock, Plus, Filter, Paperclip, X } from 'lucide-react'
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
  const [submitting, setSubmitting] = useState(false)

  const [plants, setPlants] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [sublocations, setSublocations] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [priorities, setPriorities] = useState<any[]>([])
  const [statuses, setStatuses] = useState<any[]>([])

  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [selectedArea, setSelectedArea] = useState<string>('all')

  const [form, setForm] = useState({
    description: '',
    plant_id: '',
    area_id: '',
    sublocation_id: '',
    asset_id: '',
  })
  const [files, setFiles] = useState<File[]>([])

  const formAreas = useMemo(
    () => areas.filter((a) => a.plant_id === form.plant_id),
    [areas, form.plant_id],
  )
  const formSublocations = useMemo(
    () => sublocations.filter((s) => s.area_id === form.area_id),
    [sublocations, form.area_id],
  )
  const formAssets = useMemo(
    () =>
      assets.filter(
        (a) => a.plant_id === form.plant_id && (!form.area_id || a.area_id === form.area_id),
      ),
    [assets, form],
  )

  useEffect(() => {
    loadAuxData()
  }, [])
  useEffect(() => {
    loadTickets()
  }, [selectedPlant, selectedArea])

  const loadAuxData = async () => {
    const [pRes, aRes, subRes, asRes, prioRes, statRes] = await Promise.all([
      supabase.from('plants').select('id, name').order('name'),
      supabase.from('maintenance_areas').select('id, name, plant_id').order('name'),
      supabase.from('maintenance_sublocations').select('id, name, area_id').order('name'),
      supabase
        .from('maintenance_assets')
        .select('id, name, plant_id, area_id, sublocation_id')
        .order('name'),
      supabase.from('maintenance_priorities').select('*').order('name'),
      supabase.from('maintenance_statuses').select('*').order('order_index'),
    ])
    if (pRes.data) setPlants(pRes.data)
    if (aRes.data) setAreas(aRes.data)
    if (subRes.data) setSublocations(subRes.data)
    if (asRes.data) setAssets(asRes.data)
    if (prioRes.data) setPriorities(prioRes.data)
    if (statRes.data) setStatuses(statRes.data)
  }

  const loadTickets = async () => {
    setLoading(true)
    let q = supabase
      .from('maintenance_tickets')
      .select(`
      *, priority:maintenance_priorities(id, name, color), status:maintenance_statuses(id, name, color, step),
      asset:maintenance_assets(name), area:maintenance_areas(name), sublocation:maintenance_sublocations(name),
      plant:plants(name), assignee:profiles!maintenance_tickets_assignee_id_fkey(name)
    `)
      .order('created_at', { ascending: false })

    if (selectedPlant !== 'all') q = q.eq('plant_id', selectedPlant)
    if (selectedArea !== 'all') q = q.eq('area_id', selectedArea)

    const { data } = await q
    setTickets(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.plant_id || !form.description) return toast.error('Preencha os campos obrigatórios')
    setSubmitting(true)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user?.id)
        .single()
      if (!profile?.client_id) throw new Error('Cliente não encontrado')

      let uploadedPhotos: string[] = []
      for (const file of files) {
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
        const { data } = await supabase.storage
          .from('maintenance_attachments')
          .upload(fileName, file)
        if (data) {
          const { data: urlData } = supabase.storage
            .from('maintenance_attachments')
            .getPublicUrl(data.path)
          uploadedPhotos.push(urlData.publicUrl)
        }
      }

      const year = new Date().getFullYear()
      const { data: latest } = await supabase
        .from('maintenance_tickets')
        .select('ticket_number')
        .eq('client_id', profile.client_id)
        .like('ticket_number', `MAN-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1)
      let seq = latest?.length ? parseInt(latest[0].ticket_number.split('-')[2], 10) + 1 : 1
      const ticketNumber = `MAN-${year}-${seq.toString().padStart(4, '0')}`

      const initStatus = statuses.find((s) => s.step === 'Aberto') || statuses[0]

      const { error } = await supabase.from('maintenance_tickets').insert({
        client_id: profile.client_id,
        plant_id: form.plant_id,
        area_id: form.area_id || null,
        sublocation_id: form.sublocation_id || null,
        asset_id: form.asset_id || null,
        ticket_number: ticketNumber,
        description: form.description,
        status_id: initStatus?.id || null,
        origin: 'Manual',
        requester_name: user?.email,
        photos: uploadedPhotos,
      })

      if (error) throw error
      toast.success('OS criada com sucesso!')
      setOpen(false)
      setForm({ description: '', plant_id: '', area_id: '', sublocation_id: '', asset_id: '' })
      setFiles([])
      loadTickets()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const updatePriority = async (val: string) => {
    if (!selectedTicket) return
    const { error } = await supabase
      .from('maintenance_tickets')
      .update({ priority_id: val })
      .eq('id', selectedTicket.id)
    if (!error) {
      toast.success('Prioridade atualizada')
      setSelectedTicket({
        ...selectedTicket,
        priority_id: val,
        priority: priorities.find((p) => p.id === val),
      })
      loadTickets()
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
                  <Label>Planta *</Label>
                  <Select
                    required
                    value={form.plant_id}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        plant_id: v,
                        area_id: '',
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
                    value={form.area_id}
                    onValueChange={(v) =>
                      setForm({ ...form, area_id: v, sublocation_id: '', asset_id: '' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formAreas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sublocal</Label>
                  <Select
                    disabled={!form.area_id}
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
                  <Label>Descrição do Problema *</Label>
                  <Textarea
                    required
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Descreva o problema..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Anexos</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 transition cursor-pointer relative">
                    <input
                      type="file"
                      multiple
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) =>
                        e.target.files &&
                        setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
                      }
                    />
                    <Paperclip className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-600">
                      Clique ou arraste arquivos (Fotos/Documentos)
                    </span>
                  </div>
                  {files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {files.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs bg-gray-100 px-2 py-1 rounded"
                        >
                          <span className="truncate">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                          >
                            <X className="h-3 w-3 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-brand-vividBlue">
                  {submitting ? 'Salvando...' : 'Salvar OS'}
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
                          {ticket.area?.name || ticket.plant?.name || 'Sem local'}
                        </span>
                      </div>
                      {ticket.asset && (
                        <div className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded inline-block">
                          Ativo: {ticket.asset.name}
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
                  <Select value={selectedTicket.priority_id || ''} onValueChange={updatePriority}>
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Definir Prioridade" />
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
                <div>
                  <Label className="text-gray-500">Área / Local</Label>
                  <p className="text-sm">{selectedTicket.area?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Equipamento</Label>
                  <p className="text-sm">{selectedTicket.asset?.name || '-'}</p>
                </div>
              </div>
              {selectedTicket.photos?.length > 0 && (
                <div className="mt-4">
                  <Label className="text-gray-500 mb-2 block">Anexos / Fotos</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedTicket.photos.map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          alt="anexo"
                          className="w-full h-20 object-cover rounded-md border hover:opacity-80 transition"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
