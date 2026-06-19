import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MapPin, Calendar, User, ClipboardList, AlertCircle, FileImage } from 'lucide-react'

export function PrintLayout({ execution, actions, answersMap, clientBrand }: any) {
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

  return (
    <div className="hidden print:block bg-white text-black w-full">
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
          </div>
        </div>
        {clientBrand?.logo_url && (
          <img src={clientBrand.logo_url} alt="Logo Cliente" className="max-h-20 object-contain" />
        )}
      </div>

      {/* Summary */}
      {execution.final_score !== null && execution.max_score !== null && (
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-lg flex items-center justify-between print-break-inside-avoid mb-8">
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
                className="border border-slate-300 rounded-lg p-4 bg-white print-break-inside-avoid"
              >
                <div className="flex flex-row items-start justify-between gap-4">
                  <div className="flex-1 w-full">
                    <h4 className="font-semibold text-black text-base">
                      {idx + 1}. {action.title}
                    </h4>
                    {ans.observations && (
                      <div className="mt-3 border border-dashed border-slate-300 p-3 rounded text-sm text-black">
                        <span className="font-semibold block mb-1">Observações:</span>
                        {ans.observations}
                      </div>
                    )}
                    {ans.corrective_assignee_id && (
                      <div className="mt-3 flex items-center gap-2 text-sm border border-slate-300 p-2 rounded">
                        <AlertCircle className="w-4 h-4" />
                        <span>
                          Ação Corretiva atribuída até{' '}
                          {ans.corrective_due_date
                            ? format(new Date(ans.corrective_due_date), 'dd/MM/yyyy')
                            : '-'}
                        </span>
                      </div>
                    )}
                    {evidenceUrls.length > 0 && (
                      <div className="mt-4">
                        <span className="text-sm font-semibold text-black block mb-2">
                          Evidências:
                        </span>
                        <div className="grid grid-cols-3 gap-3">
                          {evidenceUrls.map((url, i) => (
                            <div
                              key={i}
                              className="relative aspect-video rounded-md border border-slate-300 overflow-hidden print-break-inside-avoid"
                            >
                              {url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                <img
                                  src={url}
                                  alt="Evidência"
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-white">
                                  <FileImage className="h-6 w-6 text-slate-400 mb-1" />
                                  <span className="text-[10px] truncate w-full px-1 text-black">
                                    Documento Anexado
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 min-w-[120px]">
                    <div className="px-3 py-1 rounded-full text-sm font-medium border border-slate-300 bg-transparent text-black">
                      {label}
                    </div>
                    <div className="text-xs text-slate-600">Peso: {action.weight || 1}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Participants & Signatures */}
      {(execution.participants?.trim() ||
        (execution.signatures && execution.signatures.length > 0)) && (
        <div className="mt-12 pt-8 border-t border-black space-y-6 print-break-inside-avoid">
          <h2 className="text-xl font-bold text-black" style={{ color: primaryColor }}>
            Participantes e Assinaturas
          </h2>
          {execution.participants && (
            <p className="text-black mb-4">
              <strong>Participantes informados:</strong> {execution.participants}
            </p>
          )}

          {execution.signatures && execution.signatures.length > 0 && (
            <div className="grid grid-cols-3 gap-8 mt-6">
              {execution.signatures.map((sig: any, i: number) => {
                const url = typeof sig === 'string' ? sig : sig?.url || sig?.signature
                const name = sig?.name || `Assinatura ${i + 1}`
                return (
                  <div key={i} className="flex flex-col items-center text-center space-y-2">
                    <div className="h-24 w-full max-w-[200px] border-b border-dashed border-black flex items-end justify-center pb-2">
                      {url ? (
                        <img src={url} alt={`Assinatura`} className="max-h-20 object-contain" />
                      ) : (
                        <span className="text-slate-500 italic text-sm mb-2">
                          Assinatura não coletada
                        </span>
                      )}
                    </div>
                    <span className="font-medium text-black">{name}</span>
                    {sig?.role && <span className="text-xs text-slate-600">{sig.role}</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
