import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, FileText, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function AuditoriaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const [execution, setExecution] = useState<any>(null)
  const [answers, setAnswers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchDetails()
  }, [id])

  const fetchDetails = async () => {
    try {
      const [execRes, ansRes] = await Promise.all([
        supabase
          .from('audit_executions')
          .select(`
            *,
            audits ( title, type, scoring_settings ),
            plants ( name ),
            profiles!audit_executions_assignee_id_fkey ( name )
          `)
          .eq('id', id)
          .single(),
        supabase
          .from('audit_execution_answers')
          .select(`
            *,
            audit_actions ( title, weight, order_index )
          `)
          .eq('execution_id', id),
      ])

      if (execRes.error) throw execRes.error
      if (ansRes.error) throw ansRes.error

      setExecution(execRes.data)
      setAnswers(
        (ansRes.data || []).sort(
          (a, b) => (a.audit_actions?.order_index || 0) - (b.audit_actions?.order_index || 0),
        ),
      )
    } catch (error) {
      console.error('Error fetching details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!execution) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">Auditoria não encontrada.</div>
      </div>
    )
  }

  const scorePercentage =
    execution.max_score > 0 ? (execution.final_score / execution.max_score) * 100 : 0

  const getScoreDescription = (score: number) => {
    if (!execution.audits?.scoring_settings) return `${score}`
    const setting = execution.audits.scoring_settings.find((s: any) => Number(s.score) === score)
    return setting ? setting.description : `${score}`
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/auditoria-checklist/realizadas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Detalhes da Auditoria</h1>
          <p className="text-muted-foreground">{execution.audits?.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Planta</p>
              <p className="font-medium">{execution.plants?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Auditor</p>
              <p className="font-medium">{execution.profiles?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data de Realização</p>
              <p className="font-medium">
                {execution.realization_date
                  ? format(new Date(execution.realization_date), 'dd/MM/yyyy')
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Participantes</p>
              <p className="font-medium">{execution.participants || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="outline" className="mt-1">
                {execution.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pontuação Final</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="text-5xl font-bold text-primary">{execution.final_score ?? 0}</div>
            <div className="text-muted-foreground mt-2">
              de {execution.max_score ?? 0} pontos possíveis
            </div>
            <div className="w-full bg-secondary h-3 mt-6 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${scorePercentage >= 80 ? 'bg-green-500' : scorePercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(scorePercentage, 100)}%` }}
              />
            </div>
            <div className="text-sm font-medium mt-2">
              {scorePercentage.toFixed(1)}% de conformidade
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-4">Respostas do Checklist</h2>
      <div className="space-y-4">
        {answers.map((answer, index) => (
          <Card key={answer.id}>
            <CardHeader className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-xs font-medium shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <CardTitle className="text-base leading-snug">
                      {answer.audit_actions?.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Peso: {answer.audit_actions?.weight || 1}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    Nota: {answer.score ?? 'N/A'}{' '}
                    {answer.score !== null ? `- ${getScoreDescription(answer.score)}` : ''}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            {(answer.observations || answer.evidence_url) && (
              <>
                <Separator />
                <CardContent className="py-4 bg-muted/20">
                  <div className="grid gap-4">
                    {answer.observations && (
                      <div className="flex gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium mb-1">Observações</p>
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {answer.observations}
                          </p>
                        </div>
                      </div>
                    )}
                    {answer.evidence_url && (
                      <div className="flex gap-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium mb-1">Evidência Anexada</p>
                          <a
                            href={answer.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            Ver anexo
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
