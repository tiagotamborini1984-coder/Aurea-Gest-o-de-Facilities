import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Edit, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import { ActionModal } from './ActionModal'

type ActionRow = {
  plant_id: string
  assignee_id: string
}

function buildTaskNumber(seq: number) {
  const year = new Date().getFullYear()
  return `TSK-${year}-${seq.toString().padStart(4, '0')}`
}

export function AccidentActions({ accidentId, plantId }: { accidentId: string; plantId: string }) {
  const { activeClient, profile } = useAppStore()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [statuses, setStatuses] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [rows, setRows] = useState<ActionRow[]>([])
  const [sharedTitle, setSharedTitle] = useState('')
  const [sharedDueDate, setSharedDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)

  const fetchTasks = useCallback(async () => {
    if (!activeClient) return
    const { data } = await supabase
      .from('tasks')
      .select(
        '*, assignee:profiles!tasks_assignee_id_fkey(name), status:task_statuses(name, color), plant:plants(name)',
      )
      .eq('client_id', activeClient.id)
      .eq('accident_id', accidentId)
      .order('created_at', { ascending: false })
    if (data) setTasks(data)
  }, [activeClient, accidentId])

  useEffect(() => {
    if (!activeClient || !profile) return

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
      .select('id, name, is_terminal')
      .eq('client_id', activeClient.id)
      .order('created_at')
      .then(({ data }) => setStatuses(data || []))
    supabase
      .from('plants')
      .select('id, name')
      .eq('client_id', activeClient.id)
      .order('name')
      .then(({ data }) => setPlants(data || []))
    fetchTasks()
  }, [activeClient, profile, fetchTasks])

  const addRow = () => {
    setRows([...rows, { plant_id: plantId || '', assignee_id: '' }])
  }

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index))
  }

  const updateRow = (index: number, field: keyof ActionRow, value: string) => {
    setRows(rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  const ensureTypeId = async (): Promise<string> => {
    const typeId = types[0]?.id
    if (typeId) return typeId
    const { data, error } = await supabase
      .from('task_types')
      .insert({ client_id: activeClient!.id, name: 'Ação de Acidente', sla_hours: 48 })
      .select('id')
      .single()
    if (error) throw new Error('Erro ao gerar Tipo de Tarefa padrão.')
    return data.id
  }

  const ensureStatusId = async (): Promise<string> => {
    const nonTerminal = statuses.find((s) => !s.is_terminal)
    const statusId = nonTerminal?.id || statuses[0]?.id
    if (statusId) return statusId
    const { data, error } = await supabase
      .from('task_statuses')
      .insert({
        client_id: activeClient!.id,
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

    if (!sharedTitle.trim()) {
      toast({
        title: 'Validação',
        description: 'Preencha o Título da Ação.',
        variant: 'destructive',
      })
      return
    }
    if (!sharedDueDate) {
      toast({ title: 'Validação', description: 'Preencha o Prazo.', variant: 'destructive' })
      return
    }
    if (rows.length === 0) {
      toast({ title: 'Aviso', description: 'Adicione ao menos uma linha.', variant: 'destructive' })
      return
    }
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].plant_id || !rows[i].assignee_id) {
        toast({
          title: 'Validação',
          description: `Selecione Planta e Responsável na linha ${i + 1}.`,
          variant: 'destructive',
        })
        return
      }
    }

    setSaving(true)
    try {
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

      const dueDateIso = new Date(sharedDueDate).toISOString()
      const tasksToCreate = rows.map((r) => ({
        client_id: activeClient.id,
        plant_id: r.plant_id,
        type_id: typeId,
        status_id: statusId,
        requester_id: profile.id,
        assignee_id: r.assignee_id,
        task_number: buildTaskNumber(seq++),
        title: sharedTitle.trim(),
        description: sharedTitle.trim(),
        due_date: dueDateIso,
        accident_id: accidentId,
      }))

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
      setRows([])
      setSharedTitle('')
      setSharedDueDate('')
      fetchTasks()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (task: any) => {
    setEditingTask(task)
    setIsModalOpen(true)
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Plano de Ação</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
              <div className="space-y-2">
                <Label>Título da Ação</Label>
                <Input
                  value={sharedTitle}
                  onChange={(e) => setSharedTitle(e.target.value)}
                  placeholder="Digite o título da ação"
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo (Data de Vencimento)</Label>
                <Input
                  type="datetime-local"
                  value={sharedDueDate}
                  onChange={(e) => setSharedDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-600">Adicionar Planta e Responsável</h4>
              <Button variant="outline" size="sm" onClick={addRow} disabled={saving}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar Linha
              </Button>
            </div>

            {rows.length === 0 ? (
              <div className="text-center py-6 text-gray-500 border rounded-lg border-dashed">
                Nenhuma linha adicionada. Clique em "Adicionar Linha" para começar.
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="md:col-span-5 space-y-1">
                      <Label className="text-xs">Planta de Destino</Label>
                      <Select
                        value={row.plant_id || undefined}
                        onValueChange={(v) => updateRow(index, 'plant_id', v)}
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
                    <div className="md:col-span-5 space-y-1">
                      <Label className="text-xs">Responsável</Label>
                      <Select
                        value={row.assignee_id || undefined}
                        onValueChange={(v) => updateRow(index, 'assignee_id', v)}
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
                    <div className="md:col-span-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(index)}
                        disabled={saving}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Plano de Ação
                </Button>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Ações Registradas</h3>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border rounded-lg">
              Nenhuma ação registrada para este acidente.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Planta de Destino</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.task_number}</TableCell>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>{t.plant?.name || 'N/A'}</TableCell>
                    <TableCell>{t.assignee?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {t.due_date ? format(new Date(t.due_date), 'dd/MM/yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: t.status?.color || '#ccc' }}
                      >
                        {t.status?.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}>
                        <Edit className="w-4 h-4 text-gray-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>

      <ActionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        accidentId={accidentId}
        plantId={plantId}
        existingTask={editingTask}
        onSaved={fetchTasks}
      />
    </Card>
  )
}
