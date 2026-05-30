import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Search, AlertCircle, FileCheck2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'

export default function AuditoriaRealizadas() {
  const { user } = useAuth()
  const [executions, setExecutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (user) {
      fetchExecutions()
    }
  }, [user])

  const fetchExecutions = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('audit_executions')
        .select(`
          id,
          status,
          realization_date,
          final_score,
          max_score,
          created_at,
          audit_id,
          audits (
            title,
            type,
            client_id,
            scoring_settings
          ),
          plants (
            name
          ),
          profiles (
            name
          ),
          audit_execution_answers (
            action_id,
            audit_actions (
              weight
            )
          )
        `)
        .eq('status', 'Finalizado')
        .order('realization_date', { ascending: false })

      if (error) throw error

      setExecutions(data || [])
    } catch (error) {
      console.error('Error fetching executions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMaxScale = (settings: any) => {
    if (Array.isArray(settings) && settings.length > 0) {
      return Math.max(...settings.map((s: any) => Number(s.score) || 5))
    }
    return 5
  }

  const filteredExecutions = useMemo(() => {
    return executions.filter((exec) => {
      const term = searchTerm.toLowerCase()
      return (
        exec.audits?.title?.toLowerCase().includes(term) ||
        exec.plants?.name?.toLowerCase().includes(term) ||
        exec.profiles?.name?.toLowerCase().includes(term)
      )
    })
  }, [executions, searchTerm])

  const safeFormatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      // If it's a date-only string like YYYY-MM-DD, append T12:00:00Z to avoid timezone shifts
      const strToParse = dateStr.length === 10 ? `${dateStr}T12:00:00Z` : dateStr
      return format(new Date(strToParse), 'dd/MM/yyyy', { locale: ptBR })
    } catch (e) {
      return dateStr
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileCheck2 className="h-8 w-8 text-primary" />
            Auditorias Realizadas
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe os resultados e o histórico de avaliações de qualidade e conformidade.
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Histórico de Resultados</CardTitle>
              <CardDescription>Lista completa de auditorias finalizadas</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, planta ou auditor..."
                className="pl-9 bg-slate-50/50 focus-visible:bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead className="w-[300px]">Auditoria</TableHead>
                  <TableHead>Planta</TableHead>
                  <TableHead>Auditor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Pontuação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2"></div>
                        Carregando auditorias...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredExecutions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      Nenhuma auditoria realizada encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExecutions.map((exec) => {
                    const score = exec.final_score ?? 0

                    let max = exec.max_score
                    if (max === null || max === undefined) {
                      const maxScale = getMaxScale(exec.audits?.scoring_settings)
                      const calcMax =
                        exec.audit_execution_answers?.reduce((acc: number, ans: any) => {
                          const weight = ans.audit_actions?.weight ?? 1
                          return acc + maxScale * weight
                        }, 0) ?? 0
                      if (calcMax > 0) {
                        max = calcMax
                      }
                    }

                    const percentage = max && max > 0 ? (score / max) * 100 : 0
                    const isLowScore = max && max > 0 && percentage < 70 // Highlight in red if score is below 70%

                    return (
                      <TableRow
                        key={exec.id}
                        className={
                          isLowScore
                            ? 'bg-red-50/50 hover:bg-red-50 dark:bg-red-950/10 dark:hover:bg-red-950/20'
                            : ''
                        }
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {exec.audits?.title}
                            {isLowScore && (
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Pontuação abaixo da meta recomendada (70%)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          {exec.audits?.type && (
                            <div className="text-xs text-muted-foreground font-normal mt-1">
                              {exec.audits.type}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="truncate">{exec.plants?.name}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
                              {exec.profiles?.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="truncate">{exec.profiles?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {safeFormatDate(exec.realization_date || exec.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                            <Badge
                              variant={isLowScore ? 'destructive' : 'secondary'}
                              className={
                                !isLowScore
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : ''
                              }
                            >
                              {max && max > 0 ? (
                                <span>
                                  {score} / {max}
                                </span>
                              ) : (
                                <span>{score}</span>
                              )}
                            </Badge>
                            {max && max > 0 && (
                              <span
                                className={`text-xs font-medium whitespace-nowrap ${isLowScore ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                              >
                                ({percentage.toFixed(0)}%)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="hover:bg-primary/5 hover:text-primary"
                          >
                            <Link to={`/auditoria-checklist/detalhes/${exec.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Detalhes
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
