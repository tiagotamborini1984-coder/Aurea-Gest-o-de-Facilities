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
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'

export default function Auditoria() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAppStore()

  useEffect(() => {
    if (!profile?.client_id) return
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*, auth_users:user_id(email)')
        .eq('client_id', profile.client_id)
        .order('created_at', { ascending: false })
        .limit(100)
      setLogs(data || [])
      setLoading(false)
    }
    fetchLogs()
  }, [profile])

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Log de Auditoria</h2>
        <p className="text-muted-foreground mt-1">
          Rastreabilidade de ações no sistema (retenção automática de 2 meses).
        </p>
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
                  Nenhum log encontrado.
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
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[400px]">
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
