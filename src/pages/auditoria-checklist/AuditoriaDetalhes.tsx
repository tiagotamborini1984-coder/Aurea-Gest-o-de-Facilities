import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Loader2, Save, CheckCircle, ArrowLeft, Paperclip, Printer } from 'lucide-react'
import { FileUpload } from '@/components/FileUpload'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { submitAuditExecution } from '@/services/audit'

function PrintButton({ id }: { id: string | undefined }) {
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!id)
      return supabase
        .from('audit_executions')
        .select('status')
        .eq('id', id)
        .single()
        .then(({ data }) => {
          if (data) setStatus(data.status)
        })
  }, [id])

  const isPending =
    !status || ['pendente', 'em andamento', 'draft', 'rascunho'].includes(status.toLowerCase())

  if (isPending) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden">
      <Button
        onClick={() => window.open(`/auditoria-checklist/relatorio/${id}?print=true`, '_blank')}
        className="shadow-lg gap-2"
        size="lg"
      >
        <Printer className="w-5 h-5" />
        Imprimir Relatório
      </Button>
    </div>
  )
}

export default function AuditoriaDetalhesWrapper() {
  const { id } = useParams()
  return (
    <>
      <PrintButton id={id} />
      <AuditoriaDetalhes />
    </>
  )
}

function AuditoriaDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [execution, setExecution] = useState<any>(null)
  const [audit, setAudit] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [participants, setParticipants] = useState('')

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    if (!id) return
    try {
      const { data: execData, error: execError } = await supabase
        .from('audit_executions')
        .select('*, audits(*)')
        .eq('id', id)
        .single()

      if (execError) throw execError
      if (execData) {
        setExecution(execData)
        setAudit(execData.audits)
        setParticipants(execData.participants || '')

        const { data: actionsData, error: actionsError } = await supabase
          .from('audit_actions')
          .select('*')
          .eq('audit_id', execData.audit_id)
          .order('order_index')

        if (actionsError) throw actionsError
        setActions(actionsData || [])

        const { data: answersData, error: answersError } = await supabase
          .from('audit_execution_answers')
          .select('*')
          .eq('execution_id', id)

        if (answersError) throw answersError

        const ansMap: Record<string, any> = {}
        answersData?.forEach((ans) => {
          ansMap[ans.action_id] = {
            score: ans.score,
            observations: ans.observations,
            evidence_url: ans.evidence_url,
            evidence_urls: ans.evidence_urls || [],
            corrective_assignee_id: ans.corrective_assignee_id,
            corrective_due_date: ans.corrective_due_date,
          }
        })
        setAnswers(ansMap)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar auditoria',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (actionId: string, field: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [actionId]: {
        ...prev[actionId],
        [field]: value,
      },
    }))
  }

  const handleSave = async (isDraft: boolean) => {
    if (!id) return
    setSaving(true)
    try {
      const formattedAnswers = Object.entries(answers).map(([action_id, val]) => ({
        value: {
          action_id,
          ...val,
        },
      }))

      await submitAuditExecution(id, formattedAnswers, participants, isDraft)

      toast({
        title: isDraft ? 'Rascunho salvo com sucesso' : 'Auditoria finalizada',
        description: isDraft
          ? 'Seu progresso foi salvo e você pode continuar mais tarde.'
          : 'A auditoria foi concluída.',
      })

      if (!isDraft) {
        navigate('/auditoria-checklist/realizadas')
      } else {
        fetchData()
      }
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!execution) {
    return <div className="p-6">Auditoria não encontrada.</div>
  }

  const scoringSettings = audit?.scoring_settings || []
  const isFinalized =
    [
      'finalizado',
      'finalizada',
      'concluido',
      'concluído',
      'concluida',
      'concluída',
      'realizado',
      'realizada',
      'finished',
      'completed',
    ].includes(execution.status?.toLowerCase() || '') ||
    (execution.final_score !== null && execution.realization_date !== null)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{audit?.title}</h1>
            <p className="text-muted-foreground">
              {isFinalized ? 'Auditoria Finalizada' : 'Execução de Auditoria'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isFinalized && (
            <>
              <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar como Rascunho
              </Button>
              <Button onClick={() => handleSave(false)} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Finalizar Auditoria
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Gerais</CardTitle>
          <CardDescription>Preencha os participantes antes de iniciar a avaliação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Participantes</Label>
            <Input
              placeholder="Ex: João Silva, Maria Souza"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              disabled={isFinalized}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Critérios de Avaliação</h2>
        {actions.map((action, index) => (
          <Card key={action.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>
                  {index + 1}. {action.title}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  Peso: {action.weight}
                </span>
              </CardTitle>
              {action.evidence_required && (
                <CardDescription className="text-destructive font-medium">
                  * Evidência obrigatória para este critério
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nota</Label>
                    <Select
                      value={answers[action.id]?.score?.toString() || ''}
                      onValueChange={(val) => handleAnswerChange(action.id, 'score', parseInt(val))}
                      disabled={isFinalized}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma nota" />
                      </SelectTrigger>
                      <SelectContent>
                        {scoringSettings.map((setting: any) => (
                          <SelectItem key={setting.score} value={setting.score.toString()}>
                            {setting.score} - {setting.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      placeholder="Detalhes adicionais..."
                      value={answers[action.id]?.observations || ''}
                      onChange={(e) =>
                        handleAnswerChange(action.id, 'observations', e.target.value)
                      }
                      disabled={isFinalized}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Evidências (Fotos/Documentos)
                  </Label>
                  {isFinalized ? (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {Array.from(
                        new Set(
                          (answers[action.id]?.evidence_urls || []).concat(
                            answers[action.id]?.evidence_url
                              ? [answers[action.id]?.evidence_url]
                              : [],
                          ),
                        ),
                      ).map((url: string, i: number) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block relative aspect-square rounded-lg border bg-muted overflow-hidden hover:opacity-90 transition-opacity"
                        >
                          {url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                            <img src={url} alt="Evidência" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                              <span className="text-xs truncate w-full px-2">Ver Arquivo</span>
                            </div>
                          )}
                        </a>
                      ))}
                      {!answers[action.id]?.evidence_urls?.length &&
                        !answers[action.id]?.evidence_url && (
                          <span className="text-sm text-muted-foreground">Sem evidências</span>
                        )}
                    </div>
                  ) : (
                    <FileUpload
                      multiple
                      showThumbnails
                      bucket="documents"
                      existingUrls={Array.from(
                        new Set(
                          (answers[action.id]?.evidence_urls || []).concat(
                            answers[action.id]?.evidence_url
                              ? [answers[action.id]?.evidence_url]
                              : [],
                          ),
                        ),
                      )}
                      onUploadComplete={(urls) => {
                        handleAnswerChange(action.id, 'evidence_url', null)
                        handleAnswerChange(action.id, 'evidence_urls', urls)
                      }}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
