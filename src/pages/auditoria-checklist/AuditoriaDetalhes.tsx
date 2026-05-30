import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Info, RefreshCw, History } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function AuditoriaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAppStore()
  const [audit, setAudit] = useState<any>(null)
  const [executions, setExecutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = profile?.role === 'Master' || profile?.role === 'Administrador'

  useEffect(() => {
    if (id) {
      fetchData()
    }
  }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)

      const { data: auditData, error: auditError } = await supabase
        .from('audits')
        .select('*')
        .eq('id', id)
        .single()

      if (auditError) throw auditError
      setAudit(auditData)

      if (isAdmin) {
        const { data: execData, error: execError } = await supabase
          .from('audit_executions')
          .select(`
            *,
            assignee:profiles!audit_executions_assignee_id_fkey(name),
            plant:plants!audit_executions_plant_id_fkey(name)
          `)
          .eq('audit_id', id)
          .order('created_at', { ascending: false })

        if (execError) throw execError
        setExecutions(execData || [])
      }
    } catch (error) {
      console.error('Error fetching audit details:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPercentage = (final: number | null, max: number | null) => {
    if (final == null || max == null || max === 0) return 0
    return Math.round((final / max) * 100)
  }

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500 hover:bg-green-600 text-white border-transparent'
    if (percentage >= 60) return 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent'
    return 'bg-red-500 hover:bg-red-600 text-white border-transparent'
  }

  const getStatusColor = (status: string) => {
    if (status === 'Finalizado')
      return 'bg-green-500 hover:bg-green-600 text-white border-transparent'
    if (status === 'Pendente')
      return 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent'
    if (status === 'Rascunho') return 'bg-gray-500 hover:bg-gray-600 text-white border-transparent'
    return 'bg-blue-500 hover:bg-blue-600 text-white border-transparent'
  }

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Carregando...</div>
  }

  if (!audit) {
    return <div className="p-6 text-center text-muted-foreground">Auditoria não encontrada.</div>
  }

  let nextDate = null
  if (audit.status === 'Ativo' && audit.frequency !== 'Única') {
    const lastExec = executions.find((e) => e.status === 'Finalizado')
    if (lastExec) {
      const baseDateStr = lastExec.realization_date || lastExec.created_at.split('T')[0]
      const d = new Date(baseDateStr + 'T00:00:00')
      if (audit.frequency === 'Diária') d.setDate(d.getDate() + 1)
      if (audit.frequency === 'Semanal') d.setDate(d.getDate() + 7)
      if (audit.frequency === 'Mensal') d.setMonth(d.getMonth() + 1)
      if (audit.frequency === 'Semestral') d.setMonth(d.getMonth() + 6)
      if (audit.frequency === 'Anual') d.setFullYear(d.getFullYear() + 1)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      while (d < today) {
        if (audit.frequency === 'Diária') d.setDate(d.getDate() + 1)
        if (audit.frequency === 'Semanal') d.setDate(d.getDate() + 7)
        if (audit.frequency === 'Mensal') d.setMonth(d.getMonth() + 1)
        if (audit.frequency === 'Semestral') d.setMonth(d.getMonth() + 6)
        if (audit.frequency === 'Anual') d.setFullYear(d.getFullYear() + 1)
      }
      nextDate = d
    } else {
      nextDate = new Date(audit.start_date + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      while (nextDate < today && audit.frequency !== 'Única') {
        if (audit.frequency === 'Diária') nextDate.setDate(nextDate.getDate() + 1)
        if (audit.frequency === 'Semanal') nextDate.setDate(nextDate.getDate() + 7)
        if (audit.frequency === 'Mensal') nextDate.setMonth(nextDate.getMonth() + 1)
        if (audit.frequency === 'Semestral') nextDate.setMonth(nextDate.getMonth() + 6)
        if (audit.frequency === 'Anual') nextDate.setFullYear(nextDate.getFullYear() + 1)
      }
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Detalhes da Auditoria</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-primary" />
              Informações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Título</p>
              <p className="font-medium text-base">{audit.title}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <p className="font-medium">{audit.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <Badge variant="secondary" className="font-medium">
                {audit.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Data de Início</p>
              <p className="font-medium">
                {audit.start_date
                  ? format(new Date(audit.start_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-3.5 w-3.5" />
                Frequência
              </p>
              <p className="font-medium">{audit.frequency}</p>
            </div>

            {isAdmin && nextDate && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Data da Próxima Auditoria
                </p>
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  {format(nextDate, 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Histórico de Realizações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {executions.length === 0 ? (
              <div className="py-8 text-center bg-muted/20 rounded-lg border border-dashed">
                <p className="text-muted-foreground">
                  Nenhuma realização encontrada para esta auditoria.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Data</TableHead>
                      <TableHead>Planta</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((exec) => {
                      const percentage = getPercentage(exec.final_score, exec.max_score)
                      return (
                        <TableRow key={exec.id}>
                          <TableCell className="font-medium">
                            {exec.realization_date
                              ? format(
                                  new Date(exec.realization_date + 'T00:00:00'),
                                  'dd/MM/yyyy',
                                  { locale: ptBR },
                                )
                              : format(new Date(exec.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>{exec.plant?.name || '-'}</TableCell>
                          <TableCell>{exec.assignee?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(exec.status)}>{exec.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {exec.status === 'Finalizado' ? (
                              <Badge className={getScoreColor(percentage)}>{percentage}%</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
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
