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

export function ActionModal({ open, onClose, accidentId, plantId, existingTask, onSaved }: any) {
  const { activeClient, profile } = useAppStore()
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [statuses, setStatuses] = useState<any[]>([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee_id: '',
    type_id: '',
    status_id: '',
    due_date: '',
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
      .order('order_index')
      .then(({ data }) => setStatuses(data || []))

    if (existingTask) {
      setFormData({
        title: existingTask.title || '',
        description: existingTask.description || '',
        assignee_id: existingTask.assignee_id || '',
        type_id: existingTask.type_id || '',
        status_id: existingTask.status_id || '',
        due_date: existingTask.due_date ? existingTask.due_date.slice(0, 16) : '',
      })
    } else {
      setFormData({
        title: '',
        description: '',
        assignee_id: '',
        type_id: '',
        status_id: '',
        due_date: '',
      })
    }
  }, [open, activeClient, existingTask])

  const handleSave = async () => {
    if (!activeClient || !profile) return

    try {
      if (existingTask) {
        const payload: any = {
          title: formData.title,
          description: formData.description,
          assignee_id: formData.assignee_id,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        }
        if (formData.status_id) payload.status_id = formData.status_id
        if (formData.type_id) payload.type_id = formData.type_id

        const { error } = await supabase.from('tasks').update(payload).eq('id', existingTask.id)
        if (error) throw error
        toast({ title: 'Sucesso', description: 'Ação atualizada.' })
      } else {
        const year = new Date().getFullYear()
        const { data: latest } = await supabase
          .from('tasks')
          .select('task_number')
          .eq('client_id', activeClient.id)
          .like('task_number', `TSK-${year}-%`)
          .order('created_at', { ascending: false })
          .limit(1)

        let seq = 1
        if (latest && latest.length > 0) {
          const p = latest[0].task_number.split('-')
          if (p.length === 3) seq = parseInt(p[2], 10) + 1
        }
        const taskNumber = `TSK-${year}-${seq.toString().padStart(4, '0')}`

        const typeId = formData.type_id || types[0]?.id
        const statusId = formData.status_id || statuses[0]?.id

        if (!typeId || !statusId || !formData.assignee_id) {
          throw new Error('Preencha os campos obrigatórios (Tipo, Status e Responsável).')
        }

        const payload: any = {
          client_id: activeClient.id,
          plant_id: plantId,
          type_id: typeId,
          status_id: statusId,
          requester_id: profile.id,
          assignee_id: formData.assignee_id,
          task_number: taskNumber,
          title: formData.title,
          description: formData.description,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
          accident_id: accidentId,
        }

        const { error } = await supabase.from('tasks').insert(payload)
        if (error) throw error
        toast({ title: 'Sucesso', description: 'Nova ação criada.' })
      }

      onSaved()
      onClose()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{existingTask ? 'Editar Ação' : 'Nova Ação'}</DialogTitle>
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
              <Label>Responsável</Label>
              <Select
                value={formData.assignee_id}
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
                value={formData.type_id}
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
                value={formData.status_id}
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
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar Ação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
