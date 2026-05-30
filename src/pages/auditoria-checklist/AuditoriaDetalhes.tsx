import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft } from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function AuditoriaDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAppStore()

  const [execution, setExecution] = useState<any>(null)
  const [audit, setAudit] = useState<any>(null)
  const [answers, setAnswers] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [plant, setPlant] = useState<any>(null)
  const [assignee, setAssignee] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!id) return
      setLoading(true)

      const { data: execData } = await supabase
        .from('audit_executions')
        .select('*')
        .eq('id', id)
        .single()

      if (!execData) {
        setLoading(false)
        return
      }

      setExecution(execData)

      const { data: auditData } = await supabase
        .from('audits')
        .select('*')
        .eq('id', execData.audit_id)
        .single()

      setAudit(auditData)

      const { data: plantData } = await supabase
        .from('plants')
        .select('*')
        .eq('id', execData.plant_id)
        .single()
      setPlant(plantData)

      const { data: assigneeData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', execData.assignee_id)
        .single()
      setAssignee(assigneeData)

      const { data: answersData } = await supabase
        .from('audit_execution_answers')
        .select(`*, audit_actions (*)`)
        .eq('execution_id', id)

      setAnswers(answersData || [])

      if (profile?.role === 'Administrador' || profile?.role === 'Master') {
        const { data: historyData } = await supabase
          .from('audit_executions')
          .select(`*, profiles:assignee_id (name)`)
          .eq('audit_id', execData.audit_id)
          .eq('plant_id', execData.plant_id)
          .order('created_at', { ascending: false })

        setHistory(historyData || [])
      }

      setLoading(false)
    }

    loadData()
  }, [id, profile])

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!execution) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Auditoria não encontrada.</p>
        <Button variant="link" onClick={() => navigate(-1)} className="mt-4">
          Voltar
        </Button>
      </div>
    )
  }

  const percentage =
    execution?.max_score > 0 ? (execution.final_score / execution.max_score) * 100 : 0
  const isFinalizado = execution?.status === 'Finalizado'
  const statusColor = isFinalizado
    ? 'bg-green-100 text-green-800 border-green-300'
    : 'bg-yellow-100 text-yellow-800 border-yellow-300'

  function getScoreColor(score: number | null) {
    if (score === null) return 'bg-gray-100 text-gray-800 border-gray-300'
    if (score >= 4) return 'bg-green-100 text-green-800 border-green-300'
    if (score === 3) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto bg-white rounded-lg shadow-sm print:shadow-none print:p-0 print:max-w-none">
      <div className="flex items-center justify-between print:hidden mb-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      <div className="border-b pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{audit?.title}</h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">
              {plant?.name} {plant?.city && `- ${plant.city}`}
            </p>
          </div>
          <div className={cn('px-4 py-2 rounded-md border', statusColor)}>
            <span className="font-semibold text-sm sm:text-base">{execution?.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-6">
          <div className="bg-gray-50 p-3 rounded-md print:bg-transparent print:p-0 print:border print:border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Data</p>
            <p className="font-medium text-gray-900">
              {execution?.realization_date
                ? format(new Date(execution.realization_date), 'dd/MM/yyyy')
                : '-'}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-md print:bg-transparent print:p-0 print:border print:border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Auditor(a)</p>
            <p className="font-medium text-gray-900">{assignee?.name || '-'}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-md print:bg-transparent print:p-0 print:border print:border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pontuação</p>
            <p className="font-medium text-gray-900">
              {execution?.final_score || 0} / {execution?.max_score || 0}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-md print:bg-transparent print:p-0 print:border print:border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Desempenho</p>
            <div className="flex items-center">
              <span className="font-bold text-lg text-primary">{percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Checklist da Auditoria</h2>
        {answers.length === 0 ? (
          <p className="text-gray-500 italic">Nenhum item respondido ainda.</p>
        ) : (
          answers
            .sort(
              (a, b) => (a.audit_actions?.order_index || 0) - (b.audit_actions?.order_index || 0),
            )
            .map((ans, idx) => (
              <Card
                key={ans.id}
                className="print-break-inside-avoid shadow-sm print:shadow-none print:border-gray-200"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 flex items-start">
                        <span className="mr-2 text-gray-400 mt-0.5">{idx + 1}.</span>
                        {ans.audit_actions?.title}
                      </h3>
                      {ans.observations && (
                        <div className="mt-3 bg-gray-50 p-3 rounded-md text-sm text-gray-700 print:border print:bg-transparent">
                          <span className="font-semibold block mb-1 text-gray-900">
                            Observações:
                          </span>
                          {ans.observations}
                        </div>
                      )}
                    </div>

                    <div
                      className={cn(
                        'px-4 py-2 rounded-md border min-w-[80px] text-center shrink-0 self-start sm:self-auto',
                        getScoreColor(ans.score),
                      )}
                    >
                      <span className="text-[10px] uppercase tracking-wider block mb-1 opacity-80">
                        Nota
                      </span>
                      <span className="font-bold text-lg leading-none">
                        {ans.score !== null ? ans.score : '-'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>

      {(profile?.role === 'Administrador' || profile?.role === 'Master') && history.length > 0 && (
        <div className="mt-10 pt-8 border-t print-break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Histórico de Realizações</h2>
          <div className="border rounded-md overflow-hidden print:border-gray-300">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 print:bg-gray-100">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">Data</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Auditor</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Desempenho</th>
                </tr>
              </thead>
              <tbody className="divide-y print:divide-gray-200">
                {history.map((hist) => {
                  const histPerc =
                    hist.max_score > 0 ? (hist.final_score / hist.max_score) * 100 : 0
                  return (
                    <tr key={hist.id} className="bg-white">
                      <td className="px-4 py-3 text-gray-600">
                        {hist.realization_date
                          ? format(new Date(hist.realization_date), 'dd/MM/yyyy')
                          : format(new Date(hist.created_at), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{hist.profiles?.name || '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-medium border',
                            hist.status === 'Finalizado'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-200',
                          )}
                        >
                          {hist.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">{histPerc.toFixed(1)}%</span>
                        <span className="text-gray-500 ml-1.5 text-xs">
                          ({hist.final_score}/{hist.max_score})
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
