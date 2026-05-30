import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { Play, Save, CheckCircle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'

export default function AuditoriasCriadas() {
  const { activeClient } = useAppStore()
  const { toast } = useToast()
  const [executions, setExecutions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedExec, setSelectedExec] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [participants, setParticipants] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [scoringSettings, setScoringSettings] = useState<any[]>([])

  useEffect(() => {
    if (activeClient) fetchExecutions()
  }, [activeClient])

  const fetchExecutions = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('audit_executions')
      .select('*, audits(*), plants(name)')
      .in('status', ['Pendente', 'Rascunho'])
      .eq('audits.client_id', activeClient?.id)
      .order('created_at', { ascending: false })

    if (data) {
      setExecutions(data.filter((d) => d.audits !== null))
    }
    setLoading(false)
  }

  const openExecution = async (exec: any) => {
    setSelectedExec(exec)
    setParticipants(exec.participants || '')
    setScoringSettings(exec.audits?.scoring_settings || [])

    const { data: acts } = await supabase
      .from('audit_actions')
      .select('*')
      .eq('audit_id', exec.audit_id)
      .order('order_index', { ascending: true })

    if (acts) setActions(acts)

    const { data: ans } = await supabase
      .from('audit_execution_answers')
      .select('*')
      .eq('execution_id', exec.id)

    const initAnswers: Record<string, any> = {}
    if (ans) {
      ans.forEach((a) => {
        initAnswers[a.action_id] = {
          score: a.score,
          observations: a.observations || '',
          evidence_url: a.evidence_url || '',
        }
      })
    }
    setAnswers(initAnswers)
  }

  const handleAnswerChange = (actionId: string, field: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [actionId]: {
        ...(prev[actionId] || {}),
        [field]: value,
      },
    }))
  }

  const submitExecution = async (isDraft: boolean) => {
    if (!isDraft) {
      for (const action of actions) {
        const ans = answers[action.id]
        if (ans?.score === undefined || ans?.score === null || isNaN(ans?.score)) {
          toast({
            title: 'Atenção',
            description: `A ação "${action.title}" precisa ser avaliada.`,
            variant: 'destructive',
          })
          return
        }
        if (action.comments_required && (!ans?.observations || ans?.observations.trim() === '')) {
          toast({
            title: 'Atenção',
            description: `A ação "${action.title}" exige observações.`,
            variant: 'destructive',
          })
          return
        }
        if (action.evidence_required && (!ans?.evidence_url || ans?.evidence_url.trim() === '')) {
          toast({
            title: 'Atenção',
            description: `A ação "${action.title}" exige evidência.`,
            variant: 'destructive',
          })
          return
        }
      }
    }

    setSubmitting(true)
    const formattedAnswers = Object.keys(answers).map((actionId) => ({
      action_id: actionId,
      ...answers[actionId],
    }))

    const { error } = await supabase.rpc('submit_audit_execution', {
      p_execution_id: selectedExec.id,
      p_answers: formattedAnswers,
      p_participants: participants,
      p_is_draft: isDraft,
    })

    setSubmitting(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({
        title: 'Sucesso',
        description: isDraft ? 'Rascunho salvo com sucesso!' : 'Auditoria finalizada e registrada.',
      })
      setSelectedExec(null)
      fetchExecutions()
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auditorias Pendentes</h1>
          <p className="text-muted-foreground">
            Gerencie e execute as auditorias agendadas ou em rascunho.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auditoria</TableHead>
                <TableHead>Planta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Agendada</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : executions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Nenhuma auditoria pendente.
                  </TableCell>
                </TableRow>
              ) : (
                executions.map((exec) => (
                  <TableRow key={exec.id}>
                    <TableCell className="font-medium">{exec.audits?.title}</TableCell>
                    <TableCell>{exec.plants?.name}</TableCell>
                    <TableCell>
                      <Badge variant={exec.status === 'Rascunho' ? 'secondary' : 'outline'}>
                        {exec.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {exec.realization_date
                        ? format(new Date(exec.realization_date), 'dd/MM/yyyy')
                        : format(new Date(exec.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openExecution(exec)}>
                        <Play className="h-4 w-4 mr-2" /> Executar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedExec} onOpenChange={(o) => !o && setSelectedExec(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl">Auditoria: {selectedExec?.audits?.title}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 mt-2">
            <div className="space-y-6 pb-4">
              <div className="space-y-2 bg-muted/30 p-4 rounded-lg border">
                <Label className="text-base font-semibold">Participantes (Opcional)</Label>
                <Input
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                  placeholder="Nomes dos participantes separados por vírgula..."
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Itens de Verificação</h3>
                {actions.map((action, index) => {
                  const ans = answers[action.id] || {}
                  return (
                    <div
                      key={action.id}
                      className="p-5 border rounded-lg space-y-4 bg-card shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h4 className="font-medium text-base">
                            {index + 1}. {action.title}
                          </h4>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {action.comments_required && (
                              <Badge variant="secondary" className="text-xs">
                                Obs. Obrigatória
                              </Badge>
                            )}
                            {action.evidence_required && (
                              <Badge variant="secondary" className="text-xs">
                                Evidência Obrigatória
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Select
                          value={ans.score?.toString() || ''}
                          onValueChange={(v) => handleAnswerChange(action.id, 'score', parseInt(v))}
                        >
                          <SelectTrigger className="w-full sm:w-[200px] bg-background">
                            <SelectValue placeholder="Selecione a Avaliação" />
                          </SelectTrigger>
                          <SelectContent>
                            {scoringSettings.map((s: any) => (
                              <SelectItem key={s.score} value={s.score.toString()}>
                                {s.description} ({s.score})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Observações</Label>
                          <Textarea
                            placeholder="Descreva as observações encontradas..."
                            value={ans.observations || ''}
                            onChange={(e) =>
                              handleAnswerChange(action.id, 'observations', e.target.value)
                            }
                            className="min-h-[80px] bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Evidência (Link/URL)
                          </Label>
                          <Input
                            placeholder="https://..."
                            value={ans.evidence_url || ''}
                            onChange={(e) =>
                              handleAnswerChange(action.id, 'evidence_url', e.target.value)
                            }
                            className="bg-background"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 mt-auto border-t sm:justify-between flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => submitExecution(true)}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" /> Salvar Rascunho
            </Button>
            <Button
              onClick={() => submitExecution(false)}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              <CheckCircle className="h-4 w-4 mr-2" /> Fechar Oficialmente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
