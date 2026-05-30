import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Printer,
  Calendar,
  MapPin,
  User,
  FileText,
  Link as LinkIcon,
  XCircle,
} from 'lucide-react'
import { format } from 'date-fns'

// Types
interface AuditExecution {
  id: string
  audit_id: string
  plant_id: string
  assignee_id: string
  status: string
  realization_date: string | null
  participants: string | null
  final_score: number | null
  max_score: number | null
  signatures: any
  audits: {
    id: string
    title: string
    type: string
    scoring_settings: any
  } | null
  plants: {
    name: string
  } | null
  profiles: {
    name: string
  } | null
}

interface Answer {
  id: string
  score: number | null
  observations: string | null
  evidence_url: string | null
  audit_actions: {
    id: string
    title: string
    weight: number
    order_index: number
  } | null
}

export default function AuditoriaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [execution, setExecution] = useState<AuditExecution | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const { data: execData, error: execError } = await supabase
          .from('audit_executions')
          .select(`
            *,
            audits ( id, title, type, scoring_settings ),
            plants ( name ),
            profiles:assignee_id ( name )
          `)
          .eq('id', id)
          .maybeSingle()

        if (execError || !execData) {
          setNotFound(true)
          return
        }

        // @ts-expect-error
        setExecution(execData)

        const { data: ansData } = await supabase
          .from('audit_execution_answers')
          .select(`
            id, score, observations, evidence_url,
            audit_actions ( id, title, weight, order_index )
          `)
          .eq('execution_id', id)

        if (ansData) {
          const sorted = [...ansData].sort((a, b) => {
            const aIndex = (a.audit_actions as any)?.order_index || 0
            const bIndex = (b.audit_actions as any)?.order_index || 0
            return aIndex - bIndex
          })
          // @ts-expect-error
          setAnswers(sorted)
        }

        if (execData.audit_id) {
          const { data: histData } = await supabase
            .from('audit_executions')
            .select('id, realization_date, final_score, max_score, status')
            .eq('audit_id', execData.audit_id)
            .neq('id', id)
            .eq('status', 'Finalizado')
            .order('realization_date', { ascending: false })
            .limit(5)

          if (histData) {
            setHistory(histData)
          }
        }
      } catch (error) {
        console.error(error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !execution) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <XCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Auditoria não encontrada</h2>
        <p className="text-muted-foreground mb-6">
          A execução solicitada não existe ou foi removida.
        </p>
        <Button onClick={() => navigate('/auditoria-checklist/realizadas')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para a lista
        </Button>
      </div>
    )
  }

  const handlePrint = () => {
    window.print()
  }

  const scoringSettings = execution.audits?.scoring_settings || []

  const getScoreDescription = (score: number | null) => {
    if (score === null) return 'N/A'
    if (Array.isArray(scoringSettings)) {
      const match = scoringSettings.find((s: any) => Number(s.score) === Number(score))
      if (match) return match.description
    }
    return score.toString()
  }

  const scorePercentage =
    execution.max_score && execution.final_score != null
      ? Math.round((execution.final_score / execution.max_score) * 100)
      : 0

  const renderSignatures = () => {
    if (
      !execution.signatures ||
      !Array.isArray(execution.signatures) ||
      execution.signatures.length === 0
    ) {
      return <p className="text-sm text-muted-foreground">Nenhuma assinatura registrada.</p>
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        {execution.signatures.map((sig: any, index: number) => (
          <div
            key={index}
            className="border p-4 rounded-md flex flex-col items-center justify-center bg-slate-50 print:border-black print:bg-white"
          >
            {sig.image ? (
              <img
                src={sig.image}
                alt={`Assinatura ${index + 1}`}
                className="max-h-24 object-contain mb-2 mix-blend-multiply"
              />
            ) : (
              <div className="h-24 flex items-center justify-center text-muted-foreground">
                Sem imagem
              </div>
            )}
            <div className="border-t w-full text-center pt-2 mt-2 print:border-black">
              <p className="text-sm font-medium">{sig.name || `Participante ${index + 1}`}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const dStr = dateString.includes('T') ? dateString : `${dateString}T12:00:00Z`
    return format(new Date(dStr), 'dd/MM/yyyy')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/auditoria-checklist/realizadas')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Detalhes da Auditoria</h1>
            <p className="text-muted-foreground text-sm">Visualização de execução concluída</p>
          </div>
        </div>
        <Button onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="text-3xl font-bold mb-2">Relatório de Auditoria</h1>
        <p className="text-muted-foreground">
          Impresso em {format(new Date(), 'dd/MM/yyyy HH:mm')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="print:shadow-none print:border-black print:break-inside-avoid">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{execution.audits?.title}</CardTitle>
                  <CardDescription className="print:text-black">
                    {execution.plants?.name}
                  </CardDescription>
                </div>
                <Badge
                  variant={execution.status === 'Finalizado' ? 'default' : 'secondary'}
                  className="print:border print:border-black print:text-black"
                >
                  {execution.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Data
                  </p>
                  <p className="font-medium">{formatDate(execution.realization_date)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> Responsável
                  </p>
                  <p className="font-medium">{execution.profiles?.name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Pontuação
                  </p>
                  <p className="font-medium">
                    {execution.final_score} / {execution.max_score} ({scorePercentage}%)
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Local
                  </p>
                  <p className="font-medium">{execution.plants?.name || '-'}</p>
                </div>
              </div>

              {execution.participants && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold mb-2">Participantes</h3>
                  <p className="text-sm text-muted-foreground print:text-black">
                    {execution.participants}
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold mb-2">Assinaturas</h3>
                {renderSignatures()}
              </div>
            </CardContent>
          </Card>

          <Card className="print:shadow-none print:border-black">
            <CardHeader>
              <CardTitle>Checklist</CardTitle>
              <CardDescription className="print:text-black">
                Respostas e evidências registradas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {answers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma resposta registrada.</p>
              ) : (
                answers.map((answer, index) => (
                  <div
                    key={answer.id}
                    className="border-b last:border-0 pb-4 last:pb-0 print:border-black print:break-inside-avoid"
                  >
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <div className="flex-1">
                        <span className="font-medium text-sm block">
                          {index + 1}. {answer.audit_actions?.title}
                        </span>
                        {answer.observations && (
                          <p className="text-sm text-muted-foreground mt-1 bg-slate-50 p-2 rounded print:bg-white print:border print:border-slate-200">
                            <span className="font-medium text-slate-700 print:text-black">
                              Obs:
                            </span>{' '}
                            {answer.observations}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 whitespace-nowrap print:border-black print:text-black"
                      >
                        Nota: {answer.score ?? 'N/A'} - {getScoreDescription(answer.score)}
                      </Badge>
                    </div>
                    {answer.evidence_url && (
                      <div className="mt-2">
                        <a
                          href={answer.evidence_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1 print:hidden"
                        >
                          <LinkIcon className="w-3 h-3" />
                          Ver Evidência
                        </a>
                        <p className="text-xs text-muted-foreground hidden print:block break-all">
                          Evidência: {answer.evidence_url}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle>Histórico de Execuções</CardTitle>
              <CardDescription>Últimas realizações desta auditoria</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum histórico encontrado.</p>
              ) : (
                <div className="space-y-4">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="flex justify-between items-center border-b last:border-0 pb-3 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{formatDate(h.realization_date)}</p>
                        <p className="text-xs text-muted-foreground">
                          Nota: {h.final_score} / {h.max_score}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/auditoria-checklist/detalhes/${h.id}`)}
                      >
                        Ver
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
