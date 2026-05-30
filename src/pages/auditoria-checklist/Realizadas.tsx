import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
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
import { Eye, Search, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Realizadas() {
  const [executions, setExecutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchExecutions()
  }, [])

  const fetchExecutions = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_executions')
        .select(`
          id,
          status,
          realization_date,
          created_at,
          final_score,
          max_score,
          audits (
            id,
            title,
            scoring_settings,
            audit_actions (
              id,
              weight
            )
          ),
          plants (
            name,
            code
          ),
          profiles!audit_executions_assignee_id_fkey (
            name
          )
        `)
        .in('status', ['Finalizado', 'Rascunho'])
        .order('realization_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error

      // Dynamic calculation fallback for max_score
      const formattedData = (data || []).map((exec: any) => {
        let calculatedMaxScore = exec.max_score

        if (!calculatedMaxScore || calculatedMaxScore === 0) {
          const scoringSettings = exec.audits?.scoring_settings || []
          let maxScale = 5
          if (Array.isArray(scoringSettings) && scoringSettings.length > 0) {
            maxScale = Math.max(...scoringSettings.map((s: any) => Number(s.score) || 5))
          }

          const actions = exec.audits?.audit_actions || []
          const totalWeight = actions.reduce(
            (sum: number, action: any) => sum + (Number(action.weight) || 1),
            0,
          )

          calculatedMaxScore = totalWeight * maxScale
        }

        return {
          ...exec,
          calculated_max_score: calculatedMaxScore,
        }
      })

      setExecutions(formattedData)
    } catch (error) {
      console.error('Error fetching executions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredExecutions = executions.filter(
    (exec) =>
      exec.audits?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exec.plants?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exec.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getScoreColor = (score: number, maxScore: number) => {
    if (!maxScore || maxScore === 0) return 'bg-red-500 hover:bg-red-600'
    const percentage = score / maxScore
    if (percentage >= 0.8) return 'bg-green-500 hover:bg-green-600'
    if (percentage >= 0.6) return 'bg-yellow-500 hover:bg-yellow-600'
    return 'bg-red-500 hover:bg-red-600'
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F4C81]">
            Auditorias Realizadas
          </h1>
          <p className="text-muted-foreground mt-1">Histórico de todas as auditorias finalizadas</p>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-[#0F4C81]">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              Histórico
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar auditoria, planta ou responsável..."
                className="pl-9 bg-muted/50 border-muted-foreground/20 focus-visible:ring-[#0F4C81]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold text-foreground">Auditoria</TableHead>
                  <TableHead className="font-semibold text-foreground">Planta</TableHead>
                  <TableHead className="font-semibold text-foreground">Responsável</TableHead>
                  <TableHead className="font-semibold text-foreground">Data</TableHead>
                  <TableHead className="text-center font-semibold text-foreground">
                    Pontuação
                  </TableHead>
                  <TableHead className="text-center font-semibold text-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredExecutions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                        <p>Nenhuma auditoria encontrada</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExecutions.map((exec) => (
                    <TableRow key={exec.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-foreground">
                        {exec.audits?.title || '-'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          {exec.plants?.code || '-'}
                        </span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          {exec.plants?.name || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {exec.profiles?.name || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {exec.realization_date
                          ? format(new Date(exec.realization_date + 'T12:00:00'), 'dd/MM/yyyy', {
                              locale: ptBR,
                            })
                          : format(new Date(exec.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={`font-semibold shadow-sm text-white border-none ${getScoreColor(exec.final_score || 0, exec.calculated_max_score)}`}
                        >
                          {Math.round(exec.final_score || 0)} /{' '}
                          {Math.round(exec.calculated_max_score || 0)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-[#0F4C81] hover:bg-blue-50 transition-colors"
                          onClick={() => navigate(`/auditoria-checklist/detalhes/${exec.id}`)}
                          title="Ver Detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
