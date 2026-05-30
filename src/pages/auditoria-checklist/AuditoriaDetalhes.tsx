import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Printer,
  ArrowLeft,
  Calendar,
  FileText,
  Activity,
  Layers,
  CheckCircle2,
} from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Audit = any
type AuditExecution = any

export default function AuditoriaDetalhes() {
  const { id } = useParams()
  const { profile } = useAppStore()
  const [audit, setAudit] = useState<Audit | null>(null)
  const [executions, setExecutions] = useState<AuditExecution[]>([])
  const [loading, setLoading] = useState(true)

  const isAdminOrMaster = profile?.role === 'Administrador' || profile?.role === 'Master'

  useEffect(() => {
    if (!id) return
    const fetchAuditData = async () => {
      setLoading(true)

      const { data: auditData } = await supabase
        .from('audits')
        .select(`
          *,
          audit_actions (*)
        `)
        .eq('id', id)
        .single()

      if (auditData) {
        setAudit(auditData)

        if (isAdminOrMaster) {
          const { data: execData } = await supabase
            .from('audit_executions')
            .select(`
              id,
              status,
              realization_date,
              created_at,
              final_score,
              max_score,
              assignee_id,
              profiles ( name )
            `)
            .eq('audit_id', id)
            .order('created_at', { ascending: false })

          if (execData) {
            setExecutions(execData)
          }
        }
      }

      setLoading(false)
    }

    fetchAuditData()
  }, [id, isAdminOrMaster])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    )
  }

  if (!audit) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-destructive">Auditoria não encontrada</h2>
        <Link to="/auditoria-checklist/dashboard">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:w-full print:bg-white print:text-black">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link to="/auditoria-checklist/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Detalhes da Auditoria</h1>
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <div className="hidden print:block mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold">Relatório de Auditoria</h1>
        <p className="text-sm text-gray-500">
          Impresso em {format(new Date(), 'dd/MM/yyyy HH:mm')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:block print:space-y-6">
        <Card className="print:shadow-none print:border print:border-gray-200 print:break-inside-avoid shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary print:text-gray-700" />
              Informações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground print:text-gray-500">
                Título
              </p>
              <p className="text-lg font-semibold">{audit.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-gray-500">
                  Tipo
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Layers className="h-4 w-4 text-muted-foreground print:hidden" />
                  <span>{audit.type}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-gray-500">
                  Frequência
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Activity className="h-4 w-4 text-muted-foreground print:hidden" />
                  <span>{audit.frequency}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-gray-500">
                  Data de Início
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground print:hidden" />
                  <span>
                    {audit.start_date
                      ? format(new Date(audit.start_date + 'T00:00:00'), 'dd/MM/yyyy')
                      : '-'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-gray-500">
                  Status
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle2
                    className={`h-4 w-4 print:hidden ${audit.status === 'Ativo' ? 'text-green-500' : 'text-gray-400'}`}
                  />
                  <span>{audit.status}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="print:shadow-none print:border print:border-gray-200 print:break-inside-avoid shadow-sm">
          <CardHeader>
            <CardTitle>Ações / Itens do Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            {audit.audit_actions && audit.audit_actions.length > 0 ? (
              <ul className="space-y-2">
                {audit.audit_actions
                  .sort((a: any, b: any) => a.order_index - b.order_index)
                  .map((action: any) => (
                    <li
                      key={action.id}
                      className="p-3 bg-secondary/50 print:bg-white print:border print:border-gray-100 rounded-md border text-sm"
                    >
                      <span className="font-medium">{action.title}</span>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground print:text-gray-500">
                        <span>Peso: {action.weight}</span>
                        {action.evidence_required && <span>Requer Evidência</span>}
                        {action.comments_required && <span>Requer Comentário</span>}
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground print:text-gray-500">
                Nenhuma ação configurada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdminOrMaster && (
        <Card className="print:shadow-none print:border print:border-gray-200 print:break-inside-avoid shadow-sm print:mt-6">
          <CardHeader>
            <CardTitle>Histórico de Realizações</CardTitle>
          </CardHeader>
          <CardContent>
            {executions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left print:border-collapse">
                  <thead className="bg-secondary/50 print:bg-gray-100 text-muted-foreground print:text-black">
                    <tr>
                      <th className="px-4 py-3 font-medium rounded-tl-md print:border print:border-gray-300">
                        Data
                      </th>
                      <th className="px-4 py-3 font-medium print:border print:border-gray-300">
                        Responsável
                      </th>
                      <th className="px-4 py-3 font-medium print:border print:border-gray-300">
                        Status
                      </th>
                      <th className="px-4 py-3 font-medium text-right print:border print:border-gray-300">
                        Pontuação
                      </th>
                      <th className="px-4 py-3 font-medium text-right rounded-tr-md print:border print:border-gray-300">
                        Aproveitamento
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y print:divide-gray-300">
                    {executions.map((exec) => {
                      const date = exec.realization_date || exec.created_at
                      const pct =
                        exec.max_score && exec.max_score > 0
                          ? (exec.final_score / exec.max_score) * 100
                          : 0

                      return (
                        <tr key={exec.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap print:border print:border-gray-300">
                            {date ? format(new Date(date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                          </td>
                          <td className="px-4 py-3 print:border print:border-gray-300">
                            {exec.profiles?.name || '-'}
                          </td>
                          <td className="px-4 py-3 print:border print:border-gray-300">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium print:bg-transparent print:p-0 print:text-black ${
                                exec.status === 'Finalizado'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : exec.status === 'Em Andamento'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                              }`}
                            >
                              {exec.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right print:border print:border-gray-300">
                            {exec.final_score !== null && exec.max_score !== null
                              ? `${exec.final_score} / ${exec.max_score}`
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold print:border print:border-gray-300">
                            {exec.final_score !== null && exec.max_score !== null
                              ? `${pct.toFixed(1)}%`
                              : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6 print:text-gray-500 print:text-left print:py-2">
                Nenhum histórico de realização encontrado para esta auditoria.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
