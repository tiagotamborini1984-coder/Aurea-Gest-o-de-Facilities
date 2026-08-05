import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Save,
  CheckCircle,
  ArrowLeft,
  Paperclip,
  Printer,
  CalendarDays,
  History,
  ClipboardList,
  Info,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react'
import { FileUpload } from '@/components/FileUpload'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { submitAuditExecution, reopenAuditExecution } from '@/services/audit'
import { format, parseISO, addDays, addWeeks, addMonths, addYears } from 'date-fns'

import { PrintLayout } from './components/PrintLayout'
import { PaginationControls } from './components/PaginationControls'

const ITEMS_PER_PAGE = 3

function calculateNextDate(frequency: string, baseDateStr: string | null) {
  if (!baseDateStr) return null
  const baseDate = parseISO(baseDateStr)
  switch (frequency?.toLowerCase()) {
    case 'diária':
    case 'diaria':
      return addDays(baseDate, 1)
    case 'semanal':
      return addWeeks(baseDate, 1)
    case 'quinzenal':
      return addDays(baseDate, 15)
    case 'mensal':
      return addMonths(baseDate, 1)
    case 'bimestral':
      return addMonths(baseDate, 2)
    case 'trimestral':
      return addMonths(baseDate, 3)
    case 'semestral':
      return addMonths(baseDate, 6)
    case 'anual':
      return addYears(baseDate, 1)
    default:
      return null
  }
}

function getStatusBadge(status: string) {
  const s = status?.toLowerCase() || ''
  if (
    [
      'finalizado',
      'finalizada',
      'concluído',
      'concluida',
      'concluido',
      'realizado',
      'realizada',
      'completed',
      'finished',
    ].includes(s)
  ) {
    return <Badge className="bg-green-500">Concluído</Badge>
  }
  if (['pendente', 'pending'].includes(s)) {
    return (
      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
        Pendente
      </Badge>
    )
  }
  if (['em andamento', 'rascunho', 'in progress'].includes(s)) {
    return (
      <Badge variant="secondary" className="text-blue-600">
        Em Andamento
      </Badge>
    )
  }
  return <Badge variant="secondary">{status || 'Pendente'}</Badge>
}

export default function AuditoriaDetalhes() {
  const [canPrint, setCanPrint] = useState(false)

  useEffect(() => {
    const handler = (e: any) => setCanPrint(e.detail)
    window.addEventListener('audit-loaded', handler)
    return () => window.removeEventListener('audit-loaded', handler)
  }, [])

  return (
    <div className="flex flex-col h-full w-full">
      {canPrint && (
        <div className="flex justify-end mb-4 print:hidden">
          <Button onClick={() => window.print()} variant="default" className="gap-2 shadow-sm">
            <Printer className="w-4 h-4" />
            Imprimir Relatório
          </Button>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <AuditoriaDetalhesInner />
      </div>
    </div>
  )
}

function AuditoriaDetalhesInner() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const submittingRef = useRef(false)
  const [execution, setExecution] = useState<any>(null)
  const [audit, setAudit] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [participants, setParticipants] = useState('')
  const [clientBrand, setClientBrand] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set())
  const [nonConformities, setNonConformities] = useState<any[]>([])
  const [allAuditIds, setAllAuditIds] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [id])

  const auditIdsKey = JSON.stringify(allAuditIds)
  useEffect(() => {
    const clientId = audit?.client_id
    if (!allAuditIds.length || !clientId) return

    const channels = allAuditIds.map((auditId) =>
      supabase
        .channel(`audit-nc-${auditId}-${execution?.plant_id || ''}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks', filter: `audit_id=eq.${auditId}` },
          async () => {
            const { data: ncData } = await supabase
              .from('tasks')
              .select(
                'id, task_number, title, description, due_date, assignee_id, status_id, audit_id, task_statuses(name, color), profiles!tasks_assignee_id_fkey(name)',
              )
              .in('audit_id', allAuditIds)
              .eq('client_id', clientId)
              .order('created_at', { ascending: false })
            setNonConformities(ncData || [])
          },
        )
        .subscribe(),
    )

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch))
    }
  }, [auditIdsKey, audit?.client_id])

  const fetchData = async () => {
    if (!id) return
    try {
      const { data: execData, error: execError } = await supabase
        .from('audit_executions')
        .select(`
          *,
          audits(*),
          plants(name),
          profiles(name)
        `)
        .eq('id', id)
        .single()

      if (execError) throw execError
      if (execData) {
        setExecution(execData)
        setAudit(execData.audits)
        setParticipants(execData.participants || '')

        if (execData.audits?.client_id) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('logo_url, primary_color')
            .eq('id', execData.audits.client_id)
            .single()
          setClientBrand(clientData)
        }

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

        const rootAuditId = execData.audits?.parent_audit_id || execData.audit_id

        const { data: childAudits } = await supabase
          .from('audits')
          .select('id')
          .eq('parent_audit_id', rootAuditId)

        const treeAuditIds = [rootAuditId, ...(childAudits || []).map((c: any) => c.id)]
        setAllAuditIds(treeAuditIds)

        const { data: histData } = await supabase
          .from('audit_executions')
          .select(`
            id,
            status,
            realization_date,
            final_score,
            max_score,
            created_at,
            audit_id,
            tasks ( task_number, due_date )
          `)
          .in('audit_id', treeAuditIds)
          .eq('plant_id', execData.plant_id)
          .order('created_at', { ascending: false })

        if (histData) setHistory(histData)

        const { data: ncData } = await supabase
          .from('tasks')
          .select(`
            id,
            task_number,
            title,
            description,
            due_date,
            assignee_id,
            status_id,
            audit_id,
            task_statuses(name, color),
            profiles!tasks_assignee_id_fkey(name)
          `)
          .in('audit_id', treeAuditIds)
          .eq('client_id', execData.audits.client_id)
          .order('created_at', { ascending: false })
        setNonConformities(ncData || [])

        window.dispatchEvent(new CustomEvent('audit-loaded', { detail: true }))

        window.dispatchEvent(new CustomEvent('audit-loaded', { detail: true }))
      } else {
        window.dispatchEvent(new CustomEvent('audit-loaded', { detail: false }))
      }
    } catch (err: any) {
      window.dispatchEvent(new CustomEvent('audit-loaded', { detail: false }))
      toast({
        title: 'Erro ao carregar auditoria',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setSaving(false)
      submittingRef.current = false
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
    if (!id || submittingRef.current) return

    if (!isDraft) {
      const errors = new Set<string>()
      actions.forEach((action) => {
        const answer = answers[action.id]

        let hasError = false
        if (!answer || answer.score === undefined || answer.score === null) {
          hasError = true
        }

        if (
          action.comments_required &&
          (!answer?.observations || answer.observations.trim() === '')
        ) {
          hasError = true
        }

        if (action.evidence_required && !answer?.evidence_urls?.length && !answer?.evidence_url) {
          hasError = true
        }

        if (hasError) {
          errors.add(action.id)
        }
      })

      if (errors.size > 0) {
        setValidationErrors(errors)
        toast({
          title: 'Validação necessária',
          description:
            'Preencha todos os campos obrigatórios (notas, observações e evidências exigidas) antes de finalizar.',
          variant: 'destructive',
        })
        return
      }
    }
    setValidationErrors(new Set())
    submittingRef.current = true
    setSaving(true)
    try {
      const formattedAnswers = Object.entries(answers).map(([action_id, val]) => ({
        action_id,
        ...val,
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
      submittingRef.current = false
    }
  }

  const handleReopen = async () => {
    if (!id) return
    try {
      setSaving(true)
      await reopenAuditExecution(id)
      toast({
        title: 'Auditoria reaberta',
        description: 'A auditoria foi reaberta e agora pode ser editada.',
      })
      setValidationErrors(new Set())
      fetchData()
    } catch (err: any) {
      toast({ title: 'Erro ao reabrir', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
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
    ].includes(execution?.status?.toLowerCase() || '') ||
    (execution?.final_score !== null && execution?.realization_date !== null)

  const allScoresFilled = actions.every((action) => {
    const answer = answers[action.id]
    return answer && answer.score !== undefined && answer.score !== null
  })

  const totalPages = Math.max(1, Math.ceil(actions.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedActions = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE
    return actions.slice(start, start + ITEMS_PER_PAGE)
  }, [actions, safeCurrentPage])

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

  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE

  // Derived calculations for the History & Schedule tab
  const completedHistory = history
    .filter(
      (h) =>
        [
          'finalizado',
          'concluído',
          'concluida',
          'realizada',
          'realizado',
          'concluido',
          'completed',
          'finished',
        ].includes(h.status?.toLowerCase() || '') || h.realization_date,
    )
    .sort((a, b) => {
      const dateA = a.realization_date
        ? new Date(a.realization_date).getTime()
        : new Date(a.created_at).getTime()
      const dateB = b.realization_date
        ? new Date(b.realization_date).getTime()
        : new Date(b.created_at).getTime()
      return dateB - dateA
    })
  const lastExecutionData = completedHistory[0]

  const pendingWithDueDate = history.find(
    (h) =>
      ![
        'finalizado',
        'concluído',
        'concluida',
        'realizada',
        'realizado',
        'concluido',
        'completed',
        'finished',
      ].includes(h.status?.toLowerCase() || '') && h.tasks?.due_date,
  )

  let nextScheduledDate = null
  if (pendingWithDueDate?.tasks?.due_date) {
    nextScheduledDate = pendingWithDueDate.tasks.due_date
  } else if (audit?.frequency && audit?.frequency !== 'Única') {
    const baseDate = lastExecutionData?.realization_date || audit.start_date
    nextScheduledDate = calculateNextDate(audit.frequency, baseDate)?.toISOString()
  }

  return (
    <>
      <PrintLayout
        execution={execution}
        actions={actions}
        answersMap={answers}
        clientBrand={clientBrand}
      />
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in-up print:hidden">
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
            {isFinalized ? (
              <>
                <Button onClick={() => window.print()} variant="outline" className="gap-2">
                  <Printer className="w-4 h-4" />
                  Imprimir Relatório
                </Button>
                <Button
                  onClick={handleReopen}
                  variant="outline"
                  className="gap-2"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Reabrir Auditoria
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar como Rascunho
                </Button>
                <Button
                  onClick={() => handleSave(false)}
                  disabled={saving || !allScoresFilled}
                  title={!allScoresFilled ? 'Preencha todas as notas para finalizar' : undefined}
                >
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

        <Tabs defaultValue="checklist" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="checklist" className="gap-2">
              <ClipboardList className="w-4 h-4" /> Checklist
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <History className="w-4 h-4" /> Histórico & Agendamento
            </TabsTrigger>
            <TabsTrigger value="nao-conformidades" className="gap-2">
              <AlertTriangle className="w-4 h-4" /> Não Conformidades
              {nonConformities.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center bg-amber-500 text-white text-xs font-medium rounded-full px-1.5 min-w-[20px] h-5">
                  {nonConformities.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
                <CardDescription>
                  Preencha os participantes antes de iniciar a avaliação
                </CardDescription>
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
              {paginatedActions.map((action, index) => (
                <Card key={action.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>
                        {startIndex + index + 1}. {action.title}
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
                          <Label>
                            Nota <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={answers[action.id]?.score?.toString() || ''}
                            onValueChange={(val) => {
                              handleAnswerChange(action.id, 'score', parseInt(val))
                              setValidationErrors((prev) => {
                                const next = new Set(prev)
                                next.delete(action.id)
                                return next
                              })
                            }}
                            disabled={isFinalized}
                          >
                            <SelectTrigger
                              className={
                                validationErrors.has(action.id)
                                  ? 'border-red-500 ring-2 ring-red-500/20'
                                  : ''
                              }
                            >
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
                          {validationErrors.has(action.id) && (
                            <p className="text-sm text-red-500 font-medium">Nota obrigatória</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>
                            Observações{' '}
                            {action.comments_required && <span className="text-red-500">*</span>}
                          </Label>
                          <Textarea
                            placeholder="Detalhes adicionais..."
                            value={answers[action.id]?.observations || ''}
                            onChange={(e) => {
                              handleAnswerChange(action.id, 'observations', e.target.value)
                              if (action.comments_required && e.target.value.trim() !== '') {
                                setValidationErrors((prev) => {
                                  const next = new Set(prev)
                                  next.delete(action.id)
                                  return next
                                })
                              }
                            }}
                            disabled={isFinalized}
                            className={
                              validationErrors.has(action.id) &&
                              action.comments_required &&
                              (!answers[action.id]?.observations ||
                                answers[action.id]?.observations.trim() === '')
                                ? 'border-red-500 ring-2 ring-red-500/20'
                                : ''
                            }
                          />
                          {validationErrors.has(action.id) &&
                            action.comments_required &&
                            (!answers[action.id]?.observations ||
                              answers[action.id]?.observations.trim() === '') && (
                              <p className="text-sm text-red-500 font-medium">
                                Observação obrigatória
                              </p>
                            )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4" />
                          Evidências (Fotos/Documentos){' '}
                          {action.evidence_required && <span className="text-red-500">*</span>}
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
                                {url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                  <img
                                    src={url}
                                    alt="Evidência"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                    <span className="text-xs truncate w-full px-2">
                                      Ver Arquivo
                                    </span>
                                  </div>
                                )}
                              </a>
                            ))}
                            {!answers[action.id]?.evidence_urls?.length &&
                              !answers[action.id]?.evidence_url && (
                                <span className="text-sm text-muted-foreground">
                                  Sem evidências
                                </span>
                              )}
                          </div>
                        ) : (
                          <div
                            className={
                              validationErrors.has(action.id) &&
                              action.evidence_required &&
                              !answers[action.id]?.evidence_urls?.length &&
                              !answers[action.id]?.evidence_url
                                ? 'p-2 border border-red-500 rounded-md ring-2 ring-red-500/20'
                                : ''
                            }
                          >
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
                                if (action.evidence_required && urls.length > 0) {
                                  setValidationErrors((prev) => {
                                    const next = new Set(prev)
                                    next.delete(action.id)
                                    return next
                                  })
                                }
                              }}
                            />
                            {validationErrors.has(action.id) &&
                              action.evidence_required &&
                              !answers[action.id]?.evidence_urls?.length &&
                              !answers[action.id]?.evidence_url && (
                                <p className="text-sm text-red-500 font-medium mt-1">
                                  Evidência obrigatória
                                </p>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <PaginationControls
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </TabsContent>

          <TabsContent value="historico" className="space-y-6 animate-fade-in-up">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  Resumo do Agendamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Frequência</p>
                    <p className="text-base font-semibold">{audit?.frequency || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data de Início</p>
                    <p className="text-base font-semibold">
                      {audit?.start_date ? format(parseISO(audit.start_date), 'dd/MM/yyyy') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Última Auditoria</p>
                    <p className="text-base font-semibold">
                      {lastExecutionData?.realization_date
                        ? format(parseISO(lastExecutionData.realization_date), 'dd/MM/yyyy')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Próxima Agendada</p>
                    <p className="text-base font-semibold">
                      {nextScheduledDate ? format(parseISO(nextScheduledDate), 'dd/MM/yyyy') : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Histórico de Execuções
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="flex items-center justify-center p-6 text-muted-foreground gap-2">
                    <Info className="w-5 h-5" />
                    Nenhum histórico encontrado para esta planta.
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tarefa</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data de Realização</TableHead>
                          <TableHead>Pontuação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((h) => {
                          const isCompleted =
                            [
                              'finalizado',
                              'concluído',
                              'concluida',
                              'concluido',
                              'realizado',
                              'realizada',
                              'completed',
                              'finished',
                            ].includes(h.status?.toLowerCase() || '') || h.realization_date

                          let scoreDisplay = '-'
                          if (isCompleted) {
                            if (h.final_score !== null && h.max_score !== null) {
                              scoreDisplay = `${h.final_score} / ${h.max_score}`
                            } else {
                              scoreDisplay = 'Processando'
                            }
                          }

                          return (
                            <TableRow
                              key={h.id}
                              className="cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => navigate(`/auditoria-checklist/detalhes/${h.id}`)}
                            >
                              <TableCell className="font-medium text-primary hover:underline">
                                {h.tasks?.task_number || '-'}
                              </TableCell>
                              <TableCell>{getStatusBadge(h.status)}</TableCell>
                              <TableCell>
                                {h.realization_date
                                  ? format(parseISO(h.realization_date), 'dd/MM/yyyy')
                                  : '-'}
                              </TableCell>
                              <TableCell className="font-medium">{scoreDisplay}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nao-conformidades" className="space-y-6 animate-fade-in-up">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Não Conformidades Geradas
                </CardTitle>
                <CardDescription>
                  Tarefas de não conformidade criadas automaticamente a partir desta auditoria.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {nonConformities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <AlertTriangle className="w-12 h-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">
                      Nenhuma não conformidade encontrada para esta auditoria.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Número</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead>Prazo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nonConformities.map((nc) => (
                          <TableRow
                            key={nc.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() =>
                              navigate('/gestao-tarefas', { state: { taskId: nc.id } })
                            }
                          >
                            <TableCell className="font-medium text-primary hover:underline">
                              {nc.task_number || '-'}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {nc.title || nc.description || '-'}
                            </TableCell>
                            <TableCell>
                              {nc.task_statuses ? (
                                <Badge
                                  variant="outline"
                                  style={{
                                    borderColor: nc.task_statuses.color,
                                    color: nc.task_statuses.color,
                                  }}
                                >
                                  {nc.task_statuses.name}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">-</Badge>
                              )}
                            </TableCell>
                            <TableCell>{nc.profiles?.name || '-'}</TableCell>
                            <TableCell>
                              {nc.due_date ? format(parseISO(nc.due_date), 'dd/MM/yyyy') : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
