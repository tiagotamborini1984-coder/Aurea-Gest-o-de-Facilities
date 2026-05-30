import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Play, CheckCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
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
import { SignatureCapture } from '@/components/audit/SignatureCapture'

export default function AuditoriaRealizadas() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [executions, setExecutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [activeExec, setActiveExec] = useState<any>(null)
  const [executing, setExecuting] = useState(false)
  const [actions, setActions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [participants, setParticipants] = useState('')
  const [signatures, setSignatures] = useState<any[]>([])

  const fetchExecutions = async () => {
    if (!user) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()
    if (profile?.client_id) {
      const { data } = await supabase
        .from('audit_executions')
        .select(`
          id, status, realization_date, final_score, max_score, participants, signatures,
          audits!inner(id, title, client_id, scoring_settings),
          plants!inner(name)
        `)
        .eq('audits.client_id', profile.client_id)
        .order('created_at', { ascending: false })
      if (data) setExecutions(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchExecutions()
  }, [user])

  const openExecution = async (exec: any) => {
    if (exec.status === 'Finalizado') {
      toast({ title: 'Aviso', description: 'Esta auditoria já foi finalizada.' })
      return
    }
    setActiveExec(exec)
    setParticipants(exec.participants || '')
    setSignatures(exec.signatures || [])

    const { data } = await supabase
      .from('audit_actions')
      .select('*')
      .eq('audit_id', exec.audits.id)
      .order('order_index')
    setActions(data || [])

    const { data: existAns } = await supabase
      .from('audit_execution_answers')
      .select('*')
      .eq('execution_id', exec.id)
    const ansMap: Record<string, any> = {}
    existAns?.forEach((a) => {
      ansMap[a.action_id] = {
        score: a.score,
        observations: a.observations,
        evidence_url: a.evidence_url,
        corrective_assignee_id: a.corrective_assignee_id,
        corrective_due_date: a.corrective_due_date,
      }
    })
    setAnswers(ansMap)
  }

  const closeExecution = () => {
    setActiveExec(null)
    setActions([])
    setAnswers({})
    setParticipants('')
    setSignatures([])
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

  const handleSubmit = async (isDraft: boolean) => {
    if (!activeExec) return

    const participantNames = participants
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)

    if (!isDraft) {
      if (participantNames.length > 0 && signatures.length < participantNames.length) {
        toast({
          title: 'Atenção',
          description: 'Todos os participantes listados devem assinar antes de finalizar.',
          variant: 'destructive',
        })
        return
      }

      const allAnswered = actions.every((a) => answers[a.id]?.score !== undefined)
      if (!allAnswered) {
        toast({
          title: 'Atenção',
          description: 'Responda todas as perguntas antes de finalizar.',
          variant: 'destructive',
        })
        return
      }
    }

    setExecuting(true)
    try {
      const payload = Object.keys(answers).map((actionId) => ({
        action_id: actionId,
        score: answers[actionId].score,
        observations: answers[actionId].observations,
        evidence_url: answers[actionId].evidence_url,
        corrective_assignee_id: answers[actionId].corrective_assignee_id,
        corrective_due_date: answers[actionId].corrective_due_date,
      }))

      const { error } = await supabase.rpc('submit_audit_execution', {
        p_execution_id: activeExec.id,
        p_answers: payload.length > 0 ? payload : [],
        p_participants: participants,
        p_is_draft: isDraft,
        p_signatures: signatures,
      })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: isDraft ? 'Rascunho salvo.' : 'Auditoria finalizada com sucesso!',
      })
      closeExecution()
      fetchExecutions()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Execuções de Auditorias</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auditoria</TableHead>
                <TableHead>Planta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Pontuação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : executions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Nenhuma execução encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                executions.map((exec) => (
                  <TableRow key={exec.id}>
                    <TableCell className="font-medium">{exec.audits.title}</TableCell>
                    <TableCell>{exec.plants.name}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          exec.status === 'Pendente'
                            ? 'bg-blue-100 text-blue-800'
                            : exec.status === 'Rascunho'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {exec.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {exec.realization_date
                        ? new Date(exec.realization_date).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {exec.final_score !== null ? `${exec.final_score} / ${exec.max_score}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {exec.status !== 'Finalizado' ? (
                        <Button variant="outline" size="sm" onClick={() => openExecution(exec)}>
                          <Play className="w-4 h-4 mr-1" />{' '}
                          {exec.status === 'Rascunho' ? 'Continuar' : 'Executar'}
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" disabled>
                          <CheckCircle className="w-4 h-4 mr-1 text-green-500" /> Finalizado
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!activeExec} onOpenChange={(open) => !open && closeExecution()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Execução: {activeExec?.audits?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {actions.map((act, i) => (
              <Card key={act.id}>
                <CardHeader className="py-3 bg-muted/30">
                  <CardTitle className="text-base font-medium">
                    {i + 1}. {act.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Nota</Label>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <Button
                          key={score}
                          type="button"
                          variant={answers[act.id]?.score === score ? 'default' : 'outline'}
                          onClick={() => handleAnswerChange(act.id, 'score', score)}
                          className="w-12 h-12"
                        >
                          {score}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {act.comments_required && (
                    <div className="space-y-2">
                      <Label>Observações (Obrigatório)</Label>
                      <Textarea
                        value={answers[act.id]?.observations || ''}
                        onChange={(e) => handleAnswerChange(act.id, 'observations', e.target.value)}
                        placeholder="Descreva suas observações..."
                      />
                    </div>
                  )}

                  {act.evidence_required && (
                    <div className="space-y-2">
                      <Label>Evidência (URL/Obrigatório)</Label>
                      <Input
                        value={answers[act.id]?.evidence_url || ''}
                        onChange={(e) => handleAnswerChange(act.id, 'evidence_url', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle>Conclusão & Assinaturas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Participantes (separados por vírgula)</Label>
                  <Input
                    value={participants}
                    onChange={(e) => setParticipants(e.target.value)}
                    placeholder="João Silva, Maria Souza"
                  />
                  <p className="text-xs text-muted-foreground">
                    Adicione os nomes dos participantes para habilitar a captura de assinaturas.
                  </p>
                </div>

                <SignatureCapture
                  participantsText={participants}
                  signatures={signatures}
                  onChange={setSignatures}
                />
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 sticky bottom-0 bg-background pt-2 pb-2">
            <Button variant="outline" onClick={() => handleSubmit(true)} disabled={executing}>
              Salvar Rascunho
            </Button>
            <Button onClick={() => handleSubmit(false)} disabled={executing}>
              Finalizar Auditoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
