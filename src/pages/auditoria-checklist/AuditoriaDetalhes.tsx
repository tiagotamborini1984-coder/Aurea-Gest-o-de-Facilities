import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Printer, ArrowLeft, Calendar, FileText, Settings, Target, Hash } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-'
  if (dateStr.length === 10) {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy')
  } catch {
    return '-'
  }
}

export default function AuditoriaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [audit, setAudit] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])
  const [executions, setExecutions] = useState<any[]>([])
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    const loadData = async () => {
      if (!id) return
      try {
        setLoading(true)

        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userData.user.id)
          .single()

        const role = profile?.role || ''
        setUserRole(role)

        const { data: auditData, error: auditError } = await supabase
          .from('audits')
          .select('*')
          .eq('id', id)
          .single()

        if (auditError || !auditData) {
          setAudit(null)
          return
        }

        setAudit(auditData)

        const { data: actionsData } = await supabase
          .from('audit_actions')
          .select('*')
          .eq('audit_id', id)
          .order('order_index', { ascending: true })

        setActions(actionsData || [])

        if (['Master', 'Administrador'].includes(role)) {
          const { data: execsData, error: execsError } = await supabase
            .from('audit_executions')
            .select(`
              *,
              profiles (name),
              plants (name)
            `)
            .eq('audit_id', id)
            .order('created_at', { ascending: false })

          if (!execsError && execsData) {
            setExecutions(execsData)
          }
        }
      } catch (err: any) {
        toast({
          title: 'Erro ao carregar auditoria',
          description: err.message,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, toast])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!audit) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="bg-muted p-4 rounded-full">
          <FileText className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Auditoria não encontrada</h2>
        <p className="text-muted-foreground">
          A auditoria solicitada não existe ou você não tem permissão para acessá-la.
        </p>
        <Link to="/auditoria-checklist/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  const scoringSettings = Array.isArray(audit.scoring_settings) ? audit.scoring_settings : []

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:w-full bg-background">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Link to="/auditoria-checklist/criadas">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Detalhes da Auditoria</h1>
        </div>
        <Button onClick={handlePrint} className="print:hidden">
          <Printer className="mr-2 h-4 w-4" /> Imprimir
        </Button>
      </div>

      <div className="hidden print:block mb-8">
        <h1 className="text-3xl font-bold">{audit.title}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Documento gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="print:shadow-none print:border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Informações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Título</p>
                <p className="font-medium">{audit.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge
                  variant={audit.status === 'Ativo' ? 'default' : 'secondary'}
                  className="mt-1"
                >
                  {audit.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                <div className="flex items-center gap-1 mt-1">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>{audit.type}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Frequência</p>
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{audit.frequency}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data de Início</p>
                <p className="font-medium mt-1">{formatDate(audit.start_date)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aviso Prévio</p>
                <p className="font-medium mt-1">{audit.advance_notice_days || 0} dias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="print:shadow-none print:border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Sistema de Pontuação
            </CardTitle>
            <CardDescription>Critérios de avaliação para esta auditoria</CardDescription>
          </CardHeader>
          <CardContent>
            {scoringSettings.length > 0 ? (
              <div className="space-y-3">
                {scoringSettings.map((setting: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 border"
                  >
                    <span className="font-medium">{setting.description}</span>
                    <Badge variant="outline" className="font-mono">
                      {setting.score} {setting.score === 1 ? 'ponto' : 'pontos'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Sem configuração de pontuação definida.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="print:shadow-none print:border-border print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" /> Itens do Checklist ({actions.length})
          </CardTitle>
          <CardDescription>Ações que devem ser verificadas durante a execução</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">#</TableHead>
                  <TableHead>Descrição do Item</TableHead>
                  <TableHead className="text-center">Peso</TableHead>
                  <TableHead className="text-center">Requisitos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      Nenhuma ação cadastrada neste checklist.
                    </TableCell>
                  </TableRow>
                ) : (
                  actions.map((action, index) => (
                    <TableRow key={action.id}>
                      <TableCell className="text-center font-medium">{index + 1}</TableCell>
                      <TableCell>{action.title}</TableCell>
                      <TableCell className="text-center">{action.weight}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                          {action.evidence_required && (
                            <Badge variant="secondary" className="text-[10px]">
                              Foto/Evidência
                            </Badge>
                          )}
                          {action.comments_required && (
                            <Badge variant="secondary" className="text-[10px]">
                              Observação
                            </Badge>
                          )}
                          {!action.evidence_required && !action.comments_required && <span>-</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {['Master', 'Administrador'].includes(userRole) && (
        <Card className="print:shadow-none print:border-border print:break-before-page">
          <CardHeader>
            <CardTitle>Histórico de Realizações</CardTitle>
            <CardDescription>
              Últimas execuções desta auditoria registradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Planta</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Pontuação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        Nenhuma execução registrada para esta auditoria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    executions.map((exec) => (
                      <TableRow key={exec.id}>
                        <TableCell className="font-medium">
                          {exec.realization_date
                            ? formatDate(exec.realization_date)
                            : formatDate(exec.created_at)}
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
                        <TableCell>{exec.plants?.name || '-'}</TableCell>
                        <TableCell>{exec.profiles?.name || '-'}</TableCell>
                        <TableCell className="text-right">
                          {exec.final_score !== null && exec.max_score !== null ? (
                            <span className="font-mono font-medium">
                              {exec.final_score} / {exec.max_score}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({Math.round((exec.final_score / exec.max_score) * 100)}%)
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
