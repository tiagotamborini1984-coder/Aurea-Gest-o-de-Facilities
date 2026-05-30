import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useToast } from '@/components/ui/use-toast'
import { PlayCircle, AlertTriangle } from 'lucide-react'

export default function AuditoriasCriadas() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [executions, setExecutions] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [selectedExec, setSelectedExec] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadExecutions()
      loadProfiles()
    }
  }, [user])

  const loadProfiles = async () => {
    const { data: p } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user?.id)
      .single()
    if (p?.client_id) {
      const { data } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('client_id', p.client_id)
      setProfiles(data || [])
    }
  }

  const loadExecutions = async () => {
    const { data: p } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user?.id)
      .single()
    if (!p?.client_id) return

    const { data } = await supabase
      .from('audit_executions')
      .select(`
        id, status, created_at, realization_date,
        audits ( id, title, type, scoring_settings ),
        plants ( name )
      `)
      .eq('status', 'Pendente')
      .order('created_at', { ascending: false })

    setExecutions(data || [])
  }

  const openExecution = async (exec: any) => {
    setSelectedExec(exec)
    setAnswers({})
    const { data } = await supabase
      .from('audit_actions')
      .select('*')
      .eq('audit_id', exec.audits.id)
      .order('order_index')
    setActions(data || [])
  }

  const updateAnswer = (actionId: string, field: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [actionId]: { ...prev[actionId], [field]: value },
    }))
  }

  const isTrigger = (score: number) => {
    if (!selectedExec?.audits?.scoring_settings) return false
    const setting = selectedExec.audits.scoring_settings.find((s: any) => s.score === score)
    return setting?.trigger_task === true
  }

  const submitAudit = async () => {
    if (actions.length === 0) return

    for (const a of actions) {
      const ans = answers[a.id]
      if (!ans?.score) {
        return toast({
          title: 'Atenção',
          description: `Por favor, avalie o item: ${a.title}`,
          variant: 'destructive',
        })
      }
      if (isTrigger(ans.score) && (!ans.corrective_assignee_id || !ans.corrective_due_date)) {
        return toast({
          title: 'Atenção',
          description: `Preencha o responsável e prazo para a ação corretiva do item: ${a.title}`,
          variant: 'destructive',
        })
      }
    }

    setLoading(true)
    const p_answers = actions.map((a) => ({
      action_id: a.id,
      score: answers[a.id].score,
      observations: answers[a.id].observations || null,
      evidence_url: answers[a.id].evidence_url || null,
      corrective_assignee_id: answers[a.id].corrective_assignee_id || null,
      corrective_due_date: answers[a.id].corrective_due_date || null,
    }))

    const { error } = await supabase.rpc('submit_audit_execution', {
      p_execution_id: selectedExec.id,
      p_answers,
      p_participants: user?.email || 'Auditor',
    })

    setLoading(false)

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({
        title: 'Sucesso',
        description: 'Auditoria finalizada com sucesso. Ações corretivas geradas.',
      })
      setSelectedExec(null)
      loadExecutions()
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <h1 className="text-3xl font-bold tracking-tight">Auditorias Pendentes</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {executions.map((exec) => (
          <Card
            key={exec.id}
            className="overflow-hidden flex flex-col hover:shadow-md transition-shadow"
          >
            <div className="h-2 bg-primary"></div>
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline">{exec.audits?.type}</Badge>
                <Badge variant="secondary">{exec.status}</Badge>
              </div>
              <CardTitle className="text-xl leading-tight">{exec.audits?.title}</CardTitle>
              <p className="text-sm text-muted-foreground pt-1">
                Planta: <span className="font-medium text-foreground">{exec.plants?.name}</span>
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
              <Button className="w-full mt-4 group" onClick={() => openExecution(exec)}>
                <PlayCircle className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />{' '}
                Executar Auditoria
              </Button>
            </CardContent>
          </Card>
        ))}
        {executions.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
            Nenhuma auditoria pendente no momento.
          </div>
        )}
      </div>

      <Dialog open={!!selectedExec} onOpenChange={(val) => !val && setSelectedExec(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Execução: {selectedExec?.audits?.title}</DialogTitle>
            <DialogDescription>Planta: {selectedExec?.plants?.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {actions.map((action, idx) => {
              const currentAnswer = answers[action.id] || {}
              const trigger = currentAnswer.score && isTrigger(currentAnswer.score)

              return (
                <div key={action.id} className="border p-5 rounded-lg space-y-4 bg-card shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="font-semibold text-lg flex-1">
                      {idx + 1}. {action.title}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>
                        Avaliação <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={currentAnswer.score?.toString()}
                        onValueChange={(val) => updateAnswer(action.id, 'score', parseInt(val))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma nota" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedExec?.audits?.scoring_settings?.map((s: any) => (
                            <SelectItem key={s.score} value={s.score.toString()}>
                              {s.score} - {s.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <Input
                        placeholder="Detalhes adicionais e observações..."
                        value={currentAnswer.observations || ''}
                        onChange={(e) => updateAnswer(action.id, 'observations', e.target.value)}
                      />
                    </div>
                  </div>

                  {trigger && (
                    <div className="bg-orange-50/80 dark:bg-orange-950/30 p-4 rounded-md border border-orange-200 dark:border-orange-900 mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 text-orange-800 dark:text-orange-400 font-medium mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span>Ação Corretiva Necessária</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-orange-900 dark:text-orange-300">
                            Responsável <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={currentAnswer.corrective_assignee_id || ''}
                            onValueChange={(val) =>
                              updateAnswer(action.id, 'corrective_assignee_id', val)
                            }
                          >
                            <SelectTrigger className="border-orange-300 dark:border-orange-800 bg-white dark:bg-background">
                              <SelectValue placeholder="Selecione o responsável" />
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
                          <Label className="text-orange-900 dark:text-orange-300">
                            Prazo de Resolução <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="date"
                            className="border-orange-300 dark:border-orange-800 bg-white dark:bg-background"
                            value={currentAnswer.corrective_due_date || ''}
                            onChange={(e) =>
                              updateAnswer(action.id, 'corrective_due_date', e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setSelectedExec(null)}>
              Cancelar
            </Button>
            <Button onClick={submitAudit} disabled={loading} className="px-8">
              {loading ? 'Salvando...' : 'Finalizar Auditoria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
