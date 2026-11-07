import type { SolicitacaoHe } from '../components/HorasExtrasTable'

interface ExportHeFilterMeta {
  plantName: string
  periodLabel: string
  companyName?: string
  statusLabel?: string
  clientName?: string
}

const esc = (s: string | null | undefined): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const formatIsoDate = (dStr: string | null | undefined): string => {
  if (!dStr) return '—'
  const parts = dStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dStr
}

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return '—'
  }
}

/**
 * Exporta a lista de HE filtrada em formato PDF via janela de impressão estilizada.
 */
export function exportHorasExtrasToPdf(
  solicitacoes: SolicitacaoHe[],
  meta: ExportHeFilterMeta,
): void {
  const generatedAt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date())

  const totalHoras = solicitacoes.reduce((acc, s) => acc + (Number(s.hours) || 0), 0)
  const totalAprovadas = solicitacoes.filter((s) => s.status === 'aprovada')
  const totalHorasAprovadas = totalAprovadas.reduce((acc, s) => acc + (Number(s.hours) || 0), 0)
  const totalPendentes = solicitacoes.filter((s) => s.status === 'pendente').length
  const totalRecusadas = solicitacoes.filter((s) => s.status === 'recusada').length

  const rowsHtml = solicitacoes
    .map((s, idx) => {
      const plantLabel = s.plants?.name || 'Não informada'
      const statusClass =
        s.status === 'aprovada'
          ? 'status-aprovada'
          : s.status === 'recusada'
            ? 'status-recusada'
            : 'status-pendente'
      const statusText =
        s.status === 'aprovada' ? 'Aprovada' : s.status === 'recusada' ? 'Recusada' : 'Pendente'

      const decisaoText =
        s.status === 'pendente'
          ? 'Aguardando decisão'
          : `${s.approved_by_name || 'Gestor'} em ${formatDateTime(s.approved_at)}`

      const ccLabel = s.budget_cost_centers?.name || 'Não informado'
      const ccCode = s.budget_cost_centers?.code

      const obs = s.manager_observation
        ? `<div class="obs-box">Obs: ${esc(s.manager_observation)}</div>`
        : ''
      const justificativa = s.reason ? `<div class="reason-box">Motivo: ${esc(s.reason)}</div>` : ''

      return `
        <tr>
          <td style="text-align: center; width: 36px;">${idx + 1}</td>
          <td>
            <strong>${esc(s.employee_name)}</strong>
            ${justificativa}
          </td>
          <td>${esc(s.company_name)}</td>
          <td>${esc(plantLabel)}</td>
          <td>${esc(ccLabel)}${ccCode ? ` (${esc(ccCode)})` : ''}</td>
          <td style="text-align: center; white-space: nowrap;">${formatIsoDate(s.date)}</td>
          <td style="text-align: right; font-weight: bold; white-space: nowrap;">
            ${Number(s.hours).toFixed(1)}h
          </td>
          <td style="text-align: center;">
            <span class="badge ${statusClass}">${statusText}</span>
          </td>
          <td style="font-size: 11px;">
            ${esc(decisaoText)}
            ${obs}
          </td>
        </tr>
      `
    })
    .join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Horas Extras - ${esc(meta.clientName || 'Aurea')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 28px 36px;
      font-size: 12px;
      line-height: 1.4;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 700;
      color: #0369a1;
      letter-spacing: -0.02em;
    }
    .brand-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .meta-box {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }
    .filters-bar {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 18px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 11px;
    }
    .filter-item strong {
      color: #0f172a;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #0284c7;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .kpi-card.pendente { border-left-color: #f59e0b; }
    .kpi-card.aprovada { border-left-color: #10b981; }
    .kpi-card.recusada { border-left-color: #ef4444; }
    .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
    .kpi-val { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 2px; }
    .kpi-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 11px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 600;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      font-size: 11px;
    }
    td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-pendente { background: #fef3c7; color: #92400e; }
    .status-aprovada { background: #d1fae5; color: #065f46; }
    .status-recusada { background: #fee2e2; color: #991b1b; }
    .obs-box {
      font-size: 10px;
      color: #64748b;
      margin-top: 3px;
      font-style: italic;
    }
    .reason-box {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
      margin-top: 20px;
    }
    @media print {
      body { padding: 10px; }
      @page { margin: 1.2cm; size: landscape; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">Aurea Facility Management</div>
      <div class="brand-sub">Relatório Operacional de Horas Extras de Terceiros</div>
    </div>
    <div class="meta-box">
      <div><strong>Cliente:</strong> ${esc(meta.clientName || 'Geral')}</div>
      <div><strong>Emissão:</strong> ${esc(generatedAt)}</div>
    </div>
  </div>

  <div class="filters-bar">
    <div class="filter-item"><strong>Planta / Unidade:</strong> ${esc(meta.plantName)}</div>
    <div class="filter-item"><strong>Período:</strong> ${esc(meta.periodLabel)}</div>
    ${meta.companyName ? `<div class="filter-item"><strong>Empresa:</strong> ${esc(meta.companyName)}</div>` : ''}
    ${meta.statusLabel ? `<div class="filter-item"><strong>Status:</strong> ${esc(meta.statusLabel)}</div>` : ''}
    <div class="filter-item"><strong>Registros:</strong> ${solicitacoes.length}</div>
  </div>

  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-label">Total de Solicitações</div>
      <div class="kpi-val">${solicitacoes.length}</div>
      <div class="kpi-sub">${totalHoras.toFixed(1)}h totais solicitadas</div>
    </div>
    <div class="kpi-card pendente">
      <div class="kpi-label">Pendentes</div>
      <div class="kpi-val">${totalPendentes}</div>
      <div class="kpi-sub">Aguardando decisão</div>
    </div>
    <div class="kpi-card aprovada">
      <div class="kpi-label">Aprovadas</div>
      <div class="kpi-val">${totalAprovadas.length}</div>
      <div class="kpi-sub">${totalHorasAprovadas.toFixed(1)}h autorizadas</div>
    </div>
    <div class="kpi-card recusada">
      <div class="kpi-label">Recusadas</div>
      <div class="kpi-val">${totalRecusadas}</div>
      <div class="kpi-sub">Não autorizadas</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 36px; text-align: center;">#</th>
        <th>Colaborador / Justificativa</th>
        <th>Empresa</th>
        <th>Planta</th>
        <th>Centro de Custo pagador</th>
        <th style="text-align: center;">Data HE</th>
        <th style="text-align: right;">Horas</th>
        <th style="text-align: center;">Status</th>
        <th>Decisão do Gestor</th>
      </tr>
    </thead>
    <tbody>
      ${
        rowsHtml ||
        '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #64748b;">Nenhuma solicitação encontrada para os filtros selecionados.</td></tr>'
      }
    </tbody>
  </table>

  <div class="footer">
    <span>Aurea Facility Management — Módulo de Gestão de Terceiros / Horas Extras</span>
    <span>Documento gerado automaticamente pelo Sistema Aurea em ${esc(generatedAt)}</span>
  </div>
</body>
</html>`

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error(
      'Não foi possível abrir a janela para impressão do PDF. Por favor, desative o bloqueador de pop-ups do seu navegador.',
    )
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 400)
}

/**
 * Gera e dispara o download de arquivo XML estruturado com a lista de solicitações de HE.
 */
export function exportHorasExtrasToXml(
  solicitacoes: SolicitacaoHe[],
  meta: ExportHeFilterMeta,
): void {
  const generatedAt = new Date().toISOString()
  const totalHoras = solicitacoes.reduce((acc, s) => acc + (Number(s.hours) || 0), 0)

  const itemsXml = solicitacoes
    .map((s, idx) => {
      return `    <solicitacao id="${esc(s.id)}" indice="${idx + 1}">
      <colaborador>
        <id>${esc(s.employee_id)}</id>
        <nome>${esc(s.employee_name)}</nome>
      </colaborador>
      <empresa>
        <id>${esc(s.company_id || '')}</id>
        <nome>${esc(s.company_name)}</nome>
      </empresa>
      <planta>
        <id>${esc(s.plant_id)}</id>
        <nome>${esc(s.plants?.name || '')}</nome>
        <codigo>${esc(s.plants?.code || '')}</codigo>
      </planta>
      <centro_custo_pagador>
        <id>${esc(s.cost_center_id || '')}</id>
        <nome>${esc(s.budget_cost_centers?.name || '')}</nome>
        <codigo>${esc(s.budget_cost_centers?.code || '')}</codigo>
      </centro_custo_pagador>
      <detalhes>
        <data_hora_extra>${esc(s.date)}</data_hora_extra>
        <horas>${Number(s.hours).toFixed(2)}</horas>
        <motivo>${esc(s.reason || '')}</motivo>
        <status>${esc(s.status)}</status>
      </detalhes>
      <solicitante>
        <id>${esc(s.created_by || '')}</id>
        <nome>${esc(s.created_by_name || '')}</nome>
        <data_solicitacao>${esc(s.created_at || '')}</data_solicitacao>
      </solicitante>
      <decisao_gestor>
        <aprovador_id>${esc(s.approved_by || '')}</aprovador_id>
        <aprovador_nome>${esc(s.approved_by_name || '')}</aprovador_nome>
        <data_decisao>${esc(s.approved_at || '')}</data_decisao>
        <observacao>${esc(s.manager_observation || '')}</observacao>
      </decisao_gestor>
    </solicitacao>`
    })
    .join('\n')

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<relatorio_horas_extras xmlns="https://aurea.app/schemas/horas_extras/v1">
  <cabecalho>
    <sistema>Aurea Facility Management</sistema>
    <modulo>Gestão de Terceiros - Horas Extras</modulo>
    <data_geracao>${esc(generatedAt)}</data_geracao>
    <cliente>${esc(meta.clientName || 'Todos')}</cliente>
    <filtros_aplicados>
      <planta>${esc(meta.plantName)}</planta>
      <periodo>${esc(meta.periodLabel)}</periodo>
      <empresa>${esc(meta.companyName || 'Todas')}</empresa>
      <status>${esc(meta.statusLabel || 'Todos')}</status>
    </filtros_aplicados>
    <totais>
      <total_registros>${solicitacoes.length}</total_registros>
      <total_horas>${totalHoras.toFixed(2)}</total_horas>
    </totais>
  </cabecalho>
  <solicitacoes>
${itemsXml}
  </solicitacoes>
</relatorio_horas_extras>`

  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  const safeDate = new Date().toISOString().slice(0, 10)
  link.download = `horas_extras_${safeDate}.xml`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
