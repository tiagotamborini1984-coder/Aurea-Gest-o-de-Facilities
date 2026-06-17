import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Printer,
  AlertCircle,
  FileImage,
  User,
  Calendar,
  MapPin,
  ClipboardList,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'

export default function DetalhesRealizada() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [execution, setExecution] = useState<any>(null)
  const [answers, setAnswers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchExecutionDetails()
    }
  }, [id])

  async function fetchExecutionDetails() {
    setLoading(true)
    const { data: execData } = await supabase
      .from('audit_executions')
      .select(`
      *, audits ( title, scoring_settings ), plants ( name ), profiles ( name )
    `)
      .eq('id', id)
      .single()
    if (execData) setExecution(execData)

    const { data: ansData } = await supabase
      .from('audit_execution_answers')
      .select(`
      *, audit_actions ( title, weight, order_index ), profiles ( name )
    `)
      .eq('execution_id', id)
      .order('audit_actions(order_index)', { ascending: true })

    if (ansData) {
      ansData.sort(
        (a, b) => (a.audit_actions?.order_index || 0) - (b.audit_actions?.order_index || 0),
      )
      setAnswers(ansData)
    }
    setLoading(false)
  }

  if (loading)
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )

  if (!execution)
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh]">
        <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
        <h2 className="text-xl font-semibold">Auditoria não encontrada</h2>
        <Button
          variant="link"
          onClick={() => navigate('/auditoria-checklist/realizadas')}
          className="mt-4"
        >
          Voltar para a lista
        </Button>
      </div>
    )

  const scoringSettings = execution.audits?.scoring_settings || []
  const percentage = execution.max_score
    ? Math.round((execution.final_score / execution.max_score) * 100)
    : 0

  const getScoreLabel = (score: number | null) => {
    if (score === null) return { label: 'Não avaliado', color: 'bg-slate-100 text-slate-600' }
    const setting = scoringSettings.find((s: any) => s.score === score)
    if (setting) {
      const isGood = setting.score >= 4
      const isOk = setting.score === 3
      return {
        label: setting.description,
        color: isGood
          ? 'bg-green-100 text-green-700'
          : isOk
            ? 'bg-amber-100 text-amber-700'
            : 'bg-red-100 text-red-700',
      }
    }
    return { label: score.toString(), color: 'bg-blue-100 text-blue-700' }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 bg-white dark:bg-slate-950 min-h-screen print:absolute print:left-0 print:top-0 print:w-full print:bg-white print:z-[9999] print:p-8">
      <div className="flex items-center justify-between print:hidden">
        <Button
          variant="ghost"
          onClick={() => navigate('/auditoria-checklist/realizadas')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" /> Imprimir Relatório
        </Button>
      </div>

      <div className="border-b pb-6 print:border-b-2 print:border-black">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Relatório de Auditoria: {execution.audits?.title}
        </h1>
        <div className="flex flex-wrap gap-6 text-sm text-slate-600 dark:text-slate-400 mt-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="font-medium text-slate-800 dark:text-slate-200">Planta:</span>{' '}
            {execution.plants?.name}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="font-medium text-slate-800 dark:text-slate-200">Data:</span>{' '}
            {execution.realization_date
              ? format(new Date(execution.realization_date + 'T12:00:00Z'), 'dd/MM/yyyy', {
                  locale: ptBR,
                })
              : '-'}
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="font-medium text-slate-800 dark:text-slate-200">Auditor:</span>{' '}
            {execution.profiles?.name}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-lg border flex items-center justify-between print:bg-slate-50 print:border-slate-200 print:break-inside-avoid">
        <div>
          <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" /> Resumo de Desempenho
          </h3>
          <p className="text-slate-500 text-sm">Pontuação final obtida nesta avaliação.</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-primary">{percentage}%</div>
          <div className="text-sm text-slate-500 mt-1">
            {execution.final_score} de {execution.max_score} pontos
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 border-b pb-2">
          Itens Avaliados
        </h2>
        <div className="space-y-4">
          {answers.map((ans, idx) => {
            const scoreData = getScoreLabel(ans.score)
            return (
              <div
                key={ans.id}
                className="border rounded-lg p-4 bg-white dark:bg-slate-900 shadow-sm print:shadow-none print:border-slate-300 print:break-inside-avoid"
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                      {idx + 1}. {ans.audit_actions?.title}
                    </h4>
                    {ans.observations && (
                      <div className="mt-3 bg-slate-50 dark:bg-slate-800 print:bg-transparent print:border print:border-dashed print:border-slate-300 p-3 rounded text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-semibold block mb-1">Observações:</span>
                        {ans.observations}
                      </div>
                    )}
                    {ans.corrective_assignee_id && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/20 p-2 rounded print:bg-transparent print:border print:border-amber-200">
                        <AlertCircle className="w-4 h-4" />
                        <span>
                          Ação Corretiva atribuída para{' '}
                          <strong>{ans.profiles?.name || 'Usuário'}</strong> até{' '}
                          {ans.corrective_due_date
                            ? format(new Date(ans.corrective_due_date), 'dd/MM/yyyy')
                            : '-'}
                        </span>
                      </div>
                    )}
                    {(ans.evidence_urls?.length > 0 || ans.evidence_url) && (
                      <div className="mt-4">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2 print:hidden">
                          Evidências:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
                          {Array.from(
                            new Set(
                              (ans.evidence_urls || []).concat(
                                ans.evidence_url ? [ans.evidence_url] : [],
                              ),
                            ),
                          ).map((url: string, i: number) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="relative aspect-square rounded-md border border-slate-200 overflow-hidden hover:ring-2 hover:ring-primary transition-all group"
                            >
                              {url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                <img
                                  src={url}
                                  alt="Evidência"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-50 dark:bg-slate-800">
                                  <FileImage className="h-6 w-6 text-slate-400 mb-1" />
                                  <span className="text-[10px] truncate w-full px-1 text-slate-500">
                                    Documento
                                  </span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </a>
                          ))}
                        </div>
                        <span className="hidden print:inline-flex text-sm text-slate-500 items-center gap-1">
                          <FileImage className="w-4 h-4" />{' '}
                          {
                            Array.from(
                              new Set(
                                (ans.evidence_urls || []).concat(
                                  ans.evidence_url ? [ans.evidence_url] : [],
                                ),
                              ),
                            ).length
                          }{' '}
                          evidência(s) anexada(s) eletronicamente.
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 min-w-[120px]">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${scoreData.color} print:border print:border-slate-300 print:bg-transparent print:text-slate-800`}
                    >
                      {scoreData.label}
                    </div>
                    <div className="text-xs text-slate-500">
                      Peso: {ans.audit_actions?.weight || 1}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {(execution.participants?.trim() || execution.signatures?.length > 0) && (
        <div className="mt-12 pt-8 border-t space-y-6 print:break-inside-avoid">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Participantes e Assinaturas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {execution.participants?.split(',').map((p: string, i: number) => {
              const sig = execution.signatures?.[i]
              const url = typeof sig === 'string' ? sig : sig?.url
              return (
                <div key={i} className="flex flex-col items-center text-center space-y-2">
                  <div className="h-24 w-full max-w-[250px] border-b border-dashed border-slate-400 flex items-end justify-center pb-2">
                    {url ? (
                      <img src={url} alt={`Assinatura`} className="max-h-20 object-contain" />
                    ) : (
                      <span className="text-slate-300 italic text-sm mb-2">
                        Assinatura não coletada
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{p.trim()}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
