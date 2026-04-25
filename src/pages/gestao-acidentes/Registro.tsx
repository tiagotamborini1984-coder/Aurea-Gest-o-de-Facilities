import { useState, useEffect, FormEvent } from 'react'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash, Save, X } from 'lucide-react'

interface ActionItem {
  id: string
  plant_id: string
  assignee_id: string
  due_date: string
  description: string
}

export default function RegistroAcidente() {
  const { id } = useParams()
  const { activeClient, profile } = useAppStore()
  const { plants } = useMasterData()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [profiles, setProfiles] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [allClientPlants, setAllClientPlants] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [formData, setFormData] = useState({
    plant_id: '',
    company_id: '',
    event_date: '',
    location: '',
    department: '',
    severity: '',
    description: '',
  })
  const [actions, setActions] = useState<ActionItem[]>([])
  const isEditing = !!id

  useEffect(() => {
    if (!activeClient) return
    const fetchDeps = async () => {
      const [profRes, compRes, plantsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('client_id', activeClient.id),
        supabase.from('companies').select('*').eq('client_id', activeClient.id),
        supabase.from('plants').select('*').eq('client_id', activeClient.id),
      ])
      if (profRes.data) setProfiles(profRes.data)
      if (compRes.data) setCompanies(compRes.data)
      if (plantsRes.data) setAllClientPlants(plantsRes.data)
    }
    fetchDeps()

    if (id) {
      supabase
        .from('accidents')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data }) => {
          if (data) {
            if (
              profile?.role !== 'Administrador' &&
              profile?.role !== 'Master' &&
              data.created_by !== profile?.id
            ) {
              toast({ title: 'Acesso negado', variant: 'destructive' })
              navigate('/gestao-acidentes/historico')
              return
            }
            const d = new Date(data.event_date)
            const localStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16)
            setFormData({
              plant_id: data.plant_id,
              company_id: data.company_id || '',
              event_date: localStr,
              location: data.location,
              department: data.department,
              severity: data.severity,
              description: data.description,
            })
          }
        })
    }
  }, [activeClient, id, profile, navigate, toast])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeClient || !profile) return
    setSubmitting(true)

    try {
      let uploadedPhotos: string[] = []
      for (const file of files) {
        const ext = file.name.split('.').pop()
        const path = `${activeClient.id}/${formData.plant_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error, data } = await supabase.storage.from('accident-evidences').upload(path, file)
        if (!error && data) {
          const { data: urlData } = supabase.storage.from('accident-evidences').getPublicUrl(path)
          uploadedPhotos.push(urlData.publicUrl)
        }
      }

      const payload: any = {
        client_id: activeClient.id,
        plant_id: formData.plant_id,
        company_id: formData.company_id || null,
        event_date: new Date(formData.event_date).toISOString(),
        location: formData.location,
        department: formData.department,
        severity: formData.severity,
        description: formData.description,
      }

      if (isEditing) {
        if (uploadedPhotos.length > 0) {
          const { data: existing } = await supabase
            .from('accidents')
            .select('photos')
            .eq('id', id)
            .single()
          payload.photos = [...(existing?.photos || []), ...uploadedPhotos]
        }
        const { error } = await supabase.from('accidents').update(payload).eq('id', id)
        if (error) throw error
      } else {
        payload.created_by = profile.id
        if (uploadedPhotos.length > 0) payload.photos = uploadedPhotos
        const { error } = await supabase.from('accidents').insert(payload)
        if (error) throw error
      }

      if (actions.length > 0 && !isEditing) {
        const { data: type } = await supabase
          .from('task_types')
          .select('id')
          .eq('client_id', activeClient.id)
          .ilike('name', 'Gestão de Acidentes')
          .limit(1)
          .maybeSingle()
        const { data: status } = await supabase
          .from('task_statuses')
          .select('id')
          .eq('client_id', activeClient.id)
          .eq('is_terminal', false)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (type && status) {
          const tasks = actions.map((act) => ({
            client_id: activeClient.id,
            plant_id: act.plant_id,
            type_id: type.id,
            status_id: status.id,
            requester_id: profile.id,
            assignee_id: act.assignee_id,
            task_number: `ACT-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000)}`,
            title: `Ação Preventiva: ${formData.department}`,
            description: act.description,
            due_date: new Date(act.due_date).toISOString(),
            status_updated_at: new Date().toISOString(),
          }))
          await supabase.from('tasks').insert(tasks)
        }
      }

      toast({ title: 'Sucesso', description: 'Registro salvo com sucesso!' })
      navigate('/gestao-acidentes/historico')
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold mb-6">
        {isEditing ? 'Editar Acidente' : 'Registrar Acidente'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
            <div className="space-y-2">
              <Label>Planta do Ocorrido</Label>
              <Select
                value={formData.plant_id}
                onValueChange={(val) => setFormData({ ...formData, plant_id: val })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {plants?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Empresa do Acidentado</Label>
              <Select
                value={formData.company_id}
                onValueChange={(val) => setFormData({ ...formData, company_id: val })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data e Hora</Label>
              <Input
                type="datetime-local"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Departamento / Área</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Local Específico</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Gravidade</Label>
              <Select
                value={formData.severity}
                onValueChange={(val) => setFormData({ ...formData, severity: val })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Leve">Leve</SelectItem>
                  <SelectItem value="Moderado">Moderado</SelectItem>
                  <SelectItem value="Grave">Grave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descrição</Label>
              <Textarea
                className="h-24"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Evidências {isEditing && '(Novos anexos)'}</Label>
              <Input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => {
                  if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
                }}
              />
              {files.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 text-sm border rounded"
                    >
                      <span className="truncate">{f.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500"
                        onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!isEditing && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Ações Preventivas</h3>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setActions([
                    ...actions,
                    {
                      id: Date.now().toString(),
                      plant_id: '',
                      assignee_id: '',
                      due_date: '',
                      description: '',
                    },
                  ])
                }
              >
                <Plus className="w-4 h-4 mr-2" /> Adicionar
              </Button>
            </div>
            {actions.map((action) => (
              <Card key={action.id} className="relative">
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-red-500"
                    onClick={() => setActions(actions.filter((a) => a.id !== action.id))}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                  <div className="space-y-2">
                    <Label>Planta Destino</Label>
                    <Select
                      value={action.plant_id}
                      onValueChange={(val) =>
                        setActions(
                          actions.map((a) => (a.id === action.id ? { ...a, plant_id: val } : a)),
                        )
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allClientPlants.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Select
                      value={action.assignee_id}
                      onValueChange={(val) =>
                        setActions(
                          actions.map((a) => (a.id === action.id ? { ...a, assignee_id: val } : a)),
                        )
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prazo</Label>
                    <Input
                      type="date"
                      value={action.due_date}
                      onChange={(e) =>
                        setActions(
                          actions.map((a) =>
                            a.id === action.id ? { ...a, due_date: e.target.value } : a,
                          ),
                        )
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <Label>Descrição</Label>
                    <Textarea
                      value={action.description}
                      onChange={(e) =>
                        setActions(
                          actions.map((a) =>
                            a.id === action.id ? { ...a, description: e.target.value } : a,
                          ),
                        )
                      }
                      required
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            <Save className="w-4 h-4 mr-2" /> Salvar
          </Button>
        </div>
      </form>
    </div>
  )
}
