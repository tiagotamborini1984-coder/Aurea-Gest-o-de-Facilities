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
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

export function ActionModal({ open, onClose, plantId, existingTask, onSaved }: any) {
  const { activeClient } = useAppStore()
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [statuses, setStatuses] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee_id: '',
    type_id: '',
    status_id: '',
    due_date: '',
    plant_id: '',
  })

  useEffect(() => {
    if (!open || !activeClient) return

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
      .then(({ data }) => setPlants(data || []))

    if (existingTask) {
      setFormData({
        title: existingTask.title || '',
        description: existingTask.description || '',
        assignee_id: existingTask.assignee_id || '',
        type_id: existingTask.type_id || '',
        status_id: existingTask.status_id || '',
        due_date: existingTask.due_date ? existingTask.due_date.slice(0, 16) : '',
        plant_id: existingTask.plant_id || plantId || '',
      })
    }
  }, [open, activeClient, existingTask, plantId])

  const handleSave = async () => {
    if (!activeClient) return
    if (!formData.plant_id) {
      toast({ title: 'Erro', description: 'Preencha a Planta.', variant: 'destructive' })
      return
    }
    if (!formData.assignee_id) {
      toast({ title: 'Erro', description: 'Preencha o Responsável.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
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
          <DialogTitle>Editar Ação</DialogTitle>
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
            <div className="space-y-2 col-span-2">
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
            Salvar Ação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
