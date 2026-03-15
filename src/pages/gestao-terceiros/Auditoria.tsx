import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { format, subDays, endOfDay, startOfDay } from 'date-fns'
import { Loader2, Download } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import { useToast } from '@/hooks/use-toast'

export default function Auditoria() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const { profile } = useAppStore()
  const { toast } = useToast()

  useEffect(() => {
    if (!profile?.client_id) return
    const fetchLogs = async () => {
      setLoading(true)
      const from = startOfDay(new Date(dateFrom)).toISOString()
      const to = endOfDay(new Date(dateTo)).toISOString()

      const { data } = await supabase
        .from('audit_logs')
        .select('*, auth_users:user_id(email)')
        .eq('client_id', profile.client_id)
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false })
        .limit(500)

      setLogs(data || [])
      setLoading(false)
    }
    fetchLogs()
  }, [profile, dateFrom, dateTo])

  const handleExport = () => {
    if (logs.length === 0) return
    const exportData = logs.map((log) => ({
      'Data/Hora': format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
      'Usuário (ID)': log.user_id,
      Ação: log.action_type,
      Detalhes: log.details,
    }))
    exportToCSV(`auditoria_${dateFrom}_${dateTo}.csv`, exportData)
    toast({ title: 'Relatório exportado com sucesso' })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Log de Auditoria</h2>
          <p className="text-muted-foreground mt-1">
            Rastreabilidade de ações no sistema (retenção automática de 2 meses).
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="h-9 w-36"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              className="h-9 w-36"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={logs.length === 0 || loading}
          >
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border border-brand-light">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[180px]">Data / Hora</TableHead>
              <TableHead>Usuário (ID)</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-blue" />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum log encontrado no período selecionado.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {log.user_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-brand-blue/5 text-brand-blue font-medium"
                    >
                      {log.action_type}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="text-xs text-muted-foreground truncate max-w-[400px]"
                    title={log.details}
                  >
                    {log.details}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
