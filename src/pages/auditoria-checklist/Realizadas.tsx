import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Search, Trash2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'

import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { useAppStore } from '@/store/AppContext'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function AuditoriaRealizadas() {
  const [audits, setAudits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { toast } = useToast()
  const { activeClient, selectedPlant } = useAppStore()

  useEffect(() => {
    fetchUserRole()
  }, [])

  useEffect(() => {
    if (activeClient?.id) {
      fetchAudits()
    } else {
      setAudits([])
      setLoading(false)
    }

    const onFocus = () => {
      if (activeClient?.id) {
        fetchAudits()
      }
    }

    window.addEventListener('focus', onFocus)

    // Real-time UI Update listener
    const channel = supabase
      .channel('realizadas_audit_executions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_executions',
        },
        () => {
          if (activeClient?.id) {
            fetchAudits()
          }
        },
      )
      .subscribe()

    return () => {
      window.removeEventListener('focus', onFocus)
      supabase.removeChannel(channel)
    }
  }, [activeClient, selectedPlant, dateRange])

  const fetchUserRole = async () => {
    const { data } = await supabase.rpc('get_user_role')
    setUserRole(data)
  }

  const fetchAudits = async () => {
    try {
      setLoading(true)
      let query = supabase.from('audit_executions').select(`
          id,
          status,
          realization_date,
          final_score,
          max_score,
          created_at,
          task_id,
          tasks (
            task_number,
            task_statuses (
              name,
              is_terminal
            )
          ),
          audits!inner (
            title,
            type,
            client_id,
            scoring_settings
          ),
          plants!inner (
            id,
            name
          ),
          profiles!audit_executions_assignee_id_fkey (
            name
          ),
          audit_execution_answers (
            id,
            score
          )
        `)

      if (activeClient?.id) {
        query = query.eq('audits.client_id', activeClient.id)
      }

      if (selectedPlant && selectedPlant !== 'all') {
        query = query.eq('plant_id', selectedPlant)
      }

      if (dateRange?.from) {
        const fromDateOnly = format(dateRange.from, 'yyyy-MM-dd')
        const fromISO = dateRange.from.toISOString()

        if (dateRange.to) {
          const toDateOnly = format(dateRange.to, 'yyyy-MM-dd')
          const toISO = endOfDay(dateRange.to).toISOString()
          const orFilter = `and(realization_date.gte.${fromDateOnly},realization_date.lte.${toDateOnly}),and(realization_date.is.null,created_at.gte.${fromISO},created_at.lte.${toISO})`
          query = query.or(orFilter)
        } else {
          const orFilter = `realization_date.gte.${fromDateOnly},and(realization_date.is.null,created_at.gte.${fromISO})`
          query = query.or(orFilter)
        }
      }

      const { data, error } = await query.order('realization_date', { ascending: false })

      if (error) throw error

      // Filter audits considering 'Finalizada' status or task completed
      const finishedOrTaskCompleted = (data || [])
        .filter((audit: any) => {
          const statusLower = audit.status?.toLowerCase() || ''
          const isExecutionFinished = [
            'finalizado',
            'finalizada',
            'concluido',
            'concluído',
            'concluida',
            'concluída',
            'realizado',
            'realizada',
            'finished',
            'completed',
          ].includes(statusLower)

          const isTaskFinished =
            audit.tasks?.task_statuses?.is_terminal === true ||
            audit.tasks?.task_statuses?.name?.toLowerCase() === 'finalizado'

          const hasScoreAndDate = audit.final_score !== null && audit.realization_date !== null

          return isExecutionFinished || isTaskFinished || hasScoreAndDate
        })
        .map((audit: any) => {
          // Calculate missing scores if needed
          if (
            (audit.final_score === null || audit.max_score === null || audit.max_score === 0) &&
            audit.audit_execution_answers?.length > 0
          ) {
            const computedScore =
              audit.final_score !== null
                ? audit.final_score
                : audit.audit_execution_answers.reduce(
                    (acc: number, curr: any) => acc + (Number(curr.score) || 0),
                    0,
                  )

            let computedMax = audit.max_score || 0
            if (!computedMax && audit.audits?.scoring_settings) {
              try {
                const settings = Array.isArray(audit.audits.scoring_settings)
                  ? audit.audits.scoring_settings
                  : JSON.parse(audit.audits.scoring_settings)
                if (Array.isArray(settings) && settings.length > 0) {
                  const maxSettingScore = Math.max(
                    ...settings.map((s: any) => Number(s.score) || 0),
                  )
                  computedMax = maxSettingScore * audit.audit_execution_answers.length
                }
              } catch (e) {
                // Ignore parse error
              }
            }

            return {
              ...audit,
              final_score: computedScore,
              max_score: computedMax > 0 ? computedMax : Math.max(computedScore, 1), // fallback
            }
          }
          return audit
        })

      setAudits(finishedOrTaskCompleted)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as auditorias realizadas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      setIsDeleting(true)
      const { error } = await supabase.from('audit_executions').delete().eq('id', deleteId)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Auditoria excluída com sucesso.',
      })

      setAudits((prev) => prev.filter((a) => a.id !== deleteId))
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao excluir a auditoria.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const filteredAudits = audits.filter((audit) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      audit.audits?.title?.toLowerCase().includes(searchLower) ||
      audit.plants?.name?.toLowerCase().includes(searchLower) ||
      audit.profiles?.name?.toLowerCase().includes(searchLower) ||
      audit.tasks?.task_number?.toLowerCase().includes(searchLower)
    )
  })

  const canDelete = userRole === 'Master' || userRole === 'Administrador'

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Auditorias Realizadas</h2>
          <p className="text-muted-foreground">Histórico de todas as auditorias finalizadas</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Listagem</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, planta ou auditor..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando auditorias...</div>
          ) : filteredAudits.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma auditoria realizada encontrada para este período.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OS</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Planta</TableHead>
                    <TableHead>Auditor</TableHead>
                    <TableHead>Data de Realização</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pontuação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAudits.map((audit) => {
                    const scorePercentage =
                      audit.max_score > 0 ? (audit.final_score / audit.max_score) * 100 : 0

                    return (
                      <TableRow key={audit.id}>
                        <TableCell className="font-medium text-muted-foreground">
                          {audit.tasks?.task_number || '-'}
                        </TableCell>
                        <TableCell className="font-medium">{audit.audits?.title}</TableCell>
                        <TableCell>{audit.plants?.name}</TableCell>
                        <TableCell>{audit.profiles?.name}</TableCell>
                        <TableCell>
                          {audit.realization_date
                            ? format(
                                new Date(audit.realization_date + 'T00:00:00Z'),
                                'dd/MM/yyyy',
                                { locale: ptBR },
                              )
                            : audit.created_at
                              ? format(new Date(audit.created_at), 'dd/MM/yyyy', { locale: ptBR })
                              : '-'}
                        </TableCell>
                        <TableCell>
                          {[
                            'finalizado',
                            'finalizada',
                            'concluido',
                            'concluído',
                            'concluida',
                            'concluída',
                            'realizado',
                            'realizada',
                            'finished',
                            'completed',
                          ].includes(audit.status?.toLowerCase() || '') ||
                          (audit.final_score !== null && audit.realization_date !== null) ? (
                            <Badge
                              variant="default"
                              className="bg-green-600 text-white hover:bg-green-700 border-transparent"
                            >
                              Finalizada
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-yellow-500 text-white hover:bg-yellow-600 border-transparent"
                            >
                              Em Andamento
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              scorePercentage >= 80
                                ? 'bg-green-600 text-white hover:bg-green-700 border-transparent'
                                : scorePercentage >= 50
                                  ? 'bg-yellow-500 text-white hover:bg-yellow-600 border-transparent'
                                  : 'bg-red-600 text-white hover:bg-red-700 border-transparent'
                            }
                          >
                            {audit.final_score || 0} / {audit.max_score || 0} (
                            {scorePercentage.toFixed(1)}%)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {[
                              'finalizado',
                              'finalizada',
                              'concluido',
                              'concluído',
                              'concluida',
                              'concluída',
                              'realizado',
                              'realizada',
                              'finished',
                              'completed',
                            ].includes(audit.status?.toLowerCase() || '') ||
                            (audit.final_score !== null && audit.realization_date !== null) ? (
                              <Button variant="ghost" size="icon" asChild title="Ver detalhes">
                                <Link to={`/auditoria-checklist/detalhes/${audit.id}`}>
                                  <Eye className="h-4 w-4" />
                                  <span className="sr-only">Ver detalhes</span>
                                </Link>
                              </Button>
                            ) : (
                              <Button size="sm" asChild>
                                <Link to={`/auditoria-checklist/detalhes/${audit.id}`}>
                                  Finalizar
                                </Link>
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(audit.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Excluir</span>
                              </Button>
                            )}
                          </div>
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Auditoria</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir esta auditoria? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
