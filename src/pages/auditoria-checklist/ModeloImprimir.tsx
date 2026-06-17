import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Printer, AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function ModeloImprimir() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const autoPrint = searchParams.get('print') === 'true'

  const [audit, setAudit] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])
  const [clientBrand, setClientBrand] = useState<{
    logo_url?: string
    primary_color?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchAuditDetails()
    }
  }, [id])

  useEffect(() => {
    if (autoPrint && !loading && audit) {
      const originalTitle = document.title
      document.title = `Modelo_Auditoria_${audit.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`
      setTimeout(() => {
        window.print()
        // Wait briefly after print dialog opens before restoring (browsers handle this differently)
        setTimeout(() => {
          document.title = originalTitle
        }, 1000)
      }, 800)
    }
  }, [loading, audit, autoPrint])

  async function fetchAuditDetails() {
    setLoading(true)
    const { data: auditData } = await supabase.from('audits').select('*').eq('id', id).single()

    if (auditData) {
      setAudit(auditData)
      if (auditData.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('logo_url, primary_color')
          .eq('id', auditData.client_id)
          .single()
        if (clientData) {
          setClientBrand(clientData)
        }
      }
    }

    const { data: actionsData } = await supabase
      .from('audit_actions')
      .select('*')
      .eq('audit_id', id)
      .order('order_index', { ascending: true })

    if (actionsData) {
      setActions(actionsData)
    }
    setLoading(false)
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

  if (!audit)
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh]">
        <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
        <h2 className="text-xl font-semibold">Modelo de Auditoria não encontrado</h2>
        <Button
          variant="link"
          onClick={() => navigate('/auditoria-checklist/criadas')}
          className="mt-4"
        >
          Voltar para a lista
        </Button>
      </div>
    )

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-black font-sans pb-12">
      <style>
        {`
          @media print {
            @page { size: A4; margin: 15mm; }
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
              background: white; 
            }
          }
        `}
      </style>

      {/* Screen only top bar */}
      <div className="print:hidden sticky top-0 z-10 p-4 flex justify-between items-center bg-white border-b shadow-sm">
        <Button
          variant="ghost"
          onClick={() => navigate('/auditoria-checklist/criadas')}
          className="gap-2 text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button
          onClick={() => window.print()}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Printer className="w-4 h-4" /> Imprimir Documento PDF
        </Button>
      </div>

      {/* A4 Page Container */}
      <div className="max-w-[210mm] mx-auto bg-white min-h-[297mm] p-10 shadow-xl print:shadow-none print:p-0 print:m-0 mt-8 print:mt-0">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold uppercase tracking-tight text-black mb-1">
              {audit.title}
            </h1>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-gray-800">
              <p>
                <strong>Tipo:</strong> {audit.type || '-'}
              </p>
              <p>
                <strong>Frequência:</strong> {audit.frequency || '-'}
              </p>
              <p>
                <strong>SLA:</strong> {audit.sla_days ? `${audit.sla_days} dias` : '-'}
              </p>
            </div>
          </div>
          {clientBrand?.logo_url && (
            <div className="ml-6 flex-shrink-0">
              <img
                src={clientBrand.logo_url}
                alt="Logo Cliente"
                className="max-h-16 w-auto object-contain"
              />
            </div>
          )}
        </div>

        {/* Scoring Settings Legend */}
        {audit.scoring_settings && audit.scoring_settings.length > 0 && (
          <div className="mb-6 p-4 border border-gray-300 bg-gray-50 rounded">
            <h3 className="font-bold text-xs uppercase mb-3 text-gray-700">Legenda de Avaliação</h3>
            <div className="flex flex-wrap gap-4">
              {audit.scoring_settings.map((setting: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 flex items-center justify-center bg-white border border-gray-400 font-bold shadow-sm rounded-sm">
                    {setting.score}
                  </span>
                  <span className="text-gray-800">{setting.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklist */}
        <h2 className="text-lg font-bold uppercase border-b border-black mb-4 pb-1">
          Lista de Verificação
        </h2>
        <div className="space-y-4">
          {actions.map((action, idx) => (
            <div
              key={action.id || idx}
              className="border border-gray-300 rounded p-4 break-inside-avoid bg-white"
            >
              <div className="flex gap-3">
                <div className="font-bold text-lg pt-0.5">{idx + 1}.</div>
                <div className="flex-1">
                  <h4 className="font-bold text-base leading-tight mb-2 text-black">
                    {action.title}
                  </h4>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-700 mb-4">
                    <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">
                      Peso: <strong>{action.weight || 1}</strong>
                    </span>
                    <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">
                      Evidência:{' '}
                      <strong>{action.evidence_required ? 'Obrigatória' : 'Opcional'}</strong>
                    </span>
                    <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">
                      Comentários:{' '}
                      <strong>{action.comments_required ? 'Obrigatórios' : 'Opcional'}</strong>
                    </span>
                  </div>

                  {/* Evaluation & Notes Area */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    {/* Score Checkboxes */}
                    <div className="flex gap-3 pt-1 flex-wrap">
                      {audit.scoring_settings && audit.scoring_settings.length > 0 ? (
                        audit.scoring_settings.map((s: any, i: number) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className="w-6 h-6 border-2 border-gray-400 rounded-sm bg-white"></div>
                            <span className="text-[10px] font-bold text-gray-600">{s.score}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-gray-400 rounded-sm bg-white"></div>
                            <span className="text-xs font-medium">Conforme</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-gray-400 rounded-sm bg-white"></div>
                            <span className="text-xs font-medium">Não Conforme</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes Box */}
                    <div className="flex-1 w-full border border-dashed border-gray-400 rounded bg-gray-50/50 min-h-[4rem] p-2 relative sm:ml-2 mt-2 sm:mt-0">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
                        Anotações / Observações
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {actions.length === 0 && (
            <div className="text-center p-8 text-gray-500 border border-dashed border-gray-300 rounded">
              Nenhuma ação cadastrada neste modelo.
            </div>
          )}
        </div>

        {/* Signatures Area */}
        <div className="mt-12 pt-8 break-inside-avoid">
          <h2 className="text-base font-bold uppercase mb-12 text-gray-800">
            Assinaturas e Validações
          </h2>
          <div className="grid grid-cols-2 gap-12">
            <div className="border-t border-black pt-2 text-center">
              <p className="font-bold text-sm">Auditor / Responsável</p>
              <p className="text-xs text-gray-500 mt-1">Nome legível, data e assinatura</p>
            </div>
            <div className="border-t border-black pt-2 text-center">
              <p className="font-bold text-sm">Aprovação / Ciente</p>
              <p className="text-xs text-gray-500 mt-1">Nome legível, data e assinatura</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
