import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { useToast } from '@/components/ui/use-toast'
import {
  Printer,
  ArrowLeft,
  Calendar,
  FileText,
  FileBarChart,
  Loader2,
  MapPin,
  User,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'

type PrintData = {
  execution: any
  answers: any[]
} | null

export default function AuditoriaDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [audit, setAudit] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])
  const [executions, setExecutions] = useState<any[]>([])

  const [printData, setPrintData] = useState<PrintData>(null)
  const [loadingPrint, setLoadingPrint] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchAuditData = async () => {
      setLoading(true)
      try {
        const { data: auditData, error: auditError } = await supabase
          .from('audits')
          .select('*')
          .eq('id', id)
          .single()

        if (auditError) throw auditError
        setAudit(auditData)

        const { data: actionsData, error: actionsError } = await supabase
          .from('audit_actions')
          .select('*')
          .eq('audit_id', id)
          .order('order_index', { ascending: true })

        if (!actionsError && actionsData) {
          setActions(actionsData)
        }

        const { data: execsData, error: execsError } = await supabase
          .from('audit_executions')
          .select(`
            *,
            plants (name),
            assignee:profiles!audit_executions_assignee_id_fkey (name)
          `)
          .eq('audit_id', id)
          .order('created_at', { ascending: false })

        if (!execsError && execsData) {
          setExecutions(execsData)
        }
      } catch (err: any) {
        console.error('Erro ao buscar detalhes da auditoria:', err)
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar a auditoria. ' + err.message,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAuditData()
  }, [id, toast])

  const handlePrint = async (execution: any) => {
    try {
      setLoadingPrint(execution.id)

      const { data: answersData, error } = await supabase
        .from('audit_execution_answers')
        .select('*, audit_actions(*)')
        .eq('execution_id', execution.id)

      if (error) throw error

      setPrintData({
        execution,
        answers: answersData || [],
      })

      setTimeout(() => {
        window.print()
        setLoadingPrint(null)
      }, 500)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro de Impressão',
        description: 'Não foi possível carregar os dados para impressão.',
        variant: 'destructive',
      })
      setLoadingPrint(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Finalizado':
        return <Badge className="bg-green-600">Finalizado</Badge>
      case 'Pendente':
        return (
          <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600">
            Pendente
          </Badge>
        )
      case 'Rascunho':
        return <Badge variant="outline">Rascunho</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl space-y-6">
        <Skeleton className="h-10 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!audit) {
    return (
      <div className="container mx-auto p-6 max-w-7xl flex flex-col items-center justify-center min-h-[50vh]">
        <FileText className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Auditoria não encontrada</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <>
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #print-section, #print-section * { visibility: visible; }
            #print-section {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
              color: black;
            }
          }
        `}
      </style>

      <div className="container mx-auto p-6 max-w-7xl print:hidden">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{audit.title}</h1>
            <p className="text-sm text-gray-500">Detalhes do modelo de auditoria</p>
          </div>
        </div>

        <Tabs defaultValue="history" className="space-y-4">
          <TabsList>
            <TabsTrigger value="history">
              <Clock className="w-4 h-4 mr-2" />
              Histórico de Realizações
            </TabsTrigger>
            <TabsTrigger value="template">
              <FileText className="w-4 h-4 mr-2" />
              Detalhes do Modelo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Realizações</CardTitle>
                <CardDescription>
                  Listagem de todas as vezes que esta auditoria foi executada.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {executions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 flex flex-col items-center">
                    <FileBarChart className="w-12 h-12 text-gray-300 mb-3" />
                    <p>Nenhum histórico encontrado para esta auditoria.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data de Realização</TableHead>
                          <TableHead>Unidade</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pontuação</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {executions.map((exec) => (
                          <TableRow key={exec.id}>
                            <TableCell>
                              {exec.realization_date
                                ? format(new Date(exec.realization_date), 'dd/MM/yyyy')
                                : format(new Date(exec.created_at), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>{exec.plants?.name || '-'}</TableCell>
                            <TableCell>{exec.assignee?.name || '-'}</TableCell>
                            <TableCell>{getStatusBadge(exec.status)}</TableCell>
                            <TableCell>
                              {exec.final_score !== null ? (
                                <span className="font-medium">
                                  {exec.final_score}{' '}
                                  <span className="text-gray-400 font-normal">
                                    / {exec.max_score}
                                  </span>
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {exec.status === 'Finalizado' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePrint(exec)}
                                  disabled={loadingPrint === exec.id}
                                >
                                  {loadingPrint === exec.id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Printer className="w-4 h-4 mr-2" />
                                  )}
                                  Imprimir
                                </Button>
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
          </TabsContent>

          <TabsContent value="template">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-500 font-medium">Frequência</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-primary" />
                  <span className="font-semibold">{audit.frequency}</span>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-500 font-medium">Aviso Prévio</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-primary" />
                  <span className="font-semibold">{audit.advance_notice_days} dias antes</span>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-500 font-medium">
                    Status do Modelo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={audit.status === 'Ativo' ? 'default' : 'secondary'}>
                    {audit.status}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Itens de Verificação ({actions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Ord.</TableHead>
                        <TableHead>Título da Ação</TableHead>
                        <TableHead>Peso</TableHead>
                        <TableHead>Exige Evidência</TableHead>
                        <TableHead>Exige Observação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {actions.map((action, idx) => (
                        <TableRow key={action.id}>
                          <TableCell className="font-medium">{idx + 1}</TableCell>
                          <TableCell>{action.title}</TableCell>
                          <TableCell>{action.weight}</TableCell>
                          <TableCell>{action.evidence_required ? 'Sim' : 'Não'}</TableCell>
                          <TableCell>{action.comments_required ? 'Sim' : 'Não'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {printData && (
        <div id="print-section" className="hidden print:block p-8 bg-white text-black min-h-screen">
          <div className="flex items-center justify-between mb-6 border-b-2 border-gray-300 pb-4">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wide">{audit?.title}</h1>
              <p className="text-gray-500 mt-1">Relatório de Execução de Auditoria</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-8 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-gray-500" />{' '}
              <strong className="mr-2">Unidade:</strong> {printData.execution.plants?.name || '-'}
            </div>
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2 text-gray-500" />{' '}
              <strong className="mr-2">Responsável:</strong>{' '}
              {printData.execution.assignee?.name || '-'}
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-gray-500" />{' '}
              <strong className="mr-2">Data de Realização:</strong>{' '}
              {printData.execution.realization_date
                ? format(new Date(printData.execution.realization_date), 'dd/MM/yyyy')
                : '-'}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-gray-500" />{' '}
              <strong className="mr-2">Status:</strong> {printData.execution.status}
            </div>
            <div className="flex items-center">
              <FileBarChart className="w-4 h-4 mr-2 text-gray-500" />{' '}
              <strong className="mr-2">Pontuação Obtida:</strong> {printData.execution.final_score}{' '}
              / {printData.execution.max_score}
            </div>
            <div className="flex items-center col-span-2">
              <User className="w-4 h-4 mr-2 text-gray-500" />{' '}
              <strong className="mr-2">Participantes:</strong>{' '}
              {printData.execution.participants || '-'}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 border-b border-gray-300 pb-2">
              Itens Avaliados
            </h2>
            <table className="w-full text-sm border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 p-2 text-left w-1/2">Item Avaliado</th>
                  <th className="border border-gray-300 p-2 text-center w-1/6">Pontuação</th>
                  <th className="border border-gray-300 p-2 text-left w-1/3">Observações</th>
                </tr>
              </thead>
              <tbody>
                {printData.answers
                  .sort(
                    (a, b) =>
                      (a.audit_actions?.order_index || 0) - (b.audit_actions?.order_index || 0),
                  )
                  .map((ans, idx) => (
                    <tr key={ans.id} className="border-b border-gray-200">
                      <td className="border border-gray-300 p-2 font-medium">
                        {idx + 1}. {ans.audit_actions?.title || '-'}
                      </td>
                      <td className="border border-gray-300 p-2 text-center font-bold">
                        {ans.score !== null ? ans.score : 'N/A'}
                      </td>
                      <td className="border border-gray-300 p-2 text-gray-600">
                        {ans.observations || '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {printData.execution.signatures && printData.execution.signatures.length > 0 && (
            <div className="mt-12 break-inside-avoid">
              <h2 className="text-lg font-bold mb-6 border-b border-gray-300 pb-2">
                Assinaturas Registradas
              </h2>
              <div className="flex flex-wrap gap-12 justify-start">
                {printData.execution.signatures.map((sig: any, idx: number) => (
                  <div key={idx} className="flex flex-col items-center w-48 text-sm">
                    {sig.url ? (
                      <img
                        src={sig.url}
                        alt={`Assinatura de ${sig.name}`}
                        className="h-16 object-contain mb-2 border-b border-black w-full"
                      />
                    ) : (
                      <div className="h-16 w-full border-b border-black mb-2"></div>
                    )}
                    <span className="font-semibold text-center mt-1">{sig.name}</span>
                    <span className="text-gray-500 text-xs text-center">
                      {sig.role || 'Participante'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
