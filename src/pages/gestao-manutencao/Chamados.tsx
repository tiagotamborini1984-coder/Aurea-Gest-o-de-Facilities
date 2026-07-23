import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Wrench,
  MapPin,
  Plus,
  Filter,
  Paperclip,
  X,
  Clock,
  Check,
  AlertTriangle,
  UploadCloud,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { ImportTicketsDialog } from '@/components/gestao-manutencao/ImportTicketsDialog'

const toLocalDatetime = (utcStr: string | null) => {
  if (!utcStr) return ''
  const d = new Date(utcStr)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const getTicketSLA = (ticket: any, currentTime: Date) => {
  if (!ticket.priority?.sla_hours) return null

  if (ticket.status?.step === 'Concluído') {
    return {
      text: 'Concluído',
      color:
        'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-900/50 dark:border-slate-800',
    }
  }

  const slaMs = ticket.priority.sla_hours * 60 * 60 * 1000
  const start = new Date(ticket.reported_at || ticket.created_at).getTime()
  const elapsed = currentTime.getTime() - start
  const remaining = slaMs - elapsed

  const isLate = remaining < 0
  const absRemaining = Math.abs(remaining)

  const days = Math.floor(absRemaining / (24 * 60 * 60 * 1000))
  const hours = Math.floor((absRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  const minutes = Math.floor((absRemaining % (60 * 60 * 1000)) / (60 * 1000))

  let timeText = ''
  if (days > 0) timeText = `${days}d ${hours}h ${minutes}m`
  else if (hours > 0) timeText = `${hours}h ${minutes}m`
  else timeText = `${minutes}m`

  const text = isLate ? `Atrasado: ${timeText}` : `Faltam: ${timeText}`

  let color =
    'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
  if (isLate) {
    color =
      'text-red-700 bg-red-50 border-red-200 shadow-sm dark:bg-red-950/40 dark:border-red-800 dark:text-red-400'
  } else if (remaining < slaMs * 0.2) {
    color =
      'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400'
  }

  return { text, color, isLate }
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
  const [selectedType, setSelectedType] = useState<string>('all')

  const [form, setForm] = useState({
    description: '',
    plant_id: '',
    area_id: '',
    sublocation_id: '',
    asset_id: '',
    type_id: '',
    status_id: '',
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
  const [checklistResponses, setChecklistResponses] = useState<any[]>([])
  const [updating, setUpdating] = useState(false)
  const [now, setNow] = useState(new Date())

  const [correctiveModalOpen, setCorrectiveModalOpen] = useState(false)
  const [correctiveForm, setCorrectiveForm] = useState({
    description: '',
    priority_id: 'none',
  })
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

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
  }, [selectedPlant, selectedArea, selectedType])

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
      setChecklistResponses(selectedTicket.checklist_responses || [])
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
      *, priority:maintenance_priorities(id, name, color, sla_hours), status:maintenance_statuses(id, name, color, step),
      asset:maintenance_assets(name), area:maintenance_areas(name), sublocation:maintenance_sublocations(name),
      plant:plants(name), assignee:profiles!maintenance_tickets_assignee_id_fkey(name),
      type:maintenance_types(id, name, color)
    `)
      .order('created_at', { ascending: false })

    if (selectedPlant !== 'all') q = q.eq('plant_id', selectedPlant)
    if (selectedArea !== 'all') q = q.eq('area_id', selectedArea)
    if (selectedType !== 'all') q = q.eq('type_id', selectedType)

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
        const originalName = file.name.replace(/[^a-zA-Z0-9.\- ]/g, '_')
        const fileName = `${Date.now()}_${originalName}`
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

      const initStatus =
        form.status_id && form.status_id !== 'none'
          ? statuses.find((s) => s.id === form.status_id)
          : statuses.find((s) => s.step === 'Aberto') || statuses[0]

      const { error } = await supabase.from('maintenance_tickets').insert({
        client_id: profile.client_id,
        plant_id: form.plant_id,
        area_id: form.area_id || null,
        sublocation_id: form.sublocation_id || null,
        asset_id: form.asset_id || null,
        type_id: form.type_id && form.type_id !== 'none' ? form.type_id : null,
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
      setForm({
        description: '',
        plant_id: '',
        area_id: '',
        sublocation_id: '',
        asset_id: '',
        type_id: '',
        status_id: '',
      })
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
        checklist_responses: checklistResponses,
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
        type: types.find((t) => t.id === payload.type_id),
      })
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleChecklistStatusChange = (index: number, newStatus: string) => {
    const newResponses = [...checklistResponses]
    newResponses[index] = { ...newResponses[index], status: newStatus }
    setChecklistResponses(newResponses)
  }

  const handleCreateCorrective = async () => {
    if (!correctiveForm.description) return toast.error('Informe a descrição do problema')

    try {
      const year = new Date().getFullYear()
      const { data: latest } = await supabase
        .from('maintenance_tickets')
        .select('ticket_number')
        .eq('client_id', selectedTicket.client_id)
        .like('ticket_number', `MAN-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1)

      let seq = latest?.length ? parseInt(latest[0].ticket_number.split('-')[2], 10) + 1 : 1
      const ticketNumber = `MAN-${year}-${seq.toString().padStart(4, '0')}`

      const initStatus = statuses.find((s) => s.step === 'Aberto') || statuses[0]
      const corretivaType = types.find((t) => t.name.toLowerCase().includes('corretiva'))

      const { error } = await supabase.from('maintenance_tickets').insert({
        client_id: selectedTicket.client_id,
        plant_id: selectedTicket.plant_id,
        area_id: selectedTicket.area_id,
        sublocation_id: selectedTicket.sublocation_id,
        asset_id: selectedTicket.asset_id,
        type_id: corretivaType?.id || null,
        priority_id: correctiveForm.priority_id !== 'none' ? correctiveForm.priority_id : null,
        status_id: initStatus?.id || null,
        ticket_number: ticketNumber,
        description: `[Gerado por Preventiva OS ${selectedTicket.ticket_number}]\n\n${correctiveForm.description}`,
        origin: 'Preventiva',
        parent_ticket_id: selectedTicket.id,
        requester_name: user?.email,
      })

      if (error) throw error
      toast.success('OS Corretiva gerada com sucesso!')
      setCorrectiveModalOpen(false)
      setCorrectiveForm({ description: '', priority_id: 'none' })
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wrench className="h-8 w-8 text-brand-vividBlue" /> Gestão de Chamados (OS)
          </h1>
          <p className="text-muted-foreground mt-1">Kanban de Ordem de Serviço em tempo real.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={selectedPlant}
            onValueChange={(v) => {
              setSelectedPlant(v)
              setSelectedArea('all')
            }}
          >
            <SelectTrigger className="w-[160px] bg-background">
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
            <SelectTrigger className="w-[160px] bg-background">
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
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <UploadCloud className="h-4 w-4 mr-2" />
            Importar Chamados
          </Button>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[160px] bg-background">
              <Wrench className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Tipo de Manutenção</Label>
                    <Select
                      value={form.type_id}
                      onValueChange={(v) => setForm({ ...form, type_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não definido</SelectItem>
                        {types.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Status Inicial</Label>
                    <Select
                      value={form.status_id}
                      onValueChange={(v) => setForm({ ...form, status_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Padrão (Aberto)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Padrão (Aberto)</SelectItem>
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition cursor-pointer relative">
                    <input
                      type="file"
                      multiple
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) =>
                        e.target.files &&
                        setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
                      }
                    />
                    <Paperclip className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Clique ou arraste arquivos (Fotos/Documentos)
                    </span>
                  </div>
                  {files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {files.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs bg-muted px-2 py-1 rounded"
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
          const colTickets = tickets.filter((t) => {
            if (!t.status && column === 'Aberto') return true
            if (!t.status) return false

            const isPlanejadoByName = t.status.name?.toLowerCase() === 'planejado'

            if (column === 'Planejado') {
              return t.status.step === 'Planejado' || isPlanejadoByName
            }

            if (column === 'Aberto') {
              return t.status.step === 'Aberto' && !isPlanejadoByName
            }

            return t.status.step === column
          })
          return (
            <div
              key={column}
              className="flex-none w-80 bg-muted/30 rounded-xl p-3 flex flex-col h-full border"
            >
              <div className="font-bold mb-3 px-3 py-2 flex justify-between items-center rounded-lg text-sm text-foreground bg-muted">
                {column}
                <Badge variant="secondary">{colTickets.length}</Badge>
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
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-muted-foreground">
                            {ticket.ticket_number}
                          </span>
                          {ticket.type && (
                            <Badge
                              variant="outline"
                              style={{
                                backgroundColor: ticket.type.color || '#e5e7eb',
                                color: '#fff',
                                borderColor: ticket.type.color || '#e5e7eb',
                              }}
                              className="text-[10px] px-1.5 h-5 font-semibold tracking-wide dark:opacity-90"
                            >
                              {ticket.type.name}
                            </Badge>
                          )}
                          {ticket.origin === 'Preventiva' && (
                            <Badge
                              variant="outline"
                              className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800 text-[10px] px-1.5 h-5 font-semibold tracking-wide"
                            >
                              Preventiva
                            </Badge>
                          )}
                        </div>
                        {ticket.priority && (
                          <Badge
                            variant={
                              ticket.priority.name.toLowerCase() === 'planejado' ||
                              ticket.priority.name.toLowerCase() === 'urgente'
                                ? 'default'
                                : 'outline'
                            }
                            style={
                              ticket.priority.name.toLowerCase() === 'planejado'
                                ? {
                                    backgroundColor: '#22c55e',
                                    color: '#000000',
                                    borderColor: '#22c55e',
                                  }
                                : ticket.priority.name.toLowerCase() === 'urgente'
                                  ? {
                                      backgroundColor: '#ef4444',
                                      color: '#ffffff',
                                      borderColor: '#ef4444',
                                    }
                                  : {
                                      borderColor: ticket.priority.color,
                                      color: ticket.priority.color,
                                    }
                            }
                            className="text-[10px] px-1 h-5 hover:opacity-90"
                          >
                            {ticket.priority.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium leading-snug line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="text-xs text-muted-foreground flex flex-col gap-1.5 mt-2">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">
                            {ticket.area?.name || ticket.plant?.name || 'Sem local'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-1 border-t border-border pt-2">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            {ticket.assignee ? (
                              <>
                                <Avatar className="h-4 w-4">
                                  <AvatarFallback className="text-[8px] bg-brand-vividBlue text-white">
                                    {ticket.assignee.name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-[100px]">
                                  {ticket.assignee.name}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground italic">Não atribuído</span>
                            )}
                          </div>

                          {(() => {
                            const sla = getTicketSLA(ticket, now)
                            if (!sla) return null
                            return (
                              <div
                                className={cn(
                                  'flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap',
                                  sla.color,
                                )}
                                title={`SLA: ${ticket.priority?.sla_hours} horas`}
                              >
                                <Clock className="w-2.5 h-2.5" />
                                {sla.text}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                      {ticket.asset && (
                        <div className="text-xs font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 px-2 py-1 rounded inline-block mt-1.5">
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
            <SheetTitle className="flex items-center gap-2">
              OS: {selectedTicket?.ticket_number}
              {selectedTicket?.origin === 'Preventiva' && (
                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-transparent dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900">
                  Preventiva
                </Badge>
              )}
              {selectedTicket &&
                (() => {
                  const sla = getTicketSLA(selectedTicket, now)
                  if (!sla) return null
                  return (
                    <span
                      className={cn(
                        'ml-auto text-xs font-bold px-2 py-1 rounded border flex items-center gap-1',
                        sla.color,
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      {sla.text}
                    </span>
                  )
                })()}
            </SheetTitle>
          </SheetHeader>
          {selectedTicket && (
            <div className="mt-6 space-y-4">
              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="text-sm font-medium mt-1 whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Checklist Section */}
              {checklistResponses.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">Checklist de Preventiva</Label>
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                    >
                      {checklistResponses.filter((r) => r.status === 'ok').length} /{' '}
                      {checklistResponses.length} Concluídos
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {checklistResponses.map((item, index) => (
                      <div
                        key={item.item_id || index}
                        className="p-3 border rounded-lg bg-muted/30"
                      >
                        <p className="text-sm font-medium mb-3">{item.description}</p>
                        <div className="flex flex-wrap gap-2 items-center justify-between">
                          <ToggleGroup
                            type="single"
                            size="sm"
                            value={item.status}
                            onValueChange={(v) => {
                              if (v) handleChecklistStatusChange(index, v)
                            }}
                          >
                            <ToggleGroupItem
                              value="ok"
                              className="data-[state=on]:bg-green-100 data-[state=on]:text-green-800 dark:data-[state=on]:bg-green-900/40 dark:data-[state=on]:text-green-400 text-xs"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" /> OK
                            </ToggleGroupItem>
                            <ToggleGroupItem
                              value="fail"
                              className="data-[state=on]:bg-red-100 data-[state=on]:text-red-800 dark:data-[state=on]:bg-red-900/40 dark:data-[state=on]:text-red-400 text-xs"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Falha
                            </ToggleGroupItem>
                          </ToggleGroup>

                          {(item.status === 'fail' || item.status === 'pending') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950/40"
                              onClick={() => {
                                setCorrectiveForm({
                                  description: `Falha identificada no item: ${item.description}`,
                                  priority_id: 'none',
                                })
                                setCorrectiveModalOpen(true)
                              }}
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              Gerar Corretiva
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Planta</Label>
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
                  <Label className="text-muted-foreground">Área / Local</Label>
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
                  <Label className="text-muted-foreground">Sublocal</Label>
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
                  <Label className="text-muted-foreground">Equipamento</Label>
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
                  <Label className="text-muted-foreground">Status</Label>
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
                  <Label className="text-muted-foreground">Tipo de Manutenção</Label>
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
                  <Label className="text-muted-foreground">Criticidade (SLA)</Label>
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
                  <Label className="text-muted-foreground">Manutentor Responsável</Label>
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
                  <Label className="text-muted-foreground">Início Planejado</Label>
                  <Input
                    type="datetime-local"
                    value={editForm.planned_start}
                    onChange={(e) => setEditForm({ ...editForm, planned_start: e.target.value })}
                    className="mt-1 h-8 text-xs [&::-webkit-calendar-picker-indicator]:dark:filter [&::-webkit-calendar-picker-indicator]:dark:invert"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Fim Planejado</Label>
                  <Input
                    type="datetime-local"
                    value={editForm.planned_end}
                    min={editForm.planned_start}
                    onChange={(e) => setEditForm({ ...editForm, planned_end: e.target.value })}
                    className="mt-1 h-8 text-xs [&::-webkit-calendar-picker-indicator]:dark:filter [&::-webkit-calendar-picker-indicator]:dark:invert"
                  />
                </div>

                {(selectedTicket.status?.step === 'Em Execução' ||
                  selectedTicket.status?.step === 'Concluído') && (
                  <>
                    <div>
                      <Label className="text-muted-foreground">Início Realizado</Label>
                      <Input
                        type="datetime-local"
                        value={editForm.actual_start}
                        onChange={(e) => setEditForm({ ...editForm, actual_start: e.target.value })}
                        className="mt-1 h-8 text-xs [&::-webkit-calendar-picker-indicator]:dark:filter [&::-webkit-calendar-picker-indicator]:dark:invert"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Fim Realizado</Label>
                      <Input
                        type="datetime-local"
                        value={editForm.actual_end}
                        min={editForm.actual_start}
                        onChange={(e) => setEditForm({ ...editForm, actual_end: e.target.value })}
                        className="mt-1 h-8 text-xs [&::-webkit-calendar-picker-indicator]:dark:filter [&::-webkit-calendar-picker-indicator]:dark:invert"
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
                <div className="mt-4 pt-4 border-t border-border">
                  <Label className="text-muted-foreground mb-2 block">Anexos / Fotos</Label>
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

      <ImportTicketsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={loadTickets}
      />

      <Dialog open={correctiveModalOpen} onOpenChange={setCorrectiveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar OS Corretiva</DialogTitle>
            <DialogDescription>
              Uma nova Ordem de Serviço será criada e vinculada a esta Preventiva.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Descrição do Problema Encontrado *</Label>
              <Textarea
                rows={3}
                value={correctiveForm.description}
                onChange={(e) =>
                  setCorrectiveForm({ ...correctiveForm, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Criticidade (Opcional)</Label>
              <Select
                value={correctiveForm.priority_id}
                onValueChange={(v) => setCorrectiveForm({ ...correctiveForm, priority_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Padrão</SelectItem>
                  {priorities.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setCorrectiveModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateCorrective} className="bg-brand-vividBlue">
                Criar Corretiva
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
