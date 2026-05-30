import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft, Calendar, FileText, Activity } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'

const isValidUUID = (uuid: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/i.test(
    uuid,
  )

export default function AuditoriaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [audit, setAudit] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])
  const [executions, setExecutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (data) setUserRole(data.role)
    }
    fetchRole()
  }, [user])

  useEffect(() => {
    const fetchAuditData = async () => {
      if (!id || !isValidUUID(id)) {
        setError('ID da auditoria inválido ou não encontrado.')
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // Fetch Audit
        const { data: auditData, error: auditError } = await supabase
          .from('audits')
          .select('*')
          .eq('id', id)
          .single()

        if (auditError || !auditData) {
          throw new Error('Auditoria não encontrada.')
        }
        setAudit(auditData)

        // Fetch Actions
        const { data: actionsData } = await supabase
          .from('audit_actions')
          .select('*')
          .eq('audit_id', id)
          .order('order_index', { ascending: true })

        if (actionsData) {
          setActions(actionsData)
        }

        // Fetch Executions - history
        const { data: execsData, error: execsError } = await supabase
          .from('audit_executions')
          .select(`
            *,
            assignee:profiles(name)
          `)
          .eq('audit_id', id)
          .order('created_at', { ascending: false })

        if (execsData) {
          setExecutions(execsData)
        } else if (execsError) {
          console.error('Error fetching executions:', execsError)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchAuditData()
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  if (loading)
    return (
      <div className="p-8 flex justify-center text-muted-foreground animate-pulse">
        Carregando detalhes...
      </div>
    )
  if (error)
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="text-red-500 bg-red-50 p-4 rounded-md border border-red-100">{error}</div>
      </div>
    )
  if (!audit) return null

  // Ensure role visibility based on criteria
  const canSeeHistory =
    userRole === 'Administrador' || userRole === 'Master' || userRole === 'Gestor'

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto bg-background min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print-hide">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} title="Voltar">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Detalhes da Auditoria</h1>
        </div>
        <Button onClick={handlePrint} className="print-hide w-full sm:w-auto">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 print-break-inside-avoid rounded-xl border bg-card text-card-foreground shadow">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight text-xl">{audit.title}</h3>
            <p className="text-sm text-muted-foreground">Informações gerais da auditoria</p>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-secondary/30 p-3 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase">Tipo</div>
                  <div className="font-semibold">{audit.type}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-secondary/30 p-3 rounded-lg">
                <Activity className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase">
                    Frequência
                  </div>
                  <div className="font-semibold">{audit.frequency}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-secondary/30 p-3 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase">
                    Início Vigência
                  </div>
                  <div className="font-semibold">
                    {audit.start_date
                      ? format(new Date(audit.start_date + 'T00:00:00'), 'dd/MM/yyyy')
                      : '-'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-secondary/30 p-3 rounded-lg">
                <Activity className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase">Status</div>
                  <div
                    className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${audit.status === 'Ativo' ? 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80' : 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                  >
                    {audit.status}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="print-break-inside-avoid rounded-xl border bg-card text-card-foreground shadow">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight text-lg">
              Itens Verificados ({actions.length})
            </h3>
          </div>
          <div className="p-6 pt-0">
            <ul className="space-y-3 text-sm">
              {actions.slice(0, 5).map((action) => (
                <li key={action.id} className="flex gap-2 items-start">
                  <span className="font-semibold bg-secondary text-secondary-foreground rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs">
                    {action.order_index + 1}
                  </span>
                  <span className="leading-tight">{action.title}</span>
                </li>
              ))}
              {actions.length > 5 && (
                <li className="text-muted-foreground italic text-center pt-2 border-t mt-2">
                  ...e mais {actions.length - 5} ações na checklist.
                </li>
              )}
              {actions.length === 0 && (
                <li className="text-muted-foreground text-center">Nenhuma ação cadastrada.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {canSeeHistory && (
        <div className="print-break-inside-avoid rounded-xl border bg-card text-card-foreground shadow mt-6">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight text-xl">
              Histórico de Realizações
            </h3>
            <p className="text-sm text-muted-foreground">
              Acompanhe o desempenho e compliance ao longo do tempo
            </p>
          </div>
          <div className="p-6 pt-0">
            {executions.length === 0 ? (
              <div className="text-center py-10 bg-secondary/20 rounded-lg border border-dashed border-border text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
                Nenhum histórico de realização encontrado
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                      <TableHead>Data de Realização</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Pontuação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((exec) => (
                      <TableRow key={exec.id}>
                        <TableCell className="font-medium">
                          {exec.realization_date
                            ? format(new Date(exec.realization_date + 'T00:00:00'), 'dd/MM/yyyy')
                            : format(new Date(exec.created_at), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>{exec.assignee?.name || 'Desconhecido'}</TableCell>
                        <TableCell>
                          <div
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${exec.status === 'Finalizado' ? 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80' : exec.status === 'Rascunho' ? 'text-foreground border-border' : 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                          >
                            {exec.status}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {exec.final_score !== null ? (
                            <span className="font-semibold">
                              {exec.final_score}{' '}
                              <span className="text-muted-foreground font-normal text-xs">
                                / {exec.max_score || '-'}
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
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
      )}
    </div>
  )
}
