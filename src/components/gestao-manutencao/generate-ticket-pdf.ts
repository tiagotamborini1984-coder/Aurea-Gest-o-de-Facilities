interface LogEntry {
  action_type: string
  old_value: string | null
  new_value: string | null
  created_at: string
  user?: { name: string | null } | null
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const esc = (s: string | null | undefined): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

export async function generateTicketPdf(ticket: any, logs: LogEntry[]): Promise<void> {
  const plantName = ticket.plant?.name || '—'
  const areaName = ticket.area?.name || '—'
  const assetName = ticket.asset?.name || '—'
  const priorityName = ticket.priority?.name || '—'
  const typeName = ticket.type?.name || '—'
  const statusName = ticket.status?.name || '—'
  const assigneeName = ticket.assignee?.name || '—'
  const closurePhotos: string[] = Array.isArray(ticket.closure_photos) ? ticket.closure_photos : []
  const reportDate = formatDate(new Date().toISOString())

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatorio Tecnico - OS ${esc(ticket.ticket_number)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;padding:40px;font-size:13px}
h1{font-size:24px;color:#1e3a8a;margin-bottom:4px}
h2{font-size:15px;color:#1e3a8a;margin-top:28px;margin-bottom:10px;border-bottom:2px solid #e2e8f0;padding-bottom:4px}
.header{text-align:center;margin-bottom:30px}
.header h1{font-size:28px}
.subtitle{color:#64748b;font-size:13px;margin-top:4px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px}
.info-item{display:flex;gap:8px}
.info-label{font-weight:bold;min-width:150px;color:#475569}
.info-value{flex:1}
.description{line-height:1.6;background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;white-space:pre-wrap}
table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #e2e8f0;padding:6px 10px;font-size:12px;text-align:left}
th{background:#f1f5f9;font-weight:bold;color:#475569}
tr:nth-child(even){background:#f8fafc}
.photos{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
.photo{width:150px}
.photo img{width:100%;height:100px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0}
.photo a{font-size:10px;color:#2563eb;word-break:break-all}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8}
@media print{body{padding:20px}}
</style>
</head>
<body>
<div class="header">
<h1>Relatorio Tecnico de Ordem de Servico</h1>
<div class="subtitle">${esc(ticket.ticket_number)} - Gerado em ${reportDate}</div>
</div>

<h2>Cabecalho</h2>
<div class="info-grid">
<div class="info-item"><span class="info-label">N do Chamado:</span><span class="info-value">${esc(ticket.ticket_number)}</span></div>
<div class="info-item"><span class="info-label">Planta:</span><span class="info-value">${esc(plantName)}</span></div>
<div class="info-item"><span class="info-label">Solicitante:</span><span class="info-value">${esc(ticket.requester_name) || '—'}</span></div>
<div class="info-item"><span class="info-label">E-mail:</span><span class="info-value">${esc(ticket.requester_email) || '—'}</span></div>
<div class="info-item"><span class="info-label">Data de Abertura:</span><span class="info-value">${formatDate(ticket.reported_at || ticket.created_at)}</span></div>
<div class="info-item"><span class="info-label">Origem:</span><span class="info-value">${esc(ticket.origin) || 'Manual'}</span></div>
</div>

<h2>Dados de Abertura</h2>
<div class="info-grid">
<div class="info-item"><span class="info-label">Area:</span><span class="info-value">${esc(areaName)}</span></div>
<div class="info-item"><span class="info-label">Ativo/Equipamento:</span><span class="info-value">${esc(assetName)}</span></div>
<div class="info-item"><span class="info-label">Prioridade:</span><span class="info-value">${esc(priorityName)}</span></div>
<div class="info-item"><span class="info-label">Tipo:</span><span class="info-value">${esc(typeName)}</span></div>
<div class="info-item"><span class="info-label">Status:</span><span class="info-value">${esc(statusName)}</span></div>
</div>
<div style="margin-top:10px">
<div class="info-label" style="margin-bottom:4px">Descricao:</div>
<div class="description">${esc(ticket.description) || '—'}</div>
</div>

<h2>Dados de Planejamento</h2>
<div class="info-grid">
<div class="info-item"><span class="info-label">Inicio Planejado:</span><span class="info-value">${formatDate(ticket.planned_start)}</span></div>
<div class="info-item"><span class="info-label">Fim Planejado:</span><span class="info-value">${formatDate(ticket.planned_end)}</span></div>
<div class="info-item"><span class="info-label">Executor:</span><span class="info-value">${esc(assigneeName)}</span></div>
</div>

<h2>Dados de Atendimento</h2>
<div class="info-grid">
<div class="info-item"><span class="info-label">Inicio Realizado:</span><span class="info-value">${formatDate(ticket.actual_start)}</span></div>
<div class="info-item"><span class="info-label">Fim Realizado:</span><span class="info-value">${formatDate(ticket.actual_end)}</span></div>
<div class="info-item"><span class="info-label">Executor:</span><span class="info-value">${esc(assigneeName)}</span></div>
</div>
<div style="margin-top:10px">
<div class="info-label" style="margin-bottom:4px">O que foi realizado:</div>
<div class="description">${esc(ticket.closure_notes) || '—'}</div>
</div>
${closurePhotos.length > 0 ? `<div style="margin-top:12px"><div class="info-label" style="margin-bottom:6px">Fotos de Fechamento:</div><div class="photos">${closurePhotos.map((url: string) => `<div class="photo"><img src="${esc(url)}" alt="Foto"/><a href="${esc(url)}" target="_blank">Abrir imagem</a></div>`).join('')}</div></div>` : ''}

<h2>Historico de Status e Acoes</h2>
<table>
<thead><tr><th>Data/Hora</th><th>Acao</th><th>De</th><th>Para</th><th>Usuario</th></tr></thead>
<tbody>
${logs.map((log) => `<tr><td>${formatDate(log.created_at)}</td><td>${esc(log.action_type)}</td><td>${esc(log.old_value) || '—'}</td><td>${esc(log.new_value) || '—'}</td><td>${esc(log.user?.name) || 'Sistema'}</td></tr>`).join('')}
</tbody>
</table>

<div class="footer">Relatorio gerado pelo sistema Aurea Facility Management</div>
</body>
</html>`

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error(
      'Nao foi possivel abrir a janela de impressao. Verifique se o bloqueador de pop-ups esta desativado.',
    )
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 500)
}
