import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { ArrowLeft, Calendar, FileText, Activity, AlertCircle, FileCheck2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Types
type Audit = {
  id: string
  title: string
  type: string
  frequency: string
  status: string
  start_date: string
}

type Execution = {
  id: string
  realization_date: string | null
  created_at: string
  status: string
  final_score: number | null
  max_score: number | null
  plants: { name: string } | null
  profiles: { name: string } | null
}

export default function AuditoriaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [audit, setAudit] = useState<Audit | null>(null)
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/')
      return
    }

    const fetchData = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)

        // Fetch user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const role = profile?.role || null
        setUserRole(role)

        // Fetch Audit
        const { data: auditData, error: auditError } = await supabase
          .from('audits')
          .select('id, title, type, frequency, status, start_date')
          .eq('id', id)
          .single()

        if (auditError || !auditData) {
          setError('Auditoria não encontrada.')
          return
        }

        setAudit(auditData)

        // Fetch Executions only if Admin or Master
        if (role === 'Administrador' || role === 'Master') {
          const { data: execData, error: execError } = await supabase
            .from('audit_executions')
            .select(`
              id,
              realization_date,
              created_at,
              status,
              final_score,
              max_score,
              plants(name),
              profiles(name)
            `)
            .eq('audit_id', id)
            .order('created_at', { ascending: false })

          if (!execError && execData) {
            setExecutions(execData as any)
          }
        }
      } catch (err) {
        console.error(err)
        setError('Ocorreu um erro ao carregar os dados.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, user, authLoading, navigate])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Finalizado':
        return <Badge className="bg-green-500">Finalizado</Badge>
      case 'Pendente':
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            Pendente
          </Badge>
        )
      case 'Rascunho':
        return <Badge variant="secondary">Rascunho</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getAuditStatusBadge = (status: string) => {
    switch (status) {
      case 'Ativo':
        return <Badge className="bg-green-500">Ativo</Badge>
      case 'Inativo':
        return <Badge variant="destructive">Inativo</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (authLoading || loading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl mt-8" />
      </div>
    )
  }

  if (error || !audit) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center mt-20">
        <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Auditoria não encontrada</h2>
        <p className="text-muted-foreground mb-6">
          {error || 'Não foi possível carregar os detalhes desta auditoria.'}
        </p>
        <Button asChild>
          <Link to="/auditoria-checklist/configuracao">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Configurações
          </Link>
        </Button>
      </div>
    )
  }

  const isAdmin = userRole === 'Administrador' || userRole === 'Master'

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link to="/auditoria-checklist/configuracao">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{audit.title}</h1>
          <p className="text-muted-foreground">Visualizando detalhes e histórico da auditoria</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getAuditStatusBadge(audit.status)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Frequência</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audit.frequency}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Início: {format(new Date(audit.start_date), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tipo</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audit.type}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Execuções Realizadas</CardTitle>
            <FileCheck2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {executions.filter((e) => e.status === 'Finalizado').length}
            </div>
            {isAdmin && (
              <p className="text-xs text-muted-foreground mt-1">
                De {executions.length} programadas
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Realizações</CardTitle>
            <CardDescription>
              Acompanhe todas as execuções programadas e realizadas para esta auditoria.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {executions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileCheck2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhuma execução encontrada para esta auditoria.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Programada / Realização</TableHead>
                      <TableHead>Planta</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Nota Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((exec) => {
                      const displayDate = exec.realization_date || exec.created_at
                      return (
                        <TableRow key={exec.id}>
                          <TableCell className="font-medium">
                            {format(new Date(displayDate), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                            {!exec.realization_date && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (Programada)
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{exec.plants?.name || '-'}</TableCell>
                          <TableCell>{exec.profiles?.name || '-'}</TableCell>
                          <TableCell>{getStatusBadge(exec.status)}</TableCell>
                          <TableCell className="text-right">
                            {exec.final_score !== null && exec.max_score ? (
                              <div className="flex flex-col items-end">
                                <span className="font-bold">{exec.final_score}</span>
                                <span className="text-xs text-muted-foreground">
                                  de {exec.max_score}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
