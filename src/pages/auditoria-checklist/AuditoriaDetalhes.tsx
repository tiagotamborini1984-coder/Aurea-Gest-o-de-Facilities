import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Printer, ArrowLeft, CheckCircle, Clock, Calendar, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Database } from '@/lib/supabase/types'

type Audit = Database['public']['Tables']['audits']['Row']
type AuditExecution = Database['public']['Tables']['audit_executions']['Row'] & {
  plant?: { name: string } | null
  assignee?: { name: string } | null
}

export default function AuditoriaDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [audit, setAudit] = useState<Audit | null>(null)
  const [executions, setExecutions] = useState<AuditExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      if (!id) {
        setError('ID não fornecido')
        setLoading(false)
        return
      }

      // Sanitize ID using decodeURIComponent to prevent double-encoding issues
      let cleanId = decodeURIComponent(id).trim()
      // Remove any extraneous quotes
      cleanId = cleanId.replace(/^["']|["']$/g, '')

      // Validating UUID format to prevent malformed query errors
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(cleanId)) {
        setError('Formato de ID inválido')
        setLoading(false)
        return
      }

      try {
        // Use maybeSingle() instead of single() to avoid crash if not found
        const { data: auditData, error: auditError } = await supabase
          .from('audits')
          .select('*')
          .eq('id', cleanId)
          .maybeSingle()

        if (auditError) throw auditError

        if (!auditData) {
          setError('Auditoria não encontrada')
          setLoading(false)
          return
        }

        setAudit(auditData)

        // Fetch execution history respecting RLS
        const { data: execData, error: execError } = await supabase
          .from('audit_executions')
          .select(`
            *,
            plant:plants(name),
            assignee:profiles(name)
          `)
          .eq('audit_id', cleanId)
          .order('created_at', { ascending: false })

        if (execError) throw execError

        setExecutions((execData as any) || [])
      } catch (err: any) {
        console.error(err)
        setError(err.message || 'Erro ao carregar os dados da auditoria')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !audit) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Card className="border-destructive">
          <CardHeader className="text-destructive flex flex-row items-center space-x-2">
            <AlertCircle className="w-6 h-6" />
            <CardTitle>Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || 'Auditoria não encontrada'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Action Bar */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* Audit Details */}
      <Card className="print:shadow-none print:border-none print:m-0 print:p-0">
        <CardHeader className="print:px-0">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl mb-2">{audit.title}</CardTitle>
              <CardDescription>Visualização de detalhes e histórico de realizações</CardDescription>
            </div>
            <Badge
              variant={audit.status === 'Ativo' ? 'default' : 'secondary'}
              className="w-fit print:hidden"
            >
              {audit.status}
            </Badge>
            <span className="hidden print:block text-sm font-semibold">Status: {audit.status}</span>
          </div>
        </CardHeader>
        <CardContent className="print:px-0">
          <dl className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-muted/30 p-4 rounded-lg print:bg-transparent print:p-0 print:gap-4">
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Tipo</dt>
              <dd className="font-medium">{audit.type}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Frequência</dt>
              <dd className="font-medium">{audit.frequency}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Data de Início</dt>
              <dd className="font-medium flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground print:hidden" />
                {audit.start_date
                  ? format(new Date(audit.start_date + 'T12:00:00Z'), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })
                  : '-'}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Aviso Antecipado</dt>
              <dd className="font-medium">{audit.advance_notice_days || 0} dias</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Execution History */}
      <Card className="print:shadow-none print:border-none print:m-0 print:p-0">
        <CardHeader className="print:px-0">
          <CardTitle>Histórico de Realizações</CardTitle>
          <CardDescription>Todas as execuções vinculadas a esta auditoria</CardDescription>
        </CardHeader>
        <CardContent className="print:px-0">
          {executions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed print:border-none">
              Nenhuma realização encontrada para esta auditoria.
            </div>
          ) : (
            <div className="rounded-md border print:border-none print:mt-4 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Planta</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Pontuação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((exec) => (
                    <TableRow key={exec.id}>
                      <TableCell className="whitespace-nowrap">
                        {exec.realization_date
                          ? format(new Date(exec.realization_date + 'T12:00:00Z'), 'dd/MM/yyyy')
                          : format(new Date(exec.created_at), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{exec.plant?.name || '-'}</TableCell>
                      <TableCell>{exec.assignee?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            exec.status === 'Finalizado'
                              ? 'default'
                              : exec.status === 'Rascunho'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="flex w-fit items-center gap-1 print:hidden"
                        >
                          {exec.status === 'Finalizado' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {exec.status}
                        </Badge>
                        <span className="hidden print:inline-block text-sm">{exec.status}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {exec.final_score !== null && exec.max_score !== null ? (
                          <span>
                            {exec.final_score} / {exec.max_score}
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
