import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MapPin, Calendar, User, ClipboardList, FileImage, MessageSquare } from 'lucide-react'

export function PrintLayout({ execution, actions, answersMap, clientBrand }: any) {
  if (!execution) return null

  const scoringSettings = execution.audits?.scoring_settings || []
  const percentage = execution.max_score
    ? Math.round((execution.final_score / execution.max_score) * 100)
    : 0

  const getScoreLabel = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'Não avaliado'
    const setting = scoringSettings.find((s: any) => s.score === score)
    return setting ? setting.description : score.toString()
  }

  const primaryColor = clientBrand?.primary_color || '#1e293b'
  const signatures = execution.signatures || []

  return (
    <div
      id="print-layout-container"
      className="hidden print:block bg-white text-black w-full font-sans"
    >
      {/* Header */}
      <div
        className="border-b-2 pb-6 flex justify-between items-start gap-4 mb-8"
        style={{ borderColor: 'black' }}
      >
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: primaryColor }}>
            Relatório de Auditoria: {execution.audits?.title}
          </h1>
          <div className="flex flex-col gap-2 text-sm mt-4 text-black">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">Planta:</span> {execution.plants?.name || '-'}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">Data:</span>{' '}
              {execution.realization_date
                ? format(new Date(execution.realization_date + 'T12:00:00Z'), 'dd/MM/yyyy', {
                    locale: ptBR,
                  })
                : '-'}
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="font-medium">Auditor:</span> {execution.profiles?.name || '-'}
            </div>
            {execution.participants && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="font-medium">Participantes:</span> {execution.participants}
              </div>
            )}
          </div>
        </div>
        {clientBrand?.logo_url && (
          <img src={clientBrand.logo_url} alt="Logo Cliente" className="max-h-20 object-contain" />
        )}
      </div>

      {/* Summary */}
      {execution.final_score !== null && execution.max_score !== null && (
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-lg flex items-center justify-between break-inside-avoid mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2 text-black">
              <ClipboardList className="w-5 h-5" /> Resumo de Desempenho
            </h3>
            <p className="text-slate-700 text-sm">Pontuação final obtida nesta avaliação.</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold" style={{ color: primaryColor }}>
              {percentage}%
            </div>
            <div className="text-sm text-slate-700 mt-1">
              {execution.final_score} de {execution.max_score} pontos
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="space-y-6">
        <h2
          className="text-xl font-bold border-b pb-2 text-black mb-4"
          style={{ borderColor: 'black' }}
        >
          Itens Avaliados
        </h2>
        <div className="space-y-4">
          {actions.map((action: any, idx: number) => {
            const ans = answersMap[action.id] || {}
            const label = getScoreLabel(ans.score)

            const evidenceUrls = Array.from(
              new Set((ans.evidence_urls || []).concat(ans.evidence_url ? [ans.evidence_url] : [])),
            ) as string[]

            return (
              <div
                key={action.id}
                className="border border-slate-300 rounded-lg p-4 bg-white break-inside-avoid"
              >
                <div className="flex flex-row items-start justify-between gap-4">
                  <div className="flex-1 w-full">
                    <h4 className="font-semibold text-black text-base mb-2">
                      {idx + 1}. {action.title}
                    </h4>
                    <div className="text-sm font-medium text-slate-800">
                      Resposta: <span className="font-bold">{label}</span>
                    </div>
                    {ans.observations && (
                      <div className="mt-2 text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>{ans.observations}</span>
                      </div>
                    )}
                  </div>
                </div>
                {evidenceUrls.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <FileImage className="w-4 h-4" />
                      Evidências
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {evidenceUrls.map((url, i) => (
                        <div
                          key={i}
                          className="w-32 h-32 border border-slate-200 rounded overflow-hidden"
                        >
                          <img
                            src={url}
                            alt={`Evidência ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Signatures */}
      {signatures && signatures.length > 0 && (
        <div className="mt-12 break-inside-avoid">
          <h2
            className="text-xl font-bold border-b pb-2 text-black mb-6"
            style={{ borderColor: 'black' }}
          >
            Assinaturas
          </h2>
          <div className="grid grid-cols-2 gap-8">
            {signatures.map((sig: any, index: number) => (
              <div key={index} className="flex flex-col items-center justify-center p-4">
                {sig.signature && (
                  <img
                    src={sig.signature}
                    alt={`Assinatura de ${sig.name}`}
                    className="max-h-24 object-contain mb-2"
                  />
                )}
                <div className="w-full border-t border-black text-center pt-2">
                  <p className="font-semibold text-sm">{sig.name}</p>
                  {sig.role && <p className="text-xs text-slate-600">{sig.role}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
