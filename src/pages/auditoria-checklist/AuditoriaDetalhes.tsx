import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  ClipboardCheck,
  Info,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'

const isUUID = (uuid: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)

export default function AuditoriaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [execution, setExecution] = useState<any>(null)
  const [answers, setAnswers] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      if (!id || !isUUID(id)) {
        setError('ID da auditoria inválido.')
        setLoading(false)
        return
      }

      try {
        const { data: execData, error: execError } = await supabase
          .from('audit_executions')
          .select(`
            *,
            audits ( title, scoring_settings, type ),
            plants ( name )
          `)
          .eq('id', id)
          .single()

        if (execError) {
          if (execError.code === 'PGRST116') {
            setError('Acesso Negado ou Auditoria não encontrada.')
          } else {
            setError('Erro ao buscar detalhes da auditoria.')
          }
          throw execError
        }

        if (!execData) {
          setError('Acesso Negado ou Auditoria não encontrada.')
          setLoading(false)
          return
        }

        setExecution(execData)

        // Fetch answers
        const { data: answersData } = await supabase
          .from('audit_execution_answers')
          .select(`
            *,
            audit_actions ( title, weight )
          `)
          .eq('execution_id', id)

        setAnswers(answersData || [])

        // Fetch logs if admin/master
        if (profile?.role === 'Master' || profile?.role === 'Administrador') {
          const { data: logsData } = await supabase
            .from('audit_logs')
            .select('*')
            .like('details', `%${id}%`)
            .order('created_at', { ascending: false })

          setLogs(logsData || [])
        }
      } catch (err: any) {
        console.error('Error fetching audit details:', err)
      } finally {
        setLoading(false)
      }
    }

    if (profile) {
      fetchData()
    }
  }, [id, profile])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !execution) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold text-foreground">
          {error || 'Auditoria não encontrada.'}
        </h2>
        <Button onClick={() => navigate(-1)} variant="outline">
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Auditoria: {execution.audits?.title}
          </h1>
          <p className="text-muted-foreground">Planta: {execution.plants?.name || 'N/A'}</p>
        </div>
        <Badge
          className="ml-auto"
          variant={execution.status === 'Finalizado' ? 'default' : 'secondary'}
        >
          {execution.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Detalhes da Execução
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Data de Realização:</span>
              <span>
                {execution.realization_date
                  ? format(new Date(execution.realization_date + 'T12:00:00Z'), 'dd/MM/yyyy')
                  : 'Não realizada'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Pontuação:</span>
              <span>
                {execution.final_score !== null ? execution.final_score : '-'} /{' '}
                {execution.max_score !== null ? execution.max_score : '-'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Participantes:</span>
              <span>{execution.participants || 'Nenhum participante registrado'}</span>
            </div>
          </CardContent>
        </Card>

        {execution.signatures &&
          Array.isArray(execution.signatures) &&
          execution.signatures.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Assinaturas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[200px] overflow-y-auto">
                  {execution.signatures.map((sig: any, index: number) => (
                    <div key={index} className="flex flex-col border p-3 rounded-md">
                      <span className="font-medium text-sm">
                        {sig.name || `Participante ${index + 1}`}
                      </span>
                      {sig.url ? (
                        <img
                          src={sig.url}
                          alt="Assinatura"
                          className="h-16 object-contain mt-2 bg-white rounded"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground mt-1">
                          Assinatura não capturada
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resultados do Checklist</CardTitle>
          <CardDescription>Respostas e evidências de cada item auditado</CardDescription>
        </CardHeader>
        <CardContent>
          {answers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead>Evidência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {answers.map((answer) => (
                    <TableRow key={answer.id}>
                      <TableCell className="font-medium min-w-[200px]">
                        {answer.audit_actions?.title}
                      </TableCell>
                      <TableCell>{answer.score !== null ? answer.score : '-'}</TableCell>
                      <TableCell
                        className="max-w-[300px] truncate"
                        title={answer.observations || ''}
                      >
                        {answer.observations || '-'}
                      </TableCell>
                      <TableCell>
                        {answer.evidence_url ? (
                          <a
                            href={answer.evidence_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline text-sm inline-flex items-center gap-1"
                          >
                            Ver anexo
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum item avaliado nesta auditoria.
            </p>
          )}
        </CardContent>
      </Card>

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Ações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{log.action_type}</TableCell>
                      <TableCell className="max-w-[400px] truncate" title={log.details || ''}>
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
