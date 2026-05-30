import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

export default function AuditoriaRealizadas() {
  const [executions, setExecutions] = useState<any[]>([])
  const [selectedExecution, setSelectedExecution] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [participants, setParticipants] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    loadExecutions()
  }, [])

  const loadExecutions = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('audit_executions')
      .select(`
      *,
      audits (title, type),
      plants (name),
      profiles (name)
    `)
      .order('created_at', { ascending: false })

    setExecutions(data || [])
  }

  const openExecution = async (exec: any) => {
    const { data } = await supabase
      .from('audit_actions')
      .select('*')
      .eq('audit_id', exec.audit_id)
      .order('order_index')
    setActions(data || [])
    setSelectedExecution(exec)
    setAnswers({})
    setParticipants('')
  }

  const updateAnswer = (actionId: string, field: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [actionId]: {
        ...(prev[actionId] || {}),
        [field]: value,
      },
    }))
  }

  const handleSave = async () => {
    for (const action of actions) {
      const ans = answers[action.id] || {}
      if (action.evidence_required && !ans.evidence_url) {
        toast({
          title: 'Atenção',
          description: `O item "${action.title}" exige uma evidência (URL da foto/documento).`,
          variant: 'destructive',
        })
        return
      }
      if ((action as any).comments_required && !ans.observations) {
        toast({
          title: 'Atenção',
          description: `O item "${action.title}" exige um comentário.`,
          variant: 'destructive',
        })
        return
      }
    }

    const payload = actions.map((action) => ({
      action_id: action.id,
      score: answers[action.id]?.score || 0,
      observations: answers[action.id]?.observations || '',
      evidence_url: answers[action.id]?.evidence_url || '',
    }))

    const { error } = await supabase.rpc('submit_audit_execution', {
      p_execution_id: selectedExecution.id,
      p_answers: payload as any,
      p_participants: participants,
    })

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Auditoria salva e finalizada.' })
      setSelectedExecution(null)
      loadExecutions()
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Execuções de Auditoria</h1>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Auditoria</TableHead>
              <TableHead>Planta</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Realização</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {executions.map((exec) => (
              <TableRow key={exec.id}>
                <TableCell className="font-medium">{exec.audits?.title}</TableCell>
                <TableCell>{exec.plants?.name}</TableCell>
                <TableCell>{exec.profiles?.name}</TableCell>
                <TableCell>
                  <Badge variant={exec.status === 'Finalizado' ? 'secondary' : 'default'}>
                    {exec.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {exec.realization_date
                    ? new Date(exec.realization_date).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell>
                  {exec.status === 'Pendente' && (
                    <Button size="sm" onClick={() => openExecution(exec)}>
                      Executar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {executions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma execução encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedExecution} onOpenChange={(o) => !o && setSelectedExecution(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Executar Auditoria: {selectedExecution?.audits?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Participantes (Opcional)</Label>
              <Input
                placeholder="Nomes dos participantes separados por vírgula"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
              />
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-medium">Itens do Checklist</h3>
              {actions.map((action, idx) => (
                <div key={action.id} className="p-4 border rounded-md space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">
                      {idx + 1}. {action.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <Label>Nota</Label>
                      <Select
                        value={answers[action.id]?.score?.toString() || ''}
                        onValueChange={(v) => updateAnswer(action.id, 'score', parseInt(v))}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Evidência (URL)
                        {action.evidence_required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Input
                        placeholder="https://..."
                        value={answers[action.id]?.evidence_url || ''}
                        onChange={(e) => updateAnswer(action.id, 'evidence_url', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Comentários
                        {(action as any).comments_required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      <Textarea
                        placeholder="Observações..."
                        value={answers[action.id]?.observations || ''}
                        onChange={(e) => updateAnswer(action.id, 'observations', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedExecution(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Finalizar Auditoria</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
