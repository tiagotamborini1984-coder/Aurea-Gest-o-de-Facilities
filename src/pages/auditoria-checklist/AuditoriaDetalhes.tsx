import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, FileText, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function AuditoriaDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [execution, setExecution] = useState<any>(null)
  const [answers, setAnswers] = useState<any[]>([])

  useEffect(() => {
    if (id) fetchDetails()
  }, [id])

  const fetchDetails = async () => {
    try {
      setLoading(true)
      const { data: execData, error: execError } = await supabase
        .from('audit_executions')
        .select(`
          *,
          audits (title, type, scoring_settings),
          plants (name),
          profiles (name)
        `)
        .eq('id', id)
        .single()

      if (execError) throw execError
      setExecution(execData)

      const { data: answersData, error: answersError } = await supabase
        .from('audit_execution_answers')
        .select(`
          *,
          audit_actions (title, order_index, weight)
        `)
        .eq('execution_id', id)
        .order('order_index', { referencedTable: 'audit_actions', ascending: true })

      if (answersError) throw answersError
      setAnswers(answersData || [])
    } catch (err: any) {
      toast({ title: 'Erro ao carregar', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  let averageScore = 0
  let maxScale = 5

  if (execution?.audits?.scoring_settings) {
    const scores = (execution.audits.scoring_settings as any[]).map((s) => Number(s.score) || 5)
    if (scores.length > 0) {
      maxScale = Math.max(...scores)
    }
  }

  if (execution?.final_score !== null && execution?.max_score) {
    averageScore = (execution.final_score / execution.max_score) * maxScale
  }

  const getStatusColor = (status: string) => {
    if (status === 'Finalizado') return 'bg-green-500 hover:bg-green-600 text-white'
    return 'bg-blue-500 hover:bg-blue-600 text-white'
  }

  const getScoreColor = (score: number | null) => {
    if (score === null || score === undefined) return 'bg-gray-200 text-gray-800 border-gray-300'
    if (score >= 4) return 'bg-green-500 text-white border-green-600'
    if (score >= 3) return 'bg-yellow-500 text-white border-yellow-600'
    return 'bg-red-500 text-white border-red-600'
  }

  const getOverallBgColor = (score: number) => {
    if (execution?.final_score === null || !execution?.max_score)
      return 'bg-muted text-muted-foreground'
    if (score >= 4) return 'bg-green-500 text-white'
    if (score >= 3) return 'bg-yellow-500 text-white'
    return 'bg-red-500 text-white'
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!execution) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500" />
        <h2 className="text-xl font-semibold">Auditoria não encontrada</h2>
        <Button onClick={() => navigate('/auditoria-checklist/realizadas')}>Voltar</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{execution.audits?.title}</h1>
          <p className="text-muted-foreground">
            Planta: {execution.plants?.name} | Responsável: {execution.profiles?.name}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(execution.status)}>{execution.status}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Data de Realização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {execution.realization_date
                ? new Date(execution.realization_date + 'T00:00:00').toLocaleDateString('pt-BR')
                : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pontuação (Bruta)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {execution.final_score !== null ? execution.final_score : '-'} /{' '}
              {execution.max_score !== null ? execution.max_score : '-'}
            </div>
          </CardContent>
        </Card>

        <Card className={`${getOverallBgColor(averageScore)} border-0`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Resultado Geral (0 a {maxScale})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {execution.final_score !== null && execution.max_score
                ? averageScore.toFixed(2)
                : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Detalhes do Checklist</CardTitle>
          <CardDescription>Respostas e pontuações por item</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {answers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma resposta registrada.
                </p>
              ) : (
                answers.map((answer) => (
                  <div key={answer.id} className="flex flex-col gap-2 p-4 border rounded-lg">
                    <div className="flex justify-between items-start gap-4">
                      <div className="font-medium flex-1">{answer.audit_actions?.title}</div>
                      <div
                        className={`px-3 py-1 rounded-md border font-bold flex items-center gap-2 whitespace-nowrap ${getScoreColor(answer.score)}`}
                      >
                        {answer.score === null ? (
                          'N/A'
                        ) : (
                          <>
                            {answer.score >= 4 && <CheckCircle2 className="h-4 w-4" />}
                            {answer.score === 3 && <AlertTriangle className="h-4 w-4" />}
                            {answer.score <= 2 && <XCircle className="h-4 w-4" />}
                            Nota: {answer.score}
                          </>
                        )}
                      </div>
                    </div>
                    {answer.observations && (
                      <div className="text-sm text-muted-foreground mt-2 bg-muted p-3 rounded-md">
                        <strong className="block mb-1 text-foreground">Observações:</strong>
                        {answer.observations}
                      </div>
                    )}
                    {answer.evidence_url && (
                      <div className="mt-2">
                        <a
                          href={answer.evidence_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 w-fit"
                        >
                          <FileText className="h-4 w-4" />
                          Visualizar Evidência
                        </a>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
