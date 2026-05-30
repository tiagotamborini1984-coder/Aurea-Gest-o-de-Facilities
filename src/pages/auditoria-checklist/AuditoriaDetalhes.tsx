import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  ClipboardList,
  Building,
  User,
  History,
  XCircle,
  CalendarDays,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AuditoriaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [execution, setExecution] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !user) return

    async function fetchData() {
      try {
        setLoading(true)
        setError(false)

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user!.id)
          .single()

        const role = profile?.role || 'Operacional'
        setUserRole(role)

        const { data: execData, error: execError } = await supabase
          .from('audit_executions')
          .select(`
            *,
            audits (*),
            plants (name),
            profiles!audit_executions_assignee_id_fkey (name),
            audit_execution_answers (
              id,
              score,
              observations,
              audit_actions (title, weight)
            )
          `)
          .eq('id', id)
          .single()

        if (execError || !execData) {
          setError(true)
          setLoading(false)
          return
        }

        setExecution(execData)

        if (role === 'Master' || role === 'Administrador') {
          const { data: historyData } = await supabase
            .from('audit_executions')
            .select('id, status, realization_date, created_at, final_score, max_score')
            .eq('audit_id', execData.audit_id)
            .eq('plant_id', execData.plant_id)
            .neq('id', execData.id)
            .order('created_at', { ascending: false })
            .limit(10)

          if (historyData) setHistory(historyData)
        }

        setLoading(false)
      } catch (err) {
        setError(true)
        setLoading(false)
      }
    }

    fetchData()
  }, [id, user])

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !execution) {
    return (
      <div className="container mx-auto p-6 max-w-6xl animate-fade-in">
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <XCircle className="h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold">Auditoria não encontrada</h1>
          <p className="text-muted-foreground">
            O registro solicitado não existe ou você não tem permissão para visualizá-lo.
          </p>
          <Button onClick={() => navigate('/auditoria-checklist/realizadas')} className="mt-4">
            Voltar para Auditorias
          </Button>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    if (status === 'Finalizado') {
      return <Badge className="bg-green-500 hover:bg-green-600 border-none">Finalizado</Badge>
    }
    if (status === 'Pendente') {
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-500 text-white hover:bg-yellow-600 border-none"
        >
          Pendente
        </Badge>
      )
    }
    if (status === 'Rascunho') {
      return <Badge variant="outline">Rascunho</Badge>
    }
    return <Badge variant="outline">{status}</Badge>
  }

  const finalScore = execution.final_score || 0
  const maxScore = execution.max_score || 0
  const percentage = maxScore > 0 ? (finalScore / maxScore) * 100 : 0

  const getScoreBgColor = (perc: number) => {
    if (perc >= 80)
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
    if (perc >= 50)
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'
    return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
  }

  const isAdmin = userRole === 'Master' || userRole === 'Administrador'

  let nextDateStr = ''
  if (isAdmin && execution.status === 'Finalizado' && execution.audits?.frequency !== 'Única') {
    const baseDate = execution.realization_date || execution.created_at
    const d = new Date(baseDate.includes('T') ? baseDate : baseDate + 'T00:00:00Z')
    switch (execution.audits?.frequency) {
      case 'Diária':
        d.setUTCDate(d.getUTCDate() + 1)
        break
      case 'Semanal':
        d.setUTCDate(d.getUTCDate() + 7)
        break
      case 'Mensal':
        d.setUTCMonth(d.getUTCMonth() + 1)
        break
      case 'Semestral':
        d.setUTCMonth(d.getUTCMonth() + 6)
        break
      case 'Anual':
        d.setUTCFullYear(d.getUTCFullYear() + 1)
        break
    }

    if (!isNaN(d.getTime())) {
      nextDateStr = format(d, 'dd/MM/yyyy', { locale: ptBR })
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Detalhes da Auditoria</h1>
          <p className="text-muted-foreground">Visualize os resultados e histórico da execução</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl break-words mr-4">
                  {execution.audits?.title}
                </CardTitle>
                <div className="shrink-0">{getStatusBadge(execution.status)}</div>
              </div>
              <CardDescription>Informações gerais sobre a execução</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">Planta:</span>
                  <span className="text-sm truncate" title={execution.plants?.name}>
                    {execution.plants?.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">Responsável:</span>
                  <span className="text-sm truncate" title={execution.profiles?.name}>
                    {execution.profiles?.name || 'Não atribuído'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">Frequência:</span>
                  <span className="text-sm">{execution.audits?.frequency}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">Data de Realização:</span>
                  <span className="text-sm">
                    {execution.realization_date
                      ? format(new Date(execution.realization_date + 'T00:00:00Z'), 'dd/MM/yyyy')
                      : 'Não realizada'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5" />
                Respostas do Checklist ({execution.audit_execution_answers?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {execution.audit_execution_answers?.map((answer: any) => (
                  <div key={answer.id} className="p-4 border rounded-lg bg-card shadow-sm">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <p className="font-medium text-sm md:text-base">
                        {answer.audit_actions?.title}
                      </p>
                      <Badge variant="outline" className="whitespace-nowrap shrink-0">
                        Peso: {answer.audit_actions?.weight || 1}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm text-muted-foreground">Nota recebida:</span>
                      {answer.score !== null ? (
                        <Badge className="bg-primary text-primary-foreground text-sm font-bold px-2 py-0.5">
                          {answer.score}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-sm">
                          N/A
                        </Badge>
                      )}
                    </div>

                    {answer.observations && (
                      <div className="text-sm bg-muted/50 p-3 rounded-md border border-border/50">
                        <p className="font-medium mb-1 text-xs text-muted-foreground uppercase tracking-wider">
                          Observações
                        </p>
                        <p className="text-foreground break-words">{answer.observations}</p>
                      </div>
                    )}
                  </div>
                ))}

                {(!execution.audit_execution_answers ||
                  execution.audit_execution_answers.length === 0) && (
                  <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                    Nenhuma resposta registrada para esta execução.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Pontuação */}
          <Card className={`border-2 shadow-sm ${getScoreBgColor(percentage)}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-center">Resultado Final</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-2">
                <div className="text-5xl font-bold tracking-tighter mb-2">
                  {percentage.toFixed(1)}%
                </div>
                <div className="text-sm opacity-80 font-medium text-center">
                  {finalScore} de {maxScore} pontos possíveis
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Only: Next Date */}
          {isAdmin && nextDateStr && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-md flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Próxima Auditoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Agendada para:</span>
                  <span className="font-medium bg-muted px-2 py-1 rounded-md">{nextDateStr}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin Only: History */}
          {isAdmin && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-md flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Histórico de Realizações
                </CardTitle>
                <CardDescription className="text-xs">
                  Últimas auditorias nesta planta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {history.length > 0 ? (
                    history.map((hist) => {
                      const histPerc =
                        hist.max_score > 0 ? (hist.final_score / hist.max_score) * 100 : 0
                      return (
                        <div
                          key={hist.id}
                          className="flex flex-col gap-2 p-3 border rounded-md bg-card/50 hover:bg-card transition-colors group cursor-pointer"
                          onClick={() => navigate(`/auditoria-checklist/detalhes/${hist.id}`)}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium group-hover:text-primary transition-colors">
                              {hist.realization_date
                                ? format(
                                    new Date(hist.realization_date + 'T00:00:00Z'),
                                    'dd/MM/yyyy',
                                  )
                                : format(new Date(hist.created_at), 'dd/MM/yyyy')}
                            </span>
                            {getStatusBadge(hist.status)}
                          </div>
                          {hist.status === 'Finalizado' && (
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-muted-foreground font-medium">
                                Score: {hist.final_score}/{hist.max_score}
                              </span>
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-md border ${getScoreBgColor(histPerc)}`}
                              >
                                {histPerc.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-sm text-center py-6 text-muted-foreground border border-dashed rounded-md">
                      Nenhum histórico anterior encontrado.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
