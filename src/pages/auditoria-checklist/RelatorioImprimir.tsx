import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer, AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00')
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date)
  } catch (e) {
    return dateStr
  }
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
  } catch (e) {
    return dateStr
  }
}

export default function RelatorioImprimir() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const autoPrint = searchParams.get('print') === 'true'

  const [execution, setExecution] = useState<any>(null)
  const [audit, setAudit] = useState<any>(null)
  const [plant, setPlant] = useState<any>(null)
  const [assignee, setAssignee] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])
  const [answers, setAnswers] = useState<any[]>([])
  const [clientBrand, setClientBrand] = useState<{
    logo_url?: string
    primary_color?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchData()
    }
  }, [id])

  useEffect(() => {
    if (autoPrint && !loading && execution && audit) {
      const originalTitle = document.title
      document.title = `Relatorio_Auditoria_${audit?.title?.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`
      setTimeout(() => {
        window.print()
        setTimeout(() => {
          document.title = originalTitle
        }, 1000)
      }, 800)
    }
  }, [loading, execution, autoPrint, audit])

  async function fetchData() {
    setLoading(true)
    try {
      const { data: execData } = await supabase
        .from('audit_executions')
        .select('*')
        .eq('id', id)
        .single()

      if (!execData) return setLoading(false)
      setExecution(execData)

      const { data: auditData } = await supabase
        .from('audits')
        .select('*')
        .eq('id', execData.audit_id)
        .single()
      setAudit(auditData)

      if (auditData?.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('logo_url, primary_color')
          .eq('id', auditData.client_id)
          .single()
        setClientBrand(clientData)
      }

      if (execData.plant_id) {
        const { data: plantData } = await supabase
          .from('plants')
          .select('name')
          .eq('id', execData.plant_id)
          .single()
        setPlant(plantData)
      }

      if (execData.assignee_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', execData.assignee_id)
          .single()
        setAssignee(profileData)
      }

      const { data: actionsData } = await supabase
        .from('audit_actions')
        .select('*')
        .eq('audit_id', execData.audit_id)
        .order('order_index')
      setActions(actionsData || [])

      const { data: answersData } = await supabase
        .from('audit_execution_answers')
        .select('*')
        .eq('execution_id', id)
      setAnswers(answersData || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (loading)
    return (
      <div className="p-8 space-y-6 max-w-[210mm] mx-auto mt-8 bg-white shadow min-h-[297mm]">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )

  if (!execution)
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh]">
        <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
        <h2 className="text-xl font-semibold">Relatório não encontrado</h2>
        <Button
          variant="link"
          onClick={() => navigate('/auditoria-checklist/realizadas')}
          className="mt-4"
        >
          Voltar para a lista
        </Button>
      </div>
    )

  const getScoreColor = (score: number, max: number) => {
    const percentage = max > 0 ? (score / max) * 100 : 0
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const primaryColor = clientBrand?.primary_color || '#1e293b'

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-black font-sans pb-12">
      <style>
        {`
          @media print {
            @page { size: A4; margin: 15mm; }
            body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-break-inside-avoid { break-inside: avoid; }
            .print-break-before-page { break-before: page; }
          }
        `}
      </style>

      {/* Header Controls */}
      <div className="max-w-[210mm] mx-auto pt-6 px-4 print:hidden flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="bg-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimir PDF
        </Button>
      </div>

      {/* A4 Paper Container */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-sm print:shadow-none print:w-full">
        {/* Report Header */}
        <div
          className="p-8 border-b-4 flex items-center justify-between"
          style={{ borderColor: primaryColor }}
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              {audit?.title || 'Relatório de Auditoria'}
            </h1>
            <p className="text-slate-500 text-lg">{plant?.name || 'Local não informado'}</p>
          </div>
          {clientBrand?.logo_url && (
            <img src={clientBrand.logo_url} alt="Logo" className="h-16 object-contain" />
          )}
        </div>

        <div className="p-8 space-y-8">
          {/* Metadata Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-lg border border-slate-100 print-break-inside-avoid">
            <div>
              <p className="text-sm text-slate-500 font-medium">Data de Realização</p>
              <p className="font-semibold">
                {execution.realization_date
                  ? formatDate(execution.realization_date)
                  : 'Não informada'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Auditor(a)</p>
              <p className="font-semibold">{assignee?.name || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Participantes</p>
              <p className="font-semibold">{execution.participants || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Status</p>
              <p className="font-semibold">{execution.status}</p>
            </div>
          </div>

          {/* Score Summary */}
          {execution.final_score !== null && execution.max_score !== null && (
            <div className="flex items-center justify-center py-8 border rounded-lg print-break-inside-avoid bg-white">
              <div className="text-center">
                <p className="text-lg text-slate-500 mb-2 font-medium uppercase tracking-wider">
                  Pontuação Final
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span
                    className={`text-6xl font-black ${getScoreColor(execution.final_score, execution.max_score)}`}
                  >
                    {execution.final_score}
                  </span>
                  <span className="text-3xl text-slate-300 font-medium">
                    / {execution.max_score}
                  </span>
                </div>
                <p className="text-base text-slate-500 mt-3 bg-slate-100 inline-block px-3 py-1 rounded-full font-medium">
                  {execution.max_score > 0
                    ? ((execution.final_score / execution.max_score) * 100).toFixed(1)
                    : 0}
                  % de conformidade
                </p>
              </div>
            </div>
          )}

          {/* Detailed Results */}
          <div>
            <h3 className="text-xl font-bold text-slate-800 border-b pb-2 mb-6">
              Resultados Detalhados
            </h3>
            <div className="space-y-6">
              {actions.map((action, index) => {
                const answer = answers.find((a) => a.action_id === action.id)
                const score = answer?.score

                return (
                  <div
                    key={action.id}
                    className="border rounded-lg overflow-hidden print-break-inside-avoid bg-white"
                  >
                    <div className="bg-slate-50 p-4 border-b flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800 text-lg">
                          {index + 1}. {action.title}
                        </h4>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2 bg-white px-3 py-1 rounded-md shadow-sm border border-slate-200">
                        <span className="text-sm text-slate-500 font-medium">Pontos:</span>
                        <span
                          className={`font-bold text-lg ${score === null ? 'text-slate-400' : 'text-slate-800'}`}
                        >
                          {score !== undefined && score !== null ? score : '-'}
                        </span>
                      </div>
                    </div>

                    {(answer?.observations ||
                      answer?.evidence_url ||
                      (answer?.evidence_urls && answer.evidence_urls.length > 0)) && (
                      <div className="p-5 space-y-5">
                        {answer.observations && (
                          <div>
                            <p className="text-sm text-slate-500 font-semibold mb-2 uppercase tracking-wide">
                              Observações
                            </p>
                            <p className="text-slate-700 bg-slate-50/70 p-4 rounded-md border text-sm leading-relaxed">
                              {answer.observations}
                            </p>
                          </div>
                        )}

                        {(answer.evidence_url ||
                          (answer.evidence_urls && answer.evidence_urls.length > 0)) && (
                          <div>
                            <p className="text-sm text-slate-500 font-semibold mb-3 uppercase tracking-wide">
                              Evidências
                            </p>
                            <div className="flex flex-wrap gap-4">
                              {answer.evidence_url && (
                                <img
                                  src={answer.evidence_url}
                                  alt="Evidência"
                                  className="h-40 object-cover rounded-md border shadow-sm"
                                />
                              )}
                              {answer.evidence_urls &&
                                Array.isArray(answer.evidence_urls) &&
                                answer.evidence_urls.map((url: string, i: number) => (
                                  <img
                                    key={i}
                                    src={url}
                                    alt={`Evidência ${i + 1}`}
                                    className="h-40 object-cover rounded-md border shadow-sm"
                                  />
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Signatures */}
          {execution.signatures &&
            Array.isArray(execution.signatures) &&
            execution.signatures.length > 0 && (
              <div className="print-break-inside-avoid pt-10 pb-8">
                <h3 className="text-xl font-bold text-slate-800 border-b pb-2 mb-8">Assinaturas</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                  {execution.signatures.map((sig: any, index: number) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="h-24 w-full flex items-center justify-center border-b border-slate-300 mb-3">
                        <img
                          src={sig.signature}
                          alt={`Assinatura de ${sig.name}`}
                          className="max-h-full max-w-full object-contain mix-blend-multiply"
                        />
                      </div>
                      <p className="font-bold text-slate-800 text-center">{sig.name}</p>
                      <p className="text-sm text-slate-500 text-center">{sig.role}</p>
                      {sig.date && (
                        <p className="text-xs text-slate-400 mt-1 font-medium">
                          {formatDateTime(sig.date)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
