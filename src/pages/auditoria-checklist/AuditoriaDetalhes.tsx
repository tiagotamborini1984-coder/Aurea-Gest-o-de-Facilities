import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Printer, ArrowLeft, Calendar, User, MapPin, ClipboardList, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'

export default function AuditoriaDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [userRole, setUserRole] = useState<string | null>(null)

  const [execution, setExecution] = useState<any>(null)
  const [answers, setAnswers] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setUserRole(data.role)
        })
    } else if (!authLoading) {
      setUserRole(null)
    }
  }, [user, authLoading])

  useEffect(() => {
    const loadData = async () => {
      if (!id || !userRole) return
      try {
        setLoading(true)
        const { data: execData, error: execError } = await supabase
          .from('audit_executions')
          .select(`
            *,
            audits (
              id, title, type, frequency, advance_notice_days
            ),
            plants (
              name
            ),
            profiles:assignee_id (
              name
            )
          `)
          .eq('id', id)
          .single()

        if (execError) throw execError

        setExecution(execData)

        const { data: ansData, error: ansError } = await supabase
          .from('audit_execution_answers')
          .select(`
            *,
            audit_actions (
              title, weight, order_index
            ),
            corrective_assignee:corrective_assignee_id (
              name
            )
          `)
          .eq('execution_id', id)

        if (!ansError && ansData) {
          setAnswers(
            ansData.sort((a, b) => {
              const aOrder = a.audit_actions?.order_index || 0
              const bOrder = b.audit_actions?.order_index || 0
              return aOrder - bOrder
            }),
          )
        }

        if (userRole === 'Administrador' || userRole === 'Master') {
          const { data: histData } = await supabase
            .from('audit_executions')
            .select(`
              id, status, realization_date, final_score, max_score, created_at,
              profiles:assignee_id ( name )
            `)
            .eq('audit_id', execData.audit_id)
            .eq('plant_id', execData.plant_id)
            .eq('status', 'Finalizado')
            .neq('id', id)
            .order('realization_date', { ascending: false })
            .order('created_at', { ascending: false })

          if (histData) setHistory(histData)
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes da auditoria:', error)
      } finally {
        setLoading(false)
      }
    }

    if (userRole) {
      loadData()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [id, userRole, authLoading, user])

  const isInitializing = authLoading || (user && userRole === null) || loading

  if (isInitializing) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!execution) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-8 space-y-4">
        <ClipboardList className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Auditoria não encontrada</h2>
        <p className="text-muted-foreground text-center">
          O registro solicitado não existe ou você não tem permissão para acessá-lo.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </button>
      </div>
    )
  }

  const scorePercentage =
    execution.max_score > 0 ? Math.round((execution.final_score / execution.max_score) * 100) : 0

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-full">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Detalhes da Auditoria</h1>
            <p className="text-muted-foreground">{execution.audits?.title}</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 print:hidden"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </button>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="text-3xl font-bold">Relatório de Auditoria</h1>
        <h2 className="text-xl text-muted-foreground mt-1">{execution.audits?.title}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm md:col-span-2">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight">Informações Gerais</h3>
          </div>
          <div className="p-6 pt-0 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground flex items-center">
                <MapPin className="w-4 h-4 mr-1" /> Planta
              </span>
              <p>{execution.plants?.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground flex items-center">
                <User className="w-4 h-4 mr-1" /> Responsável
              </span>
              <p>{execution.profiles?.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground flex items-center">
                <Calendar className="w-4 h-4 mr-1" /> Data de Realização
              </span>
              <p>
                {execution.realization_date
                  ? format(new Date(execution.realization_date), 'dd/MM/yyyy')
                  : 'Não realizada'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Status</span>
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${execution.status === 'Finalizado' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                >
                  {execution.status}
                </span>
              </div>
            </div>
            {execution.participants && (
              <div className="col-span-2 space-y-1 mt-2">
                <span className="text-sm font-medium text-muted-foreground">Participantes</span>
                <p className="text-sm">{execution.participants}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight">Resultado</h3>
          </div>
          <div className="p-6 pt-0 flex flex-col items-center justify-center space-y-4">
            <div className="relative flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  className="stroke-muted fill-none"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  className={
                    scorePercentage >= 80
                      ? 'stroke-primary fill-none'
                      : scorePercentage >= 50
                        ? 'stroke-yellow-500 fill-none'
                        : 'stroke-destructive fill-none'
                  }
                  strokeWidth="12"
                  strokeDasharray={`${Math.max(0, scorePercentage * 3.51)} 351`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold">{scorePercentage}%</span>
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Pontuação Final</p>
              <p className="text-sm text-muted-foreground">
                {execution.final_score} de {execution.max_score} pontos
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="font-semibold leading-none tracking-tight">Checklist</h3>
          <p className="text-sm text-muted-foreground">Respostas e evidências registradas</p>
        </div>
        <div className="p-6 pt-0">
          {answers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma resposta encontrada para esta auditoria.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto print:overflow-visible">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ação Verificada</TableHead>
                    <TableHead className="text-center">Pontuação</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead>Ação Corretiva</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {answers.map((ans) => (
                    <TableRow key={ans.id}>
                      <TableCell className="font-medium max-w-xs">
                        {ans.audit_actions?.title}
                      </TableCell>
                      <TableCell className="text-center">
                        {ans.score !== null ? (
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                            {ans.score}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs whitespace-pre-wrap text-sm">
                        {ans.observations || (
                          <span className="text-muted-foreground italic">Nenhuma observação</span>
                        )}
                        {ans.evidence_url && (
                          <div className="mt-2 block print:hidden">
                            <a
                              href={ans.evidence_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs"
                            >
                              Ver Evidência
                            </a>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ans.corrective_assignee_id ? (
                          <div className="space-y-1">
                            <p className="font-medium">{ans.corrective_assignee?.name}</p>
                            {ans.corrective_due_date && (
                              <p className="text-xs text-muted-foreground">
                                Prazo: {format(new Date(ans.corrective_due_date), 'dd/MM/yyyy')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {(userRole === 'Administrador' || userRole === 'Master') && history.length > 0 && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm print:break-before-page">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Histórico de Realizações
            </h3>
            <p className="text-sm text-muted-foreground">Auditorias anteriores para esta planta</p>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-4">
              {history.map((hist) => {
                const histScore =
                  hist.max_score > 0 ? Math.round((hist.final_score / hist.max_score) * 100) : 0
                return (
                  <div
                    key={hist.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm flex items-center space-x-2">
                        <span>
                          {hist.realization_date
                            ? format(new Date(hist.realization_date), 'dd/MM/yyyy')
                            : format(new Date(hist.created_at), 'dd/MM/yyyy')}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Por {hist.profiles?.name}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-bold">{histScore}%</p>
                        <p className="text-xs text-muted-foreground">
                          {hist.final_score} / {hist.max_score}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/auditoria-checklist/detalhes/${hist.id}`)}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-8 px-3 print:hidden"
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer for print */}
      <div className="hidden print:block mt-12 pt-8 border-t">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm font-bold">Aurea Facility Management</p>
            <p className="text-xs text-muted-foreground">
              Relatório gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
          <div className="text-right">
            <div className="w-48 h-px bg-black mb-2"></div>
            <p className="text-xs font-medium">Assinatura do Responsável</p>
          </div>
        </div>
      </div>
    </div>
  )
}
