import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
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
import { Search, Loader2, ClipboardCheck, Printer, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export default function AuditoriaRealizadas() {
  const { profile } = useAppStore()
  const { plants } = useMasterData()
  const hasAccess = useHasAccess('Auditoria e Checklist')

  const [executions, setExecutions] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [viewExec, setViewExec] = useState<any>(null)
  const [viewAnswers, setViewAnswers] = useState<any[]>([])

  useEffect(() => {
    if (!profile) return
    const loadData = async () => {
      setLoading(true)
      const { data: pData } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('client_id', profile.client_id)
      setUsers(pData || [])

      const { data: eData } = await supabase
        .from('audit_executions')
        .select('*, audits!inner(*)')
        .eq('audits.client_id', profile.client_id)
        .order('created_at', { ascending: false })

      setExecutions(eData || [])
      setLoading(false)
    }
    loadData()
  }, [profile])

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  const filteredExecutions = executions.filter((e) => {
    const searchStr = searchTerm.toLowerCase()
    return (
      e.audits?.title.toLowerCase().includes(searchStr) ||
      e.audits?.type.toLowerCase().includes(searchStr) ||
      e.status.toLowerCase().includes(searchStr)
    )
  })

  const openView = async (exec: any) => {
    setViewExec(exec)
    const { data } = await supabase
      .from('audit_execution_answers')
      .select('*, audit_actions(*)')
      .eq('execution_id', exec.id)
      .order('audit_actions(order_index)' as any)
    setViewAnswers(data || [])
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in print:max-w-none print:w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-brand-deepBlue/10 p-2.5 rounded-xl border border-brand-deepBlue/20 shadow-sm">
            <ClipboardCheck className="h-6 w-6 text-brand-deepBlue" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Auditorias Realizadas
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Acompanhe as auditorias enviadas e finalizadas.
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar título, tipo..."
              className="pl-9 bg-white border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="border-slate-200"
            disabled={executions.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <Table className="print:text-sm">
          <TableHeader className="bg-slate-50/80 border-b border-slate-200 print:bg-transparent">
            <TableRow>
              <TableHead className="font-semibold text-slate-800 print:text-black">
                Título da Auditoria
              </TableHead>
              <TableHead className="font-semibold text-slate-800 print:text-black">Tipo</TableHead>
              <TableHead className="font-semibold text-slate-800 print:text-black">
                Planta
              </TableHead>
              <TableHead className="font-semibold text-slate-800 print:text-black">
                Responsável
              </TableHead>
              <TableHead className="font-semibold text-slate-800 print:text-black">
                Status
              </TableHead>
              <TableHead className="font-semibold text-slate-800 print:text-black">
                Score Final
              </TableHead>
              <TableHead className="font-semibold text-slate-800 text-right print:hidden">
                Ação
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-deepBlue" />
                </TableCell>
              </TableRow>
            ) : filteredExecutions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Nenhuma auditoria encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredExecutions.map((exec) => {
                const plant = plants.find((p) => p.id === exec.plant_id)
                const user = users.find((u) => u.id === exec.assignee_id)
                return (
                  <TableRow
                    key={exec.id}
                    className="hover:bg-slate-50 border-slate-100 print:border-b"
                  >
                    <TableCell className="font-medium text-slate-800">
                      {exec.audits?.title}
                      {exec.realization_date && (
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                          Realizada em: {format(new Date(exec.realization_date), 'dd/MM/yyyy')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600">{exec.audits?.type}</TableCell>
                    <TableCell className="text-slate-600">{plant?.name || '-'}</TableCell>
                    <TableCell className="text-slate-600">{user?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-bold',
                          exec.status === 'Finalizado'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-amber-100 text-amber-800 border-amber-300',
                        )}
                      >
                        {exec.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {exec.status === 'Finalizado' ? (
                        <div className="flex items-baseline gap-1">
                          <span className="font-bold text-brand-deepBlue text-lg">
                            {exec.final_score}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            / {exec.max_score}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right print:hidden">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openView(exec)}
                        className="text-brand-deepBlue hover:bg-brand-deepBlue/10"
                      >
                        <Eye className="w-4 h-4 mr-2" /> Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewExec} onOpenChange={(open) => !open && setViewExec(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-xl">
              Relatório de Auditoria: {viewExec?.audits?.title}
            </DialogTitle>
          </DialogHeader>
          {viewExec && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                    Status
                  </p>
                  <p className="font-semibold text-slate-800">{viewExec.status}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                    Score
                  </p>
                  <p className="font-semibold text-brand-deepBlue">
                    {viewExec.final_score || 0} / {viewExec.max_score || 0}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                    Data Realização
                  </p>
                  <p className="font-semibold text-slate-800">
                    {viewExec.realization_date
                      ? format(new Date(viewExec.realization_date), 'dd/MM/yyyy')
                      : '-'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                    Participantes
                  </p>
                  <p
                    className="font-semibold text-slate-800 truncate"
                    title={viewExec.participants}
                  >
                    {viewExec.participants || '-'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-3 text-lg border-b pb-2">Respostas</h4>
                {viewAnswers.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhuma resposta registrada (Auditoria Pendente).
                  </p>
                ) : (
                  <div className="space-y-3">
                    {viewAnswers.map((ans, idx) => (
                      <div
                        key={ans.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-200 rounded-xl bg-white shadow-sm"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 text-sm">
                            <span className="text-slate-400 mr-2">{idx + 1}.</span>
                            {ans.audit_actions?.title}
                          </p>
                          {ans.evidence_url && (
                            <a
                              href={ans.evidence_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block mt-2 text-xs text-brand-deepBlue hover:underline bg-brand-deepBlue/5 px-2 py-1 rounded"
                            >
                              Ver Evidência Anexada
                            </a>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-lg font-black text-brand-deepBlue">
                          {ans.score}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
