import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  FileText,
  AlertCircle,
  Clock,
  CheckSquare,
  PenTool,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'

export default function AuditoriaDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('')
  const [execution, setExecution] = useState<any>(null)
  const [pastExecutions, setPastExecutions] = useState<any[]>([])
  const [nextExecution, setNextExecution] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      if (!user || !id) return

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const userRole = profile?.role || ''
        setRole(userRole)

        const { data: execData, error: execError } = await supabase
          .from('audit_executions')
          .select(`
            *,
            audits (*),
            plants (name),
            profiles (name),
            audit_execution_answers (
              *,
              audit_actions (*)
            )
          `)
          .eq('id', id)
          .single()

        if (execError) throw execError
        setExecution(execData)

        if (userRole === 'Administrador' || userRole === 'Master') {
          const { data: historyData } = await supabase
            .from('audit_executions')
            .select(`
              id, status, realization_date, final_score, max_score, created_at,
              tasks ( due_date )
            `)
            .eq('audit_id', execData.audit_id)
            .eq('plant_id', execData.plant_id)
            .order('created_at', { ascending: false })
            .limit(50)

          if (historyData) {
            const next = historyData.find((e) => e.status === 'Pendente' || e.status === 'Rascunho')
            const past = historyData.filter((e) => e.status === 'Finalizado' && e.id !== id)

            setNextExecution(next)
            setPastExecutions(past)
          }
        }
      } catch (err) {
        console.error('Error fetching audit details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, id])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!execution) {
    return (
      <div className="p-6">
        <div className="text-center py-10">
          <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">Auditoria não encontrada</h2>
          <Button variant="link" onClick={() => navigate('/auditoria-checklist/realizadas')}>
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  const isAdminOrMaster = role === 'Administrador' || role === 'Master'
  const isUnique = execution.audits?.frequency === 'Única'

  const getDueDate = (exec: any) => {
    if (!exec || !exec.tasks) return null
    return Array.isArray(exec.tasks) ? exec.tasks[0]?.due_date : exec.tasks.due_date
  }

  const nextDueDate = getDueDate(nextExecution)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Detalhes da Auditoria</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={isAdminOrMaster ? 'md:col-span-2 space-y-6' : 'md:col-span-3 space-y-6'}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {execution.audits?.title}
              </CardTitle>
              <CardDescription>Realizada na planta {execution.plants?.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Responsável</p>
                  <p className="font-medium">{execution.profiles?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data de Realização</p>
                  <p className="font-medium">
                    {execution.realization_date
                      ? format(new Date(execution.realization_date), 'dd/MM/yyyy', { locale: ptBR })
                      : 'Não realizada'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={execution.status === 'Finalizado' ? 'default' : 'secondary'}>
                    {execution.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pontuação</p>
                  <p className="font-medium">
                    {execution.final_score !== null ? execution.final_score : '-'} /{' '}
                    {execution.max_score !== null ? execution.max_score : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Respostas do Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              {execution.audit_execution_answers && execution.audit_execution_answers.length > 0 ? (
                <div className="space-y-4">
                  {execution.audit_execution_answers.map((ans: any) => (
                    <div key={ans.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <p className="font-medium">{ans.audit_actions?.title}</p>
                        <Badge variant="outline" className="shrink-0 bg-secondary/50">
                          Nota: {ans.score ?? '-'}
                        </Badge>
                      </div>
                      {ans.observations && (
                        <div className="bg-muted p-3 rounded-md text-sm">
                          <span className="font-semibold text-muted-foreground mr-2">
                            Observações:
                          </span>
                          {ans.observations}
                        </div>
                      )}
                      {ans.evidence_url && (
                        <div>
                          <a
                            href={ans.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 w-fit"
                          >
                            <FileText className="h-4 w-4" /> Ver Evidência Anexada
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Nenhuma resposta registrada no checklist para esta auditoria.
                </p>
              )}
            </CardContent>
          </Card>

          {execution.signatures &&
            Array.isArray(execution.signatures) &&
            execution.signatures.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PenTool className="h-5 w-5" />
                    Assinaturas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {execution.signatures.map((sig: any, index: number) => (
                      <div
                        key={index}
                        className="border p-3 rounded-md flex flex-col items-center justify-center gap-2 bg-muted/20"
                      >
                        {sig.signature_url ? (
                          <img
                            src={sig.signature_url}
                            alt={`Assinatura de ${sig.name}`}
                            className="h-16 object-contain"
                          />
                        ) : (
                          <div className="h-16 flex items-center justify-center text-muted-foreground text-xs italic">
                            Sem Imagem
                          </div>
                        )}
                        <p className="text-sm font-medium text-center">{sig.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>

        {isAdminOrMaster && (
          <div className="space-y-6">
            <Card className="border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Próxima Auditoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isUnique ? (
                  <p className="text-sm text-muted-foreground">
                    Auditoria de frequência única. Nenhuma execução futura agendada.
                  </p>
                ) : nextExecution ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Data Agendada (Due Date)</p>
                      <p className="font-medium text-base">
                        {nextDueDate
                          ? format(new Date(nextDueDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : 'A definir'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <Badge variant="outline" className="bg-white dark:bg-black">
                        {nextExecution.status}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => {
                        navigate(`/auditoria-checklist/detalhes/${nextExecution.id}`)
                      }}
                    >
                      Ver Tarefa da Próxima
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma execução futura agendada no momento.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Histórico de Execuções
                </CardTitle>
                <CardDescription>Últimas auditorias na mesma planta</CardDescription>
              </CardHeader>
              <CardContent>
                {pastExecutions.length > 0 ? (
                  <div className="space-y-3">
                    {pastExecutions.map((past) => (
                      <div
                        key={past.id}
                        className="flex flex-col gap-1 border rounded-md p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">
                            {past.realization_date
                              ? format(new Date(past.realization_date), 'dd/MM/yyyy', {
                                  locale: ptBR,
                                })
                              : format(new Date(past.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          <Badge
                            variant={
                              past.final_score &&
                              past.max_score &&
                              past.final_score === past.max_score
                                ? 'default'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {past.final_score}/{past.max_score} pts
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-muted-foreground">{past.status}</span>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs text-blue-600"
                            onClick={() => navigate(`/auditoria-checklist/detalhes/${past.id}`)}
                          >
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md text-center">
                    Nenhum histórico passado encontrado.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
