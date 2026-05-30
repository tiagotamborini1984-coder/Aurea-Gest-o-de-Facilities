import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Search } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

export default function AuditoriaRealizadas() {
  const [executions, setExecutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

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
          final_score,
          max_score,
          audits ( title, type ),
          plants ( name ),
          profiles!audit_executions_assignee_id_fkey ( name )
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

  const filteredExecutions = executions.filter(
    (exec) =>
      exec.audits?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exec.plants?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auditorias Realizadas</h1>
          <p className="text-muted-foreground">
            Acompanhe e visualize os resultados das auditorias finalizadas.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou planta..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table className="whitespace-nowrap">
          <TableHeader>
            <TableRow>
              <TableHead>Auditoria</TableHead>
              <TableHead>Planta</TableHead>
              <TableHead>Auditor</TableHead>
              <TableHead>Data de Realização</TableHead>
              <TableHead>Pontuação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-[200px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[80px]" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 ml-auto inline-block" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredExecutions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma auditoria realizada encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredExecutions.map((exec) => {
                const final = exec.final_score ?? 0
                const max = exec.max_score ?? 0
                const pct = max > 0 ? final / max : 0
                const variant = pct >= 0.8 ? 'default' : pct >= 0.5 ? 'secondary' : 'destructive'

                return (
                  <TableRow key={exec.id}>
                    <TableCell className="font-medium">{exec.audits?.title}</TableCell>
                    <TableCell>{exec.plants?.name}</TableCell>
                    <TableCell>{exec.profiles?.name}</TableCell>
                    <TableCell>
                      {exec.realization_date
                        ? format(new Date(exec.realization_date), 'dd/MM/yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={variant}>
                        {final} / {max}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild title="Visualizar Detalhes">
                        <Link to={`/auditoria-checklist/detalhes/${exec.id}`}>
                          <Eye className="h-4 w-4" />
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
    </div>
  )
}
