import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Wrench, MapPin, Plus, Filter, Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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

const toLocalDatetime = (utcStr: string | null) => {
  if (!utcStr) return ''
  const d = new Date(utcStr)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

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
  const [types, setTypes] = useState<any[]>([])
  const [assignees, setAssignees] = useState<any[]>([])

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

  const [editForm, setEditForm] = useState({
    plant_id: '',
    area_id: '',
    sublocation_id: '',
    asset_id: '',
    type_id: '',
    priority_id: '',
    assignee_id: '',
    status_id: '',
    planned_start: '',
    planned_end: '',
    actual_start: '',
    actual_end: '',
  })
  const [updating, setUpdating] = useState(false)

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

  const editFormAreas = useMemo(
    () => areas.filter((a) => a.plant_id === editForm.plant_id),
    [areas, editForm.plant_id],
  )
  const editFormSublocations = useMemo(
    () => sublocations.filter((s) => s.area_id === editForm.area_id),
    [sublocations, editForm.area_id],
  )
  const editFormAssets = useMemo(
    () =>
      assets.filter(
        (a) =>
          a.plant_id === editForm.plant_id &&
          (!editForm.area_id || editForm.area_id === 'none' || a.area_id === editForm.area_id),
      ),
    [assets, editForm.plant_id, editForm.area_id],
  )

  useEffect(() => {
    loadAuxData()
  }, [])
  useEffect(() => {
    loadTickets()
  }, [selectedPlant, selectedArea])

  useEffect(() => {
    if (selectedTicket) {
      setEditForm({
        plant_id: selectedTicket.plant_id || '',
        area_id: selectedTicket.area_id || 'none',
        sublocation_id: selectedTicket.sublocation_id || 'none',
        asset_id: selectedTicket.asset_id || 'none',
        type_id: selectedTicket.type_id || 'none',
        priority_id: selectedTicket.priority_id || 'none',
        assignee_id: selectedTicket.assignee_id || 'none',
        status_id: selectedTicket.status_id || 'none',
        planned_start: toLocalDatetime(selectedTicket.planned_start),
        planned_end: toLocalDatetime(selectedTicket.planned_end),
        actual_start: toLocalDatetime(selectedTicket.actual_start),
        actual_end: toLocalDatetime(selectedTicket.actual_end),
      })
    }
  }, [selectedTicket])

  useEffect(() => {
    if (editForm.planned_start && editForm.planned_end) {
      const planejadoStatus = statuses.find(
        (s) => s.step === 'Planejado' || s.name.toLowerCase() === 'planejado',
      )
      const currentStatus = statuses.find((s) => s.id === editForm.status_id)

      if (planejadoStatus && currentStatus && currentStatus.step === 'Aberto') {
        setEditForm((prev) => ({ ...prev, status_id: planejadoStatus.id }))
      }
    }
  }, [editForm.planned_start, editForm.planned_end, statuses])

  const loadAuxData = async () => {
    const [pRes, aRes, subRes, asRes, prioRes, statRes, tRes, assignRes] = await Promise.all([
      supabase.from('plants').select('id, name').order('name'),
      supabase.from('maintenance_areas').select('id, name, plant_id').order('name'),
      supabase.from('maintenance_sublocations').select('id, name, area_id').order('name'),
      supabase
        .from('maintenance_assets')
        .select('id, name, plant_id, area_id, sublocation_id')
        .order('name'),
      supabase.from('maintenance_priorities').select('*').order('name'),
      supabase.from('maintenance_statuses').select('*').order('order_index'),
      supabase.from('maintenance_types').select('*').order('name'),
      supabase.from('profiles').select('id, name, role').order('name'),
    ])
    if (pRes.data) setPlants(pRes.data)
    if (aRes.data) setAreas(aRes.data)
    if (subRes.data) setSublocations(subRes.data)
    if (asRes.data) setAssets(asRes.data)
    if (prioRes.data) setPriorities(prioRes.data)
    if (statRes.data) setStatuses(statRes.data)
    if (tRes.data) setTypes(tRes.data)
    if (assignRes.data) setAssignees(assignRes.data)
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

  const handleUpdateTicket = async () => {
    if (editForm.planned_start && editForm.planned_end) {
      if (new Date(editForm.planned_end) < new Date(editForm.planned_start)) {
        return toast.error('O fim planejado não pode ser anterior ao início planejado.')
      }
    }
    if (editForm.actual_start && editForm.actual_end) {
      if (new Date(editForm.actual_end) < new Date(editForm.actual_start)) {
        return toast.error('O fim realizado não pode ser anterior ao início realizado.')
      }
    }

    setUpdating(true)
    try {
      const payload = {
        plant_id: editForm.plant_id,
        area_id: editForm.area_id === 'none' ? null : editForm.area_id,
        sublocation_id: editForm.sublocation_id === 'none' ? null : editForm.sublocation_id,
        asset_id: editForm.asset_id === 'none' ? null : editForm.asset_id,
        type_id: editForm.type_id === 'none' ? null : editForm.type_id,
        priority_id: editForm.priority_id === 'none' ? null : editForm.priority_id,
        assignee_id: editForm.assignee_id === 'none' ? null : editForm.assignee_id,
        status_id: editForm.status_id === 'none' ? null : editForm.status_id,
        planned_start: editForm.planned_start
          ? new Date(editForm.planned_start).toISOString()
          : null,
        planned_end: editForm.planned_end ? new Date(editForm.planned_end).toISOString() : null,
        actual_start: editForm.actual_start ? new Date(editForm.actual_start).toISOString() : null,
        actual_end: editForm.actual_end ? new Date(editForm.actual_end).toISOString() : null,
      }
      const { error } = await supabase
        .from('maintenance_tickets')
        .update(payload)
        .eq('id', selectedTicket.id)
      if (error) throw error
      toast.success('O.S. atualizada com sucesso!')
      loadTickets()
      setSelectedTicket({
        ...selectedTicket,
        ...payload,
        plant: plants.find((p) => p.id === payload.plant_id),
        area: areas.find((a) => a.id === payload.area_id),
        sublocation: sublocations.find((s) => s.id === payload.sublocation_id),
        asset: assets.find((a) => a.id === payload.asset_id),
        priority: priorities.find((p) => p.id === payload.priority_id),
        assignee: assignees.find((a) => a.id === payload.assignee_id),
        status: statuses.find((s) => s.id === payload.status_id),
      })
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUpdating(false)
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
              <div
                className={cn(
                  'font-bold mb-3 px-3 py-2 flex justify-between items-center rounded-lg text-sm',
                  column === 'Planejado'
                    ? 'bg-[#22c55e] text-black'
                    : 'text-gray-700 bg-gray-200/50',
                )}
              >
                {column}
                <Badge
                  variant="secondary"
                  className={
                    column === 'Planejado'
                      ? 'bg-black/10 text-black hover:bg-black/20 border-transparent'
                      : ''
                  }
                >
                  {colTickets.length}
                </Badge>
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
                      <div className="text-xs text-gray-500 flex flex-col gap-1.5 mt-2">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">
                            {ticket.area?.name || ticket.plant?.name || 'Sem local'}
                          </span>
                        </div>
                        {ticket.assignee && (
                          <div className="flex items-center gap-1.5 font-medium text-gray-700 mt-1">
                            <Avatar className="h-4 w-4">
                              <AvatarFallback className="text-[8px] bg-brand-vividBlue text-white">
                                {ticket.assignee.name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{ticket.assignee.name}</span>
                          </div>
                        )}
                      </div>
                      {ticket.asset && (
                        <div className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded inline-block mt-1">
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
        <SheetContent className="sm:max-w-md overflow-y-auto pb-10">
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
                <div className="col-span-2">
                  <Label className="text-gray-500">Planta</Label>
                  <Select
                    value={editForm.plant_id}
                    onValueChange={(v) =>
                      setEditForm({
                        ...editForm,
                        plant_id: v,
                        area_id: 'none',
                        sublocation_id: 'none',
                        asset_id: 'none',
                      })
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
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
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-gray-500">Área / Local</Label>
                  <Select
                    value={editForm.area_id}
                    onValueChange={(v) =>
                      setEditForm({
                        ...editForm,
                        area_id: v,
                        sublocation_id: 'none',
                        asset_id: 'none',
                      })
                    }
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Selecione a Área" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {editFormAreas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-gray-500">Sublocal</Label>
                  <Select
                    value={editForm.sublocation_id}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, sublocation_id: v, asset_id: 'none' })
                    }
                    disabled={editForm.area_id === 'none'}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Selecione o Sublocal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {editFormSublocations.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-gray-500">Equipamento</Label>
                  <Select
                    value={editForm.asset_id}
                    onValueChange={(v) => setEditForm({ ...editForm, asset_id: v })}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Selecione o Equipamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {editFormAssets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label className="text-gray-500">Status</Label>
                  <Select
                    value={editForm.status_id}
                    onValueChange={(v) => setEditForm({ ...editForm, status_id: v })}
                  >
                    <SelectTrigger
                      className="mt-1 h-8 text-xs font-bold border-0 shadow-sm"
                      style={{
                        backgroundColor:
                          statuses.find((s) => s.id === editForm.status_id)?.color || '#e5e7eb',
                        color: '#000',
                      }}
                    >
                      <SelectValue placeholder="Selecione o Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="font-semibold">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: s.color }}
                            />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-500">Tipo de Manutenção</Label>
                  <Select
                    value={editForm.type_id}
                    onValueChange={(v) => setEditForm({ ...editForm, type_id: v })}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Selecione o Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {types.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-500">Criticidade (SLA)</Label>
                  <Select
                    value={editForm.priority_id}
                    onValueChange={(v) => setEditForm({ ...editForm, priority_id: v })}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Selecione a Criticidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {priorities.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.sla_hours}h)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label className="text-gray-500">Manutentor Responsável</Label>
                  <Select
                    value={editForm.assignee_id}
                    onValueChange={(v) => setEditForm({ ...editForm, assignee_id: v })}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Atribuir a..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não atribuído</SelectItem>
                      {assignees
                        .filter((a) => a.role === 'Manutentor' || a.id === editForm.assignee_id)
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-500">Início Planejado</Label>
                  <Input
                    type="datetime-local"
                    value={editForm.planned_start}
                    onChange={(e) => setEditForm({ ...editForm, planned_start: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-gray-500">Fim Planejado</Label>
                  <Input
                    type="datetime-local"
                    value={editForm.planned_end}
                    min={editForm.planned_start}
                    onChange={(e) => setEditForm({ ...editForm, planned_end: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>

                {(selectedTicket.status?.step === 'Em Execução' ||
                  selectedTicket.status?.step === 'Concluído') && (
                  <>
                    <div>
                      <Label className="text-gray-500">Início Realizado</Label>
                      <Input
                        type="datetime-local"
                        value={editForm.actual_start}
                        onChange={(e) => setEditForm({ ...editForm, actual_start: e.target.value })}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-500">Fim Realizado</Label>
                      <Input
                        type="datetime-local"
                        value={editForm.actual_end}
                        min={editForm.actual_start}
                        onChange={(e) => setEditForm({ ...editForm, actual_end: e.target.value })}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                  </>
                )}

                <div className="col-span-2 mt-4">
                  <Button
                    onClick={handleUpdateTicket}
                    disabled={updating}
                    className="w-full bg-brand-vividBlue text-sm h-10"
                  >
                    {updating ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </div>

              {selectedTicket.photos?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
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
