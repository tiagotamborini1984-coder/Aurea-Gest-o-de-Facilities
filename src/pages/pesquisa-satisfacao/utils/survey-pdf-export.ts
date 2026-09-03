import {
  DetailedSurveyResponse,
  SatisfactionSurvey,
  SurveyResponseAnswer,
} from '@/types/satisfaction-surveys'
import { QuestionHierarchyNode, formatAnswerValue } from './survey-report-export'

interface GenerateSurveyPdfParams {
  survey: SatisfactionSurvey
  plantName: string
  periodLabel: string
  stats: {
    total: number
    avgScore: number | null
    satisfactionRate: number | null
  }
  hierarchy: QuestionHierarchyNode[]
  responses: DetailedSurveyResponse[]
  clientName?: string
}

const esc = (s: string | null | undefined): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export function generateSurveyReportPdf({
  survey,
  plantName,
  periodLabel,
  stats,
  hierarchy,
  responses,
  clientName,
}: GenerateSurveyPdfParams): void {
  const generatedAt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date())

  const responsesHtml = responses
    .map((resp, idx) => {
      const dateObj = new Date(resp.submitted_at)
      const dateFormatted = isNaN(dateObj.getTime()) ? '—' : dateObj.toLocaleDateString('pt-BR')
      const timeFormatted = isNaN(dateObj.getTime())
        ? '—'
        : dateObj.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
      const rPlantName =
        resp.plant?.name || resp.survey?.plants?.name || plantName || 'Todas as Plantas'
      const rLocation = resp.location_name || resp.survey?.location_name || 'Geral'

      const answerMap = new Map<string, SurveyResponseAnswer>()
      for (const a of resp.answers || []) {
        answerMap.set(a.question_id, a)
      }

      const answersListHtml = hierarchy
        .map((node) => {
          const ans = answerMap.get(node.question.id || '')
          if (!ans) return ''
          const formatted = formatAnswerValue(ans, node.question.question_type)
          const isSub = node.level > 0
          const indentPx = node.level * 16

          return `
            <div class="answer-item ${isSub ? 'sub-item' : ''}" style="margin-left:${indentPx}px">
              <span class="q-title">${isSub ? '↳ ' : ''}${esc(node.question.title)}:</span>
              <span class="q-val">${esc(formatted.display)}</span>
              ${
                node.parentQuestion
                  ? `<span class="q-parent">(origem: ${esc(node.parentQuestion.title)})</span>`
                  : ''
              }
            </div>
          `
        })
        .filter(Boolean)
        .join('')

      return `
        <div class="response-card">
          <div class="response-header">
            <div class="response-num">#${idx + 1}</div>
            <div class="response-meta">
              <strong>${esc(dateFormatted)} ${esc(timeFormatted)}</strong>
              <span class="separator">•</span>
              <span>${esc(rPlantName)}</span>
              <span class="separator">•</span>
              <span>Local: ${esc(rLocation)}</span>
            </div>
          </div>
          <div class="response-body">
            ${answersListHtml || '<div class="no-answers">Nenhuma resposta registrada para as perguntas configuradas.</div>'}
          </div>
        </div>
      `
    })
    .join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Respostas - ${esc(survey.title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    padding: 30px 40px;
    font-size: 12px;
    line-height: 1.45;
  }
  @page {
    size: A4;
    margin: 12mm 15mm;
  }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
    .response-card { break-inside: avoid; page-break-inside: avoid; }
    .kpi-row { break-inside: avoid; page-break-inside: avoid; }
    .header-box { break-inside: avoid; page-break-inside: avoid; }
  }

  .header-box {
    border-bottom: 2px solid #2563eb;
    padding-bottom: 16px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .header-left h1 {
    font-size: 20px;
    color: #1e3a8a;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .header-left .subtitle {
    font-size: 13px;
    color: #475569;
    font-weight: 600;
  }
  .header-left .meta-desc {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }
  .header-right {
    text-align: right;
    font-size: 11px;
    color: #64748b;
  }
  .header-right .badge-type {
    display: inline-block;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
    padding: 2px 8px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 11px;
    margin-bottom: 4px;
  }

  .filters-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 18px;
  }
  .filter-item {
    font-size: 11px;
  }
  .filter-label {
    color: #64748b;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.5px;
    display: block;
    margin-bottom: 2px;
  }
  .filter-val {
    color: #1e293b;
    font-weight: 600;
  }

  .kpi-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 22px;
  }
  .kpi-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
    text-align: center;
  }
  .kpi-card.highlight {
    border-color: #86efac;
    background: #f0fdf4;
  }
  .kpi-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
    margin-bottom: 4px;
  }
  .kpi-card.highlight .kpi-title {
    color: #15803d;
  }
  .kpi-value {
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
  }
  .kpi-card.highlight .kpi-value {
    color: #16a34a;
  }
  .kpi-sub {
    font-size: 10px;
    color: #64748b;
    margin-top: 2px;
  }

  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: #1e3a8a;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 6px;
  }
  .section-count {
    font-size: 11px;
    color: #64748b;
    font-weight: 500;
    text-transform: none;
  }

  .responses-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .response-card {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #ffffff;
    overflow: hidden;
  }
  .response-header {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
  }
  .response-num {
    background: #1e3a8a;
    color: #ffffff;
    font-weight: 700;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .response-meta {
    color: #475569;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .separator {
    color: #cbd5e1;
  }
  .response-body {
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .answer-item {
    font-size: 11px;
    line-height: 1.4;
  }
  .answer-item.sub-item {
    padding-left: 8px;
    border-left: 2px solid #bfdbfe;
    background: #f8fafc;
    padding: 4px 8px;
    border-radius: 0 4px 4px 0;
  }
  .q-title {
    font-weight: 600;
    color: #334155;
    margin-right: 4px;
  }
  .q-val {
    font-weight: 700;
    color: #0f172a;
  }
  .q-parent {
    font-size: 9px;
    color: #2563eb;
    margin-left: 6px;
    font-style: italic;
  }
  .no-answers {
    color: #94a3b8;
    font-style: italic;
    font-size: 11px;
  }

  .footer {
    margin-top: 24px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 10px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
  <div class="header-box">
    <div class="header-left">
      <h1>Relatório de Respostas da Pesquisa</h1>
      <div class="subtitle">${esc(survey.title)}</div>
      ${survey.description ? `<div class="meta-desc">${esc(survey.description)}</div>` : ''}
    </div>
    <div class="header-right">
      <div><span class="badge-type">${esc(survey.survey_type || 'Geral')}</span></div>
      <div>${clientName ? `Cliente: <strong>${esc(clientName)}</strong>` : 'Sistema Aurea'}</div>
      <div>Emissão: ${esc(generatedAt)}</div>
    </div>
  </div>

  <div class="filters-summary">
    <div class="filter-item">
      <span class="filter-label">Planta / Unidade</span>
      <span class="filter-val">${esc(plantName || 'Todas as Plantas')}</span>
    </div>
    <div class="filter-item">
      <span class="filter-label">Tipo de Pesquisa</span>
      <span class="filter-val">${esc(survey.survey_type || 'Geral')}</span>
    </div>
    <div class="filter-item">
      <span class="filter-label">Período Filtrado</span>
      <span class="filter-val">${esc(periodLabel || 'Todo o histórico')}</span>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-title">Total de Respostas</div>
      <div class="kpi-value">${stats.total}</div>
      <div class="kpi-sub">submissões registradas</div>
    </div>
    <div class="kpi-card highlight">
      <div class="kpi-title">Nível de Satisfação</div>
      <div class="kpi-value">${stats.satisfactionRate !== null ? `${stats.satisfactionRate}%` : '—'}</div>
      <div class="kpi-sub">Satisfeito + Muito Satisfeito</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Nota Média Geral</div>
      <div class="kpi-value">${stats.avgScore !== null ? stats.avgScore.toFixed(1) : '—'}</div>
      <div class="kpi-sub">escala 0 a 10 normalizada</div>
    </div>
  </div>

  <div class="section-title">
    <span>Detalhamento de Respostas (${stats.total})</span>
    <span class="section-count">${hierarchy.length} perguntas e subperguntas mapeadas</span>
  </div>

  <div class="responses-list">
    ${responsesHtml || '<div class="no-answers" style="text-align:center;padding:24px;">Nenhuma resposta registrada para esta pesquisa no período selecionado.</div>'}
  </div>

  <div class="footer">
    <span>Aurea Facility Management — Módulo de Pesquisa de Satisfação</span>
    <span>Documento gerado em ${esc(generatedAt)}</span>
  </div>
</body>
</html>`

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error(
      'Não foi possível abrir a janela de impressão. Por favor, verifique se o bloqueador de pop-ups está desativado.',
    )
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 400)
}
