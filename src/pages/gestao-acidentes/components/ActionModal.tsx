import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

function buildTaskNumber(seq: number) {
  const year = new Date().getFullYear()
  return `TSK-${year}-${seq.toString().padStart(4, '0')}`
}

export function ActionModal({ open, onClose, accidentId, plantId, existingTask, onSaved }: any) {
  const { activeClient, profile } = useAppStore()
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [statuses, setStatuses] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const isEdit = !!existingTask

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee_id: '',
    assignee_ids: [] as string[],
    type_id: '',
    status_id: '',
    due_date: '',
    plant_id: '',
    plant_ids: [] as string[],
  })

  useEffect(() => {
    if (!open || !activeClient) return
    const authorizedPlants = (profile?.authorized_plants as string[]) || []

    supabase
      .from('profiles')
      .select('id, name')
      .eq('client_id', activeClient.id)
      .then(({ data }) => setProfiles(data || []))
    supabase
      .from('task_types')
      .select('id, name')
      .eq('client_id', activeClient.id)
      .then(({ data }) => setTypes(data || []))
    supabase
      .from('task_statuses')
      .select('id, name')
      .eq('client_id', activeClient.id)
      .order('created_at')
      .then(({ data }) => setStatuses(data || []))
    supabase
      .from('plants')
      .select('id, name')
      .eq('client_id', activeClient.id)
      .order('name')
      .then(({ data }) => {
        const filtered =
          authorizedPlants.length > 0
            ? (data || []).filter((p) => authorizedPlants.includes(p.id))
            : data || []
        setPlants(filtered)
      })

    if (existingTask) {
      setFormData({
        title: existingTask.title || '',
        description: existingTask.description || '',
        assignee_id: existingTask.assignee_id || '',
        assignee_ids: [],
        type_id: existingTask.type_id || '',
        status_id: existingTask.status_id || '',
        due_date: existingTask.due_date ? existingTask.due_date.slice(0, 16) : '',
        plant_id: existingTask.plant_id || plantId || '',
        plant_ids: [],
      })
    } else {
      setFormData({
        title: '',
        description: '',
        assignee_id: '',
        assignee_ids: [],
        type_id: '',
        status_id: '',
        due_date: '',
        plant_id: '',
        plant_ids: plantId ? [plantId] : [],
      })
    }
  }, [open, activeClient, existingTask, plantId, profile])

  const ensureTypeId = async (): Promise<string> => {
    const typeId = formData.type_id || types[0]?.id
    if (typeId) return typeId
    const { data, error } = await supabase
      .from('task_types')
      .insert({ client_id: activeClient.id, name: 'Ação de Acidente', sla_hours: 48 })
      .select('id')
      .single()
    if (error) throw new Error('Erro ao gerar Tipo de Tarefa padrão.')
    return data.id
  }

  const ensureStatusId = async (): Promise<string> => {
    const statusId = formData.status_id || statuses[0]?.id
    if (statusId) return statusId
    const { data, error } = await supabase
      .from('task_statuses')
      .insert({
        client_id: activeClient.id,
        name: 'Pendente',
        color: '#eab308',
        is_terminal: false,
        freeze_sla: false,
        sla_days: 2,
      })
      .select('id')
      .single()
    if (error) throw new Error('Erro ao gerar Status de Tarefa padrão.')
    return data.id
  }

  const handleSave = async () => {
    if (!activeClient || !profile) return
    setSaving(true)
    try {
      if (isEdit) {
        if (!formData.plant_id) throw new Error('Preencha a Planta da ação.')
        if (!formData.assignee_id) throw new Error('Preencha o Responsável pela ação.')
        const payload: any = {
          title: formData.title,
          description: formData.description,
          assignee_id: formData.assignee_id,
          plant_id: formData.plant_id,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        }
        if (formData.status_id) payload.status_id = formData.status_id
        if (formData.type_id) payload.type_id = formData.type_id
        const { error } = await supabase.from('tasks').update(payload).eq('id', existingTask.id)
        if (error) throw error
        toast({ title: 'Sucesso', description: 'Ação atualizada.' })
      } else {
        if (formData.plant_ids.length === 0) throw new Error('Selecione ao menos uma Planta.')
        if (formData.assignee_ids.length === 0)
          throw new Error('Selecione ao menos um Responsável.')

        const typeId = await ensureTypeId()
        const statusId = await ensureStatusId()

        const year = new Date().getFullYear()
        const { data: latest } = await supabase
          .from('tasks')
          .select('task_number')
          .eq('client_id', activeClient.id)
          .like('task_number', `TSK-${year}-%`)
          .order('task_number', { ascending: false })
          .limit(1)

        let seq = 1
        if (latest && latest.length > 0) {
          const p = latest[0].task_number.split('-')
          if (p.length === 3) seq = parseInt(p[2], 10) + 1
        }

        const tasksToCreate: any[] = []
        for (const pId of formData.plant_ids) {
          for (const aId of formData.assignee_ids) {
            tasksToCreate.push({
              client_id: activeClient.id,
              plant_id: pId,
              type_id: typeId,
              status_id: statusId,
              requester_id: profile.id,
              assignee_id: aId,
              task_number: buildTaskNumber(seq),
              title: formData.title,
              description: formData.description,
              due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
              accident_id: accidentId,
            })
            seq++
          }
        }

        const { error } = await supabase.from('tasks').insert(tasksToCreate)
        if (error) {
          if (error.code === '23505') {
            for (const task of tasksToCreate) {
              let inserted = false
              let retries = 0
              while (!inserted && retries < 5) {
                const { error: e } = await supabase.from('tasks').insert(task)
                if (e) {
                  if (e.code === '23505') {
                    task.task_number = buildTaskNumber(++seq)
                    retries++
                  } else throw e
                } else inserted = true
              }
              if (!inserted) throw new Error('Erro ao gerar número de tarefa.')
            }
          } else throw error
        }

        toast({
          title: 'Sucesso',
          description: `${tasksToCreate.length} ação(ões) criada(s) com sucesso.`,
        })
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Ação' : 'Nova Ação'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Título da Ação</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {isEdit ? (
              <>
                <div className="space-y-2">
                  <Label>Planta</Label>
                  <Select
                    value={formData.plant_id || undefined}
                    onValueChange={(v) => setFormData({ ...formData, plant_id: v })}
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
                  <Label>Responsável</Label>
                  <Select
                    value={formData.assignee_id || undefined}
                    onValueChange={(v) => setFormData({ ...formData, assignee_id: v })}
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
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Plantas</Label>
                  <MultiSelect
                    options={plants.map((p) => ({ label: p.name, value: p.id }))}
                    selected={formData.plant_ids}
                    onChange={(v) => setFormData({ ...formData, plant_ids: v })}
                    placeholder="Selecione as plantas..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsáveis</Label>
                  <MultiSelect
                    options={profiles.map((p) => ({ label: p.name, value: p.id }))}
                    selected={formData.assignee_ids}
                    onChange={(v) => setFormData({ ...formData, assignee_ids: v })}
                    placeholder="Selecione os responsáveis..."
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Prazo (Opcional)</Label>
              <Input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Tarefa</Label>
              <Select
                value={formData.type_id || undefined}
                onValueChange={(v) => setFormData({ ...formData, type_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Automático" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status_id || undefined}
                onValueChange={(v) => setFormData({ ...formData, status_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Automático" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? 'Salvar Ação' : 'Criar Ações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
