import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertCircle,
  Printer,
  ArrowLeft,
  FileText,
  CheckSquare,
  History,
  User,
  Building,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

type AuditAction = {
  id: string
  title: string
  weight: number
  evidence_required: boolean
  comments_required: boolean
  order_index: number
}

type AuditAssignment = {
  plant: { name: string } | null
  assignee: { name: string } | null
}

type Audit = {
  id: string
  title: string
  type: string
  frequency: string
  start_date: string
  status: string
  advance_notice_days: number | null
  scoring_settings: any
  client: { name: string } | null
  audit_actions: AuditAction[]
  audit_assignments: AuditAssignment[]
}

type AuditExecution = {
  id: string
  status: string
  realization_date: string | null
  created_at: string
  final_score: number | null
  max_score: number | null
  assignee: { name: string } | null
  plant: { name: string } | null
}

export default function AuditoriaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [audit, setAudit] = useState<Audit | null>(null)
  const [executions, setExecutions] = useState<AuditExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAudit() {
      if (!id) {
        setError('ID da auditoria não fornecido.')
        setLoading(false)
        return
      }

      // Validação de UUID para evitar erro de sintaxe no Supabase
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(id)) {
        setError('ID de auditoria inválido.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Usando maybeSingle e limit(1) para prevenir o erro "Cannot coerce the result to a single JSON object"
        const { data: auditData, error: auditError } = await supabase
          .from('audits')
          .select(`
            id, title, type, frequency, start_date, status, advance_notice_days, scoring_settings,
            client:clients(name),
            audit_actions(id, title, weight, evidence_required, comments_required, order_index),
            audit_assignments(
              plant:plants(name),
              assignee:profiles!audit_assignments_assignee_id_fkey(name)
            )
          `)
          .eq('id', id)
          .limit(1)
          .maybeSingle()

        if (auditError) throw auditError
        if (!auditData) throw new Error('Auditoria não encontrada.')

        setAudit({
          ...auditData,
          client: Array.isArray(auditData.client) ? auditData.client[0] : auditData.client,
          audit_actions: ((auditData.audit_actions || []) as any[]).sort(
            (a, b) => a.order_index - b.order_index,
          ),
        } as Audit)

        // Buscar histórico de execuções (respeitando RLS via token autenticado)
        const { data: execsData, error: execsError } = await supabase
          .from('audit_executions')
          .select(`
            id, status, realization_date, created_at, final_score, max_score,
            assignee:profiles!audit_executions_assignee_id_fkey(name),
            plant:plants(name)
          `)
          .eq('audit_id', id)
          .order('created_at', { ascending: false })

        if (execsError) throw execsError

        const typedExecs = (execsData || []).map((exec: any) => ({
          ...exec,
          assignee: Array.isArray(exec.assignee) ? exec.assignee[0] : exec.assignee,
          plant: Array.isArray(exec.plant) ? exec.plant[0] : exec.plant,
        }))

        setExecutions(typedExecs as AuditExecution[])
      } catch (err: any) {
        console.error('Error fetching audit details:', err)
        setError(err.message || 'Ocorreu um erro ao carregar os detalhes da auditoria.')
      } finally {
        setLoading(false)
      }
    }

    fetchAudit()
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col space-y-6 p-6 w-full max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !audit) {
    return (
      <div className="p-6 w-full max-w-6xl mx-auto">
        <Card className="border-destructive bg-destructive/5 text-destructive">
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <h2 className="text-xl font-semibold">Erro ao carregar auditoria</h2>
            <p className="text-center max-w-md">{error}</p>
            <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 p-4 sm:p-6 pb-20 w-full max-w-6xl mx-auto">
      {/* Cabeçalho - Oculto na impressão */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0 print-hide">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{audit.title}</h1>
            <p className="text-muted-foreground text-sm">Detalhes e histórico da auditoria</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => window.print()} className="w-full sm:w-auto">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold border-b pb-2 mb-2">{audit.title}</h1>
        <p className="text-sm text-gray-500">Relatório de Detalhes da Auditoria</p>
      </div>

      {/* Detalhes Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader className="bg-muted/50 pb-4">
            <CardTitle className="flex items-center text-lg">
              <FileText className="mr-2 h-5 w-5 text-primary" />
              Informações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4 pt-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tipo</p>
              <p className="text-base font-semibold mt-1">{audit.type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Frequência</p>
              <p className="text-base font-semibold mt-1">{audit.frequency}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={audit.status === 'Ativo' ? 'default' : 'secondary'} className="mt-1">
                {audit.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Data de Início</p>
              <p className="text-base font-semibold mt-1">
                {audit.start_date ? format(parseISO(audit.start_date), 'dd/MM/yyyy') : '-'}
              </p>
            </div>
            {audit.advance_notice_days !== null && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aviso Prévio</p>
                <p className="text-base font-semibold mt-1">{audit.advance_notice_days} dias</p>
              </div>
            )}
            {audit.client && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                <p className="text-base font-semibold mt-1">{audit.client.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="bg-muted/50 pb-4">
            <CardTitle className="flex items-center text-lg">
              <Building className="mr-2 h-5 w-5 text-primary" />
              Atribuições
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {audit.audit_assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atribuição configurada.</p>
            ) : (
              <ul className="space-y-5">
                {audit.audit_assignments.map((assignment, index) => (
                  <li
                    key={index}
                    className="flex flex-col space-y-1.5 border-b last:border-0 pb-3 last:pb-0"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {assignment.plant?.name || 'Planta não definida'}
                    </span>
                    <span className="text-sm text-muted-foreground flex items-center">
                      <User className="mr-1.5 h-3.5 w-3.5" />
                      {assignment.assignee?.name || 'Responsável não definido'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checklist / Ações */}
      <Card className="shadow-sm print-break-inside-avoid">
        <CardHeader className="bg-muted/50 pb-4">
          <CardTitle className="flex items-center text-lg">
            <CheckSquare className="mr-2 h-5 w-5 text-primary" />
            Checklist de Auditoria
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Itens que devem ser verificados durante a execução
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {audit.audit_actions.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              Nenhum item configurado para esta auditoria.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[60px] text-center">#</TableHead>
                    <TableHead>Descrição do Item</TableHead>
                    <TableHead className="text-center w-[100px]">Peso</TableHead>
                    <TableHead className="text-center w-[120px]">Evidência</TableHead>
                    <TableHead className="text-center w-[120px]">Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audit.audit_actions.map((action, index) => (
                    <TableRow key={action.id}>
                      <TableCell className="font-medium text-center">{index + 1}</TableCell>
                      <TableCell>{action.title}</TableCell>
                      <TableCell className="text-center font-medium">{action.weight}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            action.evidence_required
                              ? 'border-primary text-primary'
                              : 'text-muted-foreground'
                          }
                        >
                          {action.evidence_required ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            action.comments_required
                              ? 'border-primary text-primary'
                              : 'text-muted-foreground'
                          }
                        >
                          {action.comments_required ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Execuções */}
      <Card className="shadow-sm print-break-inside-avoid">
        <CardHeader className="bg-muted/50 pb-4">
          <CardTitle className="flex items-center text-lg">
            <History className="mr-2 h-5 w-5 text-primary" />
            Histórico de Execuções
          </CardTitle>
          <p className="text-sm text-muted-foreground">Últimas execuções e seus resultados</p>
        </CardHeader>
        <CardContent className="p-0">
          {executions.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              Nenhuma execução registrada para esta auditoria ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead>Planta</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right w-[120px]">Pontuação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((exec) => (
                    <TableRow key={exec.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {exec.realization_date
                          ? format(parseISO(exec.realization_date), 'dd/MM/yyyy')
                          : format(parseISO(exec.created_at), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            exec.status === 'Finalizado'
                              ? 'default'
                              : exec.status === 'Pendente'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {exec.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="truncate max-w-[200px]">
                        {exec.plant?.name || '-'}
                      </TableCell>
                      <TableCell className="truncate max-w-[200px]">
                        {exec.assignee?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {exec.final_score !== null && exec.max_score !== null ? (
                          <span
                            className={
                              exec.final_score >= exec.max_score * 0.7
                                ? 'text-green-600'
                                : 'text-amber-600'
                            }
                          >
                            {exec.final_score}{' '}
                            <span className="text-muted-foreground text-xs font-normal">
                              / {exec.max_score}
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
        </CardContent>
      </Card>
    </div>
  )
}
