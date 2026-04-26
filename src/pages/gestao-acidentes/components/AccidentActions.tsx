import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { ActionModal } from './ActionModal'

export function AccidentActions({ accidentId, plantId }: { accidentId: string; plantId: string }) {
  const { activeClient } = useAppStore()
  const [tasks, setTasks] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)

  const fetchTasks = async () => {
    if (!activeClient) return
    // @ts-expect-error - accident_id added via migration
    const { data } = await supabase
      .from('tasks')
      .select(
        '*, assignee:profiles!tasks_assignee_id_fkey(name), status:task_statuses(name, color)',
      )
      .eq('client_id', activeClient.id)
      .eq('accident_id', accidentId)
      .order('created_at', { ascending: false })
    if (data) setTasks(data)
  }

  useEffect(() => {
    fetchTasks()
  }, [activeClient, accidentId])

  const handleEdit = (task: any) => {
    setEditingTask(task)
    setIsModalOpen(true)
  }

  const handleNew = () => {
    setEditingTask(null)
    setIsModalOpen(true)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Ações Mitigadoras (Tarefas)</h3>
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" /> Nova Ação
          </Button>
        </div>

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
