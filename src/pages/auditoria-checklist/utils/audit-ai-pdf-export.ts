import { AuditAiReportData } from '@/types/audit-ai'

interface GenerateAuditAiPdfParams {
  report: AuditAiReportData
  clientName?: string
  logoUrl?: string
  plantName?: string
}

const esc = (s: string | null | undefined): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export function generateAuditAiReportPdf({
  report,
  clientName = 'Sistema Aurea',
  logoUrl,
  plantName: customPlantName,
}: GenerateAuditAiPdfParams): void {
  const effectivePlantName = customPlantName || report.plantName || 'Todas as Plantas'

  const generatedAt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(report.generatedAt || Date.now()))

  // Ranking HTML
  const rankingHtml = report.ranking
    .map((item, idx) => {
      const sevClass =
        item.severity === 'P1' ? 'badge-p1' : item.severity === 'P2' ? 'badge-p2' : 'badge-p3'

      const trendIcon =
        item.trend === 'up' ? '↑ ALTA RECENTE' : item.trend === 'down' ? '↓ EM QUEDA' : '→ ESTÁVEL'

      const plantsFormatted = item.affectedPlants
        .map((p) => `${esc(p.plantName)} (${p.count})`)
        .join(', ')

      const sampleObs = item.evidences
        .map((e) => e.observations)
        .filter(Boolean)
        .slice(0, 2)
        .map(
          (obs) =>
            `<div class="obs-item">"${esc(obs)}" — <span class="obs-meta">${esc(obs ? 'Apontamento em campo' : '')}</span></div>`,
        )
        .join('')

      return `
        <div class="nc-card">
          <div class="nc-header">
            <div class="nc-pos">#${idx + 1}</div>
            <div class="nc-main-title">
              <span class="badge ${sevClass}">${item.severity}</span>
              <strong class="nc-title">${esc(item.title)}</strong>
            </div>
            <div class="nc-stat">
              <span class="rate">${item.occurrenceRate}%</span>
              <span class="count">(${item.occurrences} de ${report.totalExecutions} varreduras)</span>
            </div>
          </div>
          <div class="nc-body">
            <div class="nc-meta-grid">
              <div><strong>Categoria:</strong> ${esc(item.category)}</div>
              <div><strong>Tendência:</strong> ${esc(trendIcon)} (${esc(item.trendLabel)})</div>
              <div><strong>Plantas Afetadas:</strong> ${esc(plantsFormatted || 'Todas')}</div>
              <div><strong>Nota Média do Item:</strong> ${item.averageScore.toFixed(2)} / 5.0</div>
            </div>
            ${
              sampleObs
                ? `<div class="obs-box">
                    <div class="obs-title">Evidências / Observações dos Auditores:</div>
                    ${sampleObs}
                  </div>`
                : ''
            }
            <div class="suggested-action-box">
              <strong>Ação Preventiva/Corretiva Sugerida:</strong> ${esc(item.suggestedAction)}
            </div>
          </div>
        </div>
      `
    })
    .join('')

  // Insights HTML
  const insightsHtml = report.insights
    .map((ins) => {
      const borderClass =
        ins.severity === 'high'
          ? 'insight-danger'
          : ins.severity === 'medium'
            ? 'insight-warning'
            : 'insight-info'

      return `
        <div class="insight-card ${borderClass}">
          <div class="insight-header">
            <span class="insight-title">${esc(ins.title)}</span>
            <span class="insight-badge">${esc(ins.badgeText)}</span>
          </div>
          <div class="insight-desc">${esc(ins.description)}</div>
        </div>
      `
    })
    .join('')

  // Plano de Ação HTML
  const actionPlanHtml = report.actionPlan
    .map((act, idx) => {
      const pClass =
        act.priority === 'P1' ? 'badge-p1' : act.priority === 'P2' ? 'badge-p2' : 'badge-p3'

      return `
        <tr class="action-row ${act.completed ? 'completed' : ''}">
          <td style="text-align: center; width: 40px;">
            <span class="badge ${pClass}">${act.priority}</span>
          </td>
          <td style="width: 28%;">
            <strong>${esc(act.actionTitle)}</strong>
            <div class="sub-item-text">${esc(act.category)}</div>
          </td>
          <td>
            ${esc(act.suggestedAction)}
            ${act.notes ? `<div class="action-notes">${esc(act.notes)}</div>` : ''}
          </td>
          <td style="width: 14%;">${esc(act.targetPlant)}</td>
          <td style="width: 14%;">${esc(act.recommendedRole)}</td>
          <td style="width: 80px; text-align: center;">
            <strong>${act.suggestedDeadlineDays} dias</strong>
          </td>
          <td style="width: 90px; text-align: center;">
            <span class="status-pill ${act.completed ? 'pill-done' : 'pill-pending'}">
              ${act.completed ? 'Concluída' : 'Pendente'}
            </span>
          </td>
        </tr>
      `
    })
    .join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Laudo Técnico e Plano de Ação - Agente IA Aurea</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #0f172a;
    background: #ffffff;
    padding: 30px 40px;
    font-size: 11px;
    line-height: 1.45;
  }
  @page {
    size: A4;
    margin: 12mm 15mm;
  }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
    .nc-card { break-inside: avoid; page-break-inside: avoid; }
    .kpi-row { break-inside: avoid; page-break-inside: avoid; }
    .header-box { break-inside: avoid; page-break-inside: avoid; }
    .insight-card { break-inside: avoid; page-break-inside: avoid; }
    table { break-inside: auto; }
    tr { break-inside: avoid; page-break-inside: avoid; }
  }

  .header-box {
    border-bottom: 2px solid #0284c7;
    padding-bottom: 14px;
    margin-bottom: 18px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .header-left h1 {
    font-size: 18px;
    color: #0369a1;
    font-weight: 800;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .header-left .subtitle {
    font-size: 13px;
    color: #334155;
    font-weight: 700;
  }
  .header-left .meta-desc {
    font-size: 11px;
    color: #64748b;
    margin-top: 3px;
  }
  .header-right {
    text-align: right;
    font-size: 11px;
    color: #64748b;
  }
  .badge-ai {
    display: inline-block;
    background: #e0f2fe;
    color: #0369a1;
    border: 1px solid #7dd3fc;
    padding: 3px 8px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 10px;
    margin-bottom: 4px;
  }

  .filters-summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 18px;
  }
  .filter-item { font-size: 11px; }
  .filter-label {
    color: #64748b;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.5px;
    display: block;
    margin-bottom: 2px;
  }
  .filter-val { color: #0f172a; font-weight: 700; }

  .kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  .kpi-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
    text-align: center;
  }
  .kpi-card.score-box {
    border-color: #38bdf8;
    background: #f0f9ff;
  }
  .kpi-title {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
    margin-bottom: 4px;
  }
  .kpi-value {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
  }
  .kpi-card.score-box .kpi-value {
    color: #0284c7;
  }
  .kpi-sub {
    font-size: 9.5px;
    color: #64748b;
    margin-top: 2px;
  }

  .section-title {
    font-size: 13px;
    font-weight: 800;
    color: #0369a1;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 20px 0 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 5px;
  }
  .section-count {
    font-size: 10px;
    color: #64748b;
    font-weight: 600;
    text-transform: none;
  }

  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .badge-p1 { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
  .badge-p2 { background: #ffedd5; color: #c2410c; border: 1px solid #fdba74; }
  .badge-p3 { background: #fef9c3; color: #a16207; border: 1px solid #fde047; }

  .nc-card {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #ffffff;
    margin-bottom: 10px;
    overflow: hidden;
  }
  .nc-header {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .nc-pos {
    background: #0f172a;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .nc-main-title {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
  }
  .nc-title {
    font-size: 11.5px;
    color: #0f172a;
  }
  .nc-stat {
    text-align: right;
  }
  .nc-stat .rate {
    font-size: 12px;
    font-weight: 800;
    color: #b91c1c;
    margin-right: 4px;
  }
  .nc-stat .count {
    font-size: 9.5px;
    color: #64748b;
  }
  .nc-body {
    padding: 10px 14px;
  }
  .nc-meta-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px 12px;
    font-size: 10px;
    color: #334155;
    margin-bottom: 8px;
  }
  .obs-box {
    background: #f8fafc;
    border-left: 3px solid #cbd5e1;
    padding: 6px 10px;
    border-radius: 0 4px 4px 0;
    margin-bottom: 8px;
    font-size: 9.5px;
  }
  .obs-title {
    font-weight: 700;
    color: #475569;
    margin-bottom: 2px;
  }
  .obs-item {
    color: #1e293b;
    font-style: italic;
    margin-bottom: 2px;
  }
  .suggested-action-box {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    padding: 6px 10px;
    border-radius: 4px;
    color: #166534;
    font-size: 10.5px;
  }

  .insights-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 15px;
  }
  .insight-card {
    border-radius: 6px;
    padding: 10px 12px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
  }
  .insight-danger { border-left: 4px solid #ef4444; background: #fff5f5; }
  .insight-warning { border-left: 4px solid #f97316; background: #fffaf0; }
  .insight-info { border-left: 4px solid #0ea5e9; background: #f0f9ff; }
  .insight-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .insight-title {
    font-weight: 700;
    font-size: 11px;
    color: #0f172a;
  }
  .insight-badge {
    font-size: 8.5px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 3px;
    background: rgba(0,0,0,0.06);
  }
  .insight-desc {
    font-size: 10px;
    color: #475569;
    line-height: 1.35;
  }

  table.action-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    font-size: 10px;
  }
  table.action-table th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.5px;
    padding: 8px;
    border: 1px solid #334155;
  }
  table.action-table td {
    padding: 8px;
    border: 1px solid #e2e8f0;
    vertical-align: middle;
  }
  tr.action-row:nth-child(even) { background: #f8fafc; }
  tr.action-row.completed {
    background: #f0fdf4;
    opacity: 0.7;
  }
  .sub-item-text {
    font-size: 9px;
    color: #64748b;
    margin-top: 2px;
  }
  .action-notes {
    font-size: 9px;
    color: #64748b;
    font-style: italic;
    margin-top: 3px;
  }
  .status-pill {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 999px;
    font-size: 8.5px;
    font-weight: 700;
  }
  .pill-done { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
  .pill-pending { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

  .footer {
    margin-top: 25px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 9px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
  <div class="header-box">
    <div class="header-left">
      <h1>Laudo Técnico de Auditorias — Agente de Inteligência Operacional</h1>
      <div class="subtitle">Tipo de Auditoria: ${esc(report.auditType)}${report.plantName ? ` • Planta: ${esc(report.plantName)}` : ''}</div>
      <div class="meta-desc">Diagnóstico determinístico de recorrência, riscos e plano de ação estruturado</div>
    </div>
    <div class="header-right">
      <div><span class="badge-ai">🤖 Agente de IA Aurea</span></div>
      <div>Cliente: <strong>${esc(clientName)}</strong></div>
      <div>Emissão: ${esc(generatedAt)}</div>
    </div>
  </div>

  <div class="filters-summary">
    <div class="filter-item">
      <span class="filter-label">Recorte de Auditoria</span>
      <span class="filter-val">${esc(report.auditType)}</span>
    </div>
    <div class="filter-item">
      <span class="filter-label">Planta / Unidade</span>
      <span class="filter-val">${esc(effectivePlantName)}</span>
    </div>
    <div class="filter-item">
      <span class="filter-label">Período Varrido</span>
      <span class="filter-val">${esc(report.periodLabel)}</span>
    </div>
    <div class="filter-item">
      <span class="filter-label">Status da Análise</span>
      <span class="filter-val">Concluído (100% Determinístico)</span>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-title">Execuções Analisadas</div>
      <div class="kpi-value">${report.totalExecutions}</div>
      <div class="kpi-sub">auditorias concluídas</div>
    </div>
    <div class="kpi-card score-box">
      <div class="kpi-title">Score de Conformidade</div>
      <div class="kpi-value">${report.overallConformityScore}%</div>
      <div class="kpi-sub">${
        report.scoreDelta !== undefined && report.scoreDelta !== null
          ? `${report.scoreDelta >= 0 ? '+' : ''}${report.scoreDelta}% vs período ant.`
          : 'Índice de aderência'
      }</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Não Conformidades</div>
      <div class="kpi-value">${report.totalNonConformities}</div>
      <div class="kpi-sub">apontamentos totais</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Itens Ofensores (NCs)</div>
      <div class="kpi-value">${report.ranking.length}</div>
      <div class="kpi-sub">perguntas com reprovação</div>
    </div>
  </div>

  <div class="section-title">
    <span>Padrões e Insights Identificados</span>
    <span class="section-count">${report.insights.length} achados automáticos</span>
  </div>
  <div class="insights-grid">
    ${insightsHtml || '<div style="color:#64748b;font-style:italic;">Nenhum padrão crítico detectado.</div>'}
  </div>

  <div class="section-title">
    <span>Ranking Priorizado de Não Conformidades</span>
    <span class="section-count">${report.ranking.length} itens ofensores ordenados por severidade e frequência</span>
  </div>
  <div>
    ${rankingHtml || '<div style="text-align:center;padding:20px;color:#64748b;">Nenhuma não conformidade detectada para este tipo de auditoria.</div>'}
  </div>

  <div class="section-title" style="page-break-before: auto;">
    <span>Plano de Ação Corretiva Priorizado (P1 / P2 / P3)</span>
    <span class="section-count">${report.actionPlan.length} ações imediatas para cobrança do time</span>
  </div>
  <table class="action-table">
    <thead>
      <tr>
        <th>Prior.</th>
        <th>Item / Categoria</th>
        <th>Ação Corretiva Sugerida</th>
        <th>Planta Alvo</th>
        <th>Responsável</th>
        <th>Prazo</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${actionPlanHtml || '<tr><td colspan="7" style="text-align:center;padding:12px;color:#64748b;">Nenhuma ação corretiva pendente.</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <span>Aurea Facility Management — Sistema de Inteligência Operacional de Auditorias</span>
    <span>Laudo Técnico emitido em ${esc(generatedAt)} — Sistema Aurea</span>
  </div>
</body>
</html>`

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error(
      'Não foi possível abrir a janela de impressão. Por favor, desative o bloqueador de pop-ups.',
    )
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 400)
}
