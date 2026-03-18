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
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="h-9 w-36 border-gray-200 text-slate-800"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-slate-500">-</span>
            <Input
              type="date"
              className="h-9 w-36 border-gray-200 text-slate-800"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={logs.length === 0 || loading}
            className="text-slate-700 border-gray-300 hover:bg-slate-50"
          >
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border border-gray-200">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-gray-200">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[180px] font-semibold text-slate-800">Data / Hora</TableHead>
              <TableHead className="font-semibold text-slate-800">Usuário (ID)</TableHead>
              <TableHead className="font-semibold text-slate-800">Ação</TableHead>
              <TableHead className="font-semibold text-slate-800">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-deepBlue" />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-slate-600">
                  Nenhum log encontrado no período selecionado.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-50 border-gray-100">
                  <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell className="font-medium text-sm text-slate-800">
                    {log.user_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-brand-deepBlue/5 text-brand-deepBlue border-brand-deepBlue/20 font-medium"
                    >
                      {log.action_type}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="text-xs text-slate-600 truncate max-w-[400px]"
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
