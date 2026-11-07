import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient, jsonBody, errorBody } from '../_shared/supabase.ts'

/**
 * he-approval-email
 * -----------------
 * Dispara e-mails de notificação do módulo de Horas Extras:
 *
 * 1) APROVAÇÃO (action = 'aprovada' | padrão):
 *    - Destinatários principais: TODOS os e-mails cadastrados na empresa parceira (companies.emails/companies.email ou company_email).
 *    - Cópias (CC): solicitante (created_by) e aprovador (approved_by).
 *    - Registra email_sent_at e email_error no banco.
 *
 * 2) REPROVAÇÃO (action = 'recusada'):
 *    - Destinatários: SOMENTE o usuário que reprovou (approved_by / caller) e o requisitante (created_by).
 *    - A empresa parceira NÃO recebe nada.
 *    - Registra email_error em caso de falha.
 *
 * 3) CRIAÇÃO DE HE (action = 'criada'):
 *    - Destinatários: APROVADOR configurado nas Configurações de HE da planta/cliente.
 *      Configurações suportadas:
 *        a) Modo 'all': todas as plantas com o mesmo aprovador (gestor ou administrador).
 *        b) Modo 'per_plant': cada planta com um aprovador específico.
 *      Fallback: administradores elegíveis da planta/cliente caso não haja aprovador configurado.
 *    - Inclui link direto clicável para o módulo HE (https://www.aureafacilities.com/gestao-terceiros/horas-extras)
 *      logo abaixo da mensagem.
 *
 * Texto do e-mail: a expressão "Gestor Administrador" foi substituída pelo nome da empresa/cliente.
 * Rótulo de horas em TODOS os templates: "Quantidade de Horas previstas".
 * Envio NUNCA é bloqueante — falha não impede criação, aprovação ou recusa.
 *
 * POST { solicitacao_id: string, action?: 'aprovada' | 'recusada' | 'criada' }
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_APP_URL = 'https://www.aureafacilities.com'
const HE_MODULE_PATH = '/gestao-terceiros/horas-extras'

interface SolicitacaoRow {
  id: string
  client_id: string
  employee_name: string
  company_id: string | null
  company_name: string | null
  company_email: string | null
  created_by: string | null
  created_by_name: string | null
  approved_by: string | null
  approved_by_name: string | null
  approved_at: string | null
  manager_observation: string | null
  reason: string | null
  plant_id: string | null
  date: string
  hours: number
  cost_center_text: string | null
  cost_center_id: string | null
  status: string
  plants: { name: string | null; code: string | null } | null
  budget_cost_centers: { name: string | null; code: string | null } | null
  clients: { name: string | null } | null
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(`${dateStr}T12:00:00`))
  } catch {
    return dateStr
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getAppUrl(): string {
  const envUrl =
    Deno.env.get('APP_URL') || Deno.env.get('PUBLIC_APP_URL') || Deno.env.get('SITE_URL')
  const base = envUrl ? envUrl.replace(/\/+$/, '') : DEFAULT_APP_URL
  return `${base}${HE_MODULE_PATH}`
}

function resolveClientName(row: SolicitacaoRow): string {
  return row.clients?.name?.trim() || 'Aurea Facilities'
}

/* =========================================================================
   TEMPLATE 1: APROVAÇÃO (Envia para Empresa + CC Solicitante/Aprovador)
   ========================================================================= */
function buildApprovalEmail(
  row: SolicitacaoRow,
  cc: string[],
): { subject: string; html: string; text: string } {
  const clientName = resolveClientName(row)
  const plantName = row.plants?.name || '—'
  const costCenter =
    row.cost_center_text || row.budget_cost_centers?.name || row.budget_cost_centers?.code || '—'
  const approvedBy = row.approved_by_name || clientName
  const approvedAt = formatDateTime(row.approved_at || new Date().toISOString())
  const hours = Number(row.hours).toFixed(2).replace('.', ',')
  const date = formatDate(row.date)
  const companyName = row.company_name || 'Empresa parceira'
  const ccNote =
    cc.length > 0
      ? `Cópia deste e-mail enviada para: ${cc.join(', ')}.`
      : 'Sem cópias para usuários do sistema (solicitante/aprovador sem e-mail válido).'

  const subject = `Solicitação de Horas Extras aprovada — ${row.employee_name}`

  const rowsHtml: Array<[string, string]> = [
    ['Colaborador', row.employee_name],
    ['Empresa (prestadora)', companyName],
    ['Cliente', clientName],
    ['Planta', plantName],
    ['Data da HE', date],
    ['Quantidade de Horas previstas', `${hours} h`],
    ['Centro de Custo pagador', costCenter],
    ['Aprovada por', approvedBy],
    ['Data/hora da aprovação', approvedAt],
  ]

  if (row.manager_observation) {
    rowsHtml.push(['Observação do gestor', row.manager_observation])
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#166534;padding:20px 24px;">
              <h1 style="margin:0;font-size:18px;color:#ffffff;">Solicitação de Horas Extras aprovada</h1>
              <p style="margin:4px 0 0;font-size:13px;color:#dcfce7;">${escapeHtml(clientName)} — Gestão de Terceiros</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
                Olá, <strong>${escapeHtml(companyName)}</strong>. A solicitação de horas extras abaixo foi
                <strong style="color:#166534;">APROVADA</strong> por <strong>${escapeHtml(clientName)}</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                ${rowsHtml
                  .map(
                    ([label, value]) => `
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;color:#475569;width:45%;">${label}</td>
                  <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">${escapeHtml(value)}</td>
                </tr>`,
                  )
                  .join('')}
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:#64748b;">
                ${escapeHtml(ccNote)}
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#64748b;">
                Este é um e-mail automático enviado por ${escapeHtml(clientName)}. Em caso de divergência, entre em
                contato com o gestor responsável da unidade.
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

  const text = [
    'SOLICITAÇÃO DE HORAS EXTRAS APROVADA',
    '',
    ...rowsHtml.map(([label, value]) => `${label}: ${value}`),
    '',
    ccNote,
    `— Enviado automaticamente pelo sistema (${clientName}).`,
  ].join('\n')

  return { subject, html, text }
}

/* =========================================================================
   TEMPLATE 2: REPROVAÇÃO (Envia SOMENTE para Solicitante e Quem Reprovou)
   A EMPRESA PARCEIRA NUNCA RECEBE ESTE E-MAIL.
   ========================================================================= */
function buildRejectionEmail(row: SolicitacaoRow): { subject: string; html: string; text: string } {
  const clientName = resolveClientName(row)
  const plantName = row.plants?.name || '—'
  const costCenter =
    row.cost_center_text || row.budget_cost_centers?.name || row.budget_cost_centers?.code || '—'
  const rejectedBy = row.approved_by_name || clientName
  const rejectedAt = formatDateTime(row.approved_at || new Date().toISOString())
  const hours = Number(row.hours).toFixed(2).replace('.', ',')
  const date = formatDate(row.date)
  const companyName = row.company_name || 'Empresa parceira'
  const observation = row.manager_observation || 'Nenhuma justificativa detalhada foi informada.'

  const subject = `Solicitação de Horas Extras reprovada — ${row.employee_name}`

  const rowsHtml: Array<[string, string]> = [
    ['Colaborador', row.employee_name],
    ['Empresa (prestadora)', companyName],
    ['Cliente', clientName],
    ['Planta', plantName],
    ['Data da HE', date],
    ['Quantidade de Horas previstas', `${hours} h`],
    ['Centro de Custo pagador', costCenter],
    ['Reprovada por', rejectedBy],
    ['Data/hora da reprovação', rejectedAt],
    ['Motivo da reprovação', observation],
  ]

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#b91c1c;padding:20px 24px;">
              <h1 style="margin:0;font-size:18px;color:#ffffff;">Solicitação de Horas Extras reprovada</h1>
              <p style="margin:4px 0 0;font-size:13px;color:#fee2e2;">${escapeHtml(clientName)} — Gestão de Terceiros</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
                A solicitação de horas extras do colaborador <strong>${escapeHtml(row.employee_name)}</strong> foi
                <strong style="color:#b91c1c;">REPROVADA</strong> por <strong>${escapeHtml(clientName)}</strong>.
              </p>
              <div style="background:#fef2f2;border-left:4px solid #b91c1c;padding:12px 16px;margin:0 0 16px;border-radius:4px;">
                <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">Motivo informado pelo gestor:</p>
                <p style="margin:4px 0 0;font-size:13px;color:#7f1d1d;">${escapeHtml(observation)}</p>
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                ${rowsHtml
                  .map(
                    ([label, value]) => `
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;color:#475569;width:45%;">${label}</td>
                  <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">${escapeHtml(value)}</td>
                </tr>`,
                  )
                  .join('')}
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:#64748b;">
                Aviso: Este e-mail é destinado exclusivamente ao requisitante e ao gestor responsável. A empresa parceira não foi notificada.
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#64748b;">
                Este é um e-mail automático do sistema (${escapeHtml(clientName)}).
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

  const text = [
    'SOLICITAÇÃO DE HORAS EXTRAS REPROVADA',
    '',
    ...rowsHtml.map(([label, value]) => `${label}: ${value}`),
    '',
    'Aviso: Este e-mail é destinado exclusivamente ao requisitante e ao gestor responsável. A empresa parceira não foi notificada.',
    `— Enviado automaticamente pelo sistema (${clientName}).`,
  ].join('\n')

  return { subject, html, text }
}

/* =========================================================================
   TEMPLATE 3: CRIAÇÃO DE HE (Envia para o Aprovador com LINK DO MÓDULO)
   ========================================================================= */
function buildCreationNotificationEmail(row: SolicitacaoRow): {
  subject: string
  html: string
  text: string
} {
  const clientName = resolveClientName(row)
  const plantName = row.plants?.name || '—'
  const costCenter =
    row.cost_center_text || row.budget_cost_centers?.name || row.budget_cost_centers?.code || '—'
  const createdBy = row.created_by_name || 'Requisitante'
  const hours = Number(row.hours).toFixed(2).replace('.', ',')
  const date = formatDate(row.date)
  const companyName = row.company_name || 'Empresa parceira'
  const moduleUrl = getAppUrl()

  const subject = `Nova Solicitação de Horas Extras pendente de aprovação — ${row.employee_name}`

  const rowsHtml: Array<[string, string]> = [
    ['Colaborador', row.employee_name],
    ['Empresa (prestadora)', companyName],
    ['Cliente', clientName],
    ['Planta', plantName],
    ['Data da HE', date],
    ['Quantidade de Horas previstas', `${hours} h`],
    ['Centro de Custo pagador', costCenter],
    ['Solicitado por', createdBy],
  ]

  if (row.reason) {
    rowsHtml.push(['Justificativa / Motivo', row.reason])
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#1e40af;padding:20px 24px;">
              <h1 style="margin:0;font-size:18px;color:#ffffff;">Nova Solicitação de Horas Extras</h1>
              <p style="margin:4px 0 0;font-size:13px;color:#dbeafe;">${escapeHtml(clientName)} — Gestão de Terceiros</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
                Olá. Há uma nova solicitação de Horas Extras aguardando sua análise para
                <strong>aprovar ou reprovar</strong> no ${escapeHtml(clientName)}.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                ${rowsHtml
                  .map(
                    ([label, value]) => `
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;color:#475569;width:45%;">${label}</td>
                  <td style="padding:6px 0;border-bottom:1px solid #e2e8f0;font-weight:600;">${escapeHtml(value)}</td>
                </tr>`,
                  )
                  .join('')}
              </table>

              <!-- Link clicável do módulo de Horas Extras logo abaixo da mensagem -->
              <div style="margin:24px 0 8px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:center;">
                <p style="margin:0 0 12px;font-size:13px;color:#475569;">
                  Acesse o módulo de Horas Extras no ${escapeHtml(clientName)} para avaliar esta solicitação:
                </p>
                <a href="${escapeHtml(moduleUrl)}"
                   target="_blank"
                   rel="noopener noreferrer"
                   style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600;">
                  Acessar Módulo Horas Extras
                </a>
                <p style="margin:10px 0 0;font-size:11px;color:#94a3b8;word-break:break-all;">
                  Ou copie e cole o link: <a href="${escapeHtml(moduleUrl)}" style="color:#1e40af;">${escapeHtml(moduleUrl)}</a>
                </p>
              </div>

              <p style="margin:16px 0 0;font-size:12px;color:#64748b;">
                Este é um e-mail automático enviado pelo sistema ${escapeHtml(clientName)} aos responsáveis pela unidade.
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

  const text = [
    'NOVA SOLICITAÇÃO DE HORAS EXTRAS PENDENTE',
    '',
    `Há uma nova solicitação de Horas Extras para você aprovar ou reprovar no ${clientName}.`,
    '',
    ...rowsHtml.map(([label, value]) => `${label}: ${value}`),
    '',
    'Acesse o módulo de Horas Extras para avaliar:',
    moduleUrl,
    '',
    `— Enviado automaticamente pelo sistema (${clientName}).`,
  ].join('\n')

  return { subject, html, text }
}

async function sendViaResend(
  from: string,
  to: string[],
  cc: string[],
  subject: string,
  html: string,
  text: string,
): Promise<{ ok: boolean; status: number; detail: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    return { ok: false, status: 0, detail: 'RESEND_API_KEY não configurada no backend' }
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      ...(cc.length > 0 ? { cc } : {}),
      subject,
      html,
      text,
    }),
  })

  const detail = await res.text()
  if (!res.ok) {
    console.error(`Resend falhou com status ${res.status}: ${detail}`)
  }
  return { ok: res.ok, status: res.status, detail }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorBody('Método não permitido. Utilize POST.', 405)
  }

  // 1) Autenticação do chamador: JWT obrigatório
  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) {
    return errorBody('Autenticação ausente.', 401)
  }

  const supabase = getSupabaseClient()

  // 2) Perfil do chamador
  const { data: caller, error: callerError } = await supabase.auth.getUser(jwt)
  if (callerError || !caller?.user?.id) {
    return errorBody('Sessão inválida ou expirada.', 401)
  }

  const { data: callerProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, client_id, name, email')
    .eq('id', caller.user.id)
    .single()

  if (profileError || !callerProfile) {
    return errorBody('Perfil do chamador não encontrado.', 403)
  }

  const role = String(callerProfile.role || '')

  // 3) Payload: { solicitacao_id, action?: 'aprovada' | 'recusada' | 'criada' }
  let payload: { solicitacao_id?: string; action?: 'aprovada' | 'recusada' | 'criada' }
  try {
    payload = await req.json()
  } catch {
    return errorBody('Payload inválido: JSON esperado.', 400)
  }
  const solicitacaoId = payload?.solicitacao_id
  if (!solicitacaoId) {
    return errorBody('Campo obrigatório ausente: solicitacao_id.', 400)
  }

  const action = payload.action || 'aprovada'
  if (!['aprovada', 'recusada', 'criada'].includes(action)) {
    return errorBody(`Ação inválida: ${action}`, 400)
  }

  // Permissões por ação:
  // - 'criada': qualquer usuário autenticado que pode registrar HE (Gestor, Admin, Master)
  // - 'aprovada' | 'recusada': apenas Administrador e Master
  if (
    (action === 'aprovada' || action === 'recusada') &&
    role !== 'Administrador' &&
    role !== 'Master'
  ) {
    return errorBody('Apenas Administradores podem disparar e-mails de decisão de HE.', 403)
  }

  // 4) Carrega a solicitação (isolada por client_id do chamador)
  const { data: row, error: rowError } = await supabase
    .from('horas_extras_solicitacoes')
    .select(
      `id, client_id, employee_name, company_id, company_name, company_email,
       created_by, created_by_name, approved_by, approved_by_name, approved_at,
       manager_observation, reason,
       plant_id, date, hours, cost_center_text, cost_center_id, status,
       plants ( name, code ),
       budget_cost_centers ( name, code ),
       clients ( name )`,
    )
    .eq('id', solicitacaoId)
    .single()

  if (rowError || !row) {
    return errorBody('Solicitação de HE não encontrada.', 404)
  }

  if (row.client_id && callerProfile.client_id && row.client_id !== callerProfile.client_id) {
    if (role !== 'Master') {
      return errorBody('Solicitação pertence a outro cliente.', 403)
    }
  }

  const from = Deno.env.get('RESEND_FROM') || 'nao-responda@aureafacilities.com'
  const sol = row as SolicitacaoRow

  /* =======================================================================
     RAMIFICAÇÃO POR AÇÃO
     ======================================================================= */

  // -----------------------------------------------------------------------
  // CASO 1: REPROVAÇÃO (Recusada)
  // E-mail apenas para o requisitante (created_by) e quem reprovou (approved_by / caller)
  // EMPRESA NÃO RECEBE NADA.
  // -----------------------------------------------------------------------
  if (action === 'recusada') {
    const userIds = Array.from(
      new Set([sol.created_by, sol.approved_by, callerProfile.id].filter(Boolean)),
    ) as string[]

    const recipients: string[] = []
    if (userIds.length > 0) {
      const { data: userProfiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds)
      for (const p of userProfiles || []) {
        const email = String((p as { email?: string | null }).email || '').trim()
        if (email && EMAIL_RE.test(email) && !recipients.includes(email)) {
          recipients.push(email)
        }
      }
    }

    if (recipients.length === 0) {
      const msg =
        'Nenhum e-mail de usuário (requisitante ou aprovador) encontrado para envio da reprovação.'
      console.warn(`[${solicitacaoId}] ${msg}`)
      await supabase
        .from('horas_extras_solicitacoes')
        .update({ email_error: msg })
        .eq('id', solicitacaoId)
      return jsonBody({ sent: false, error: msg })
    }

    const { subject, html, text } = buildRejectionEmail(sol)
    // Envia aos destinatários (primeiro como To, demais como CC para manter cabeçalho limpo)
    const [primaryTo, ...ccRecipients] = recipients
    const result = await sendViaResend(from, [primaryTo], ccRecipients, subject, html, text)

    if (!result.ok) {
      const msg = `Falha ao enviar e-mail de recusa (HTTP ${result.status || 'n/a'}): ${result.detail.slice(0, 500)}`
      console.error(`[${solicitacaoId}] ${msg}`)
      await supabase
        .from('horas_extras_solicitacoes')
        .update({ email_error: msg })
        .eq('id', solicitacaoId)
      return jsonBody({ sent: false, error: msg })
    }

    console.log(
      `[${solicitacaoId}] E-mail de recusa aceito pelo Resend (status ${result.status}) para [${recipients.join(', ')}]`,
    )
    return jsonBody({ sent: true, action: 'recusada', recipients })
  }

  // -----------------------------------------------------------------------
  // CASO 2: CRIAÇÃO (Pendente)
  // E-mail para o APROVADOR configurado nas Configurações de HE:
  //   - Modo 'all': default_approver_id da tabela horas_extras_config
  //   - Modo 'per_plant': approver_id correspondente à planta em horas_extras_plant_approvers
  //   - Fallback: administradores da planta/cliente
  // -----------------------------------------------------------------------
  if (action === 'criada') {
    let configuredApproverEmail: string | null = null

    // 1. Consulta tabela horas_extras_config do cliente
    const { data: configData } = await supabase
      .from('horas_extras_config')
      .select('mode, default_approver_id')
      .eq('client_id', sol.client_id)
      .maybeSingle()

    if (configData) {
      let approverIdToLookup: string | null = null

      if (configData.mode === 'all' && configData.default_approver_id) {
        approverIdToLookup = configData.default_approver_id
      } else if (configData.mode === 'per_plant' && sol.plant_id) {
        const { data: plantApprover } = await supabase
          .from('horas_extras_plant_approvers')
          .select('approver_id')
          .eq('client_id', sol.client_id)
          .eq('plant_id', sol.plant_id)
          .maybeSingle()

        if (plantApprover?.approver_id) {
          approverIdToLookup = plantApprover.approver_id
        } else if (configData.default_approver_id) {
          approverIdToLookup = configData.default_approver_id
        }
      }

      if (approverIdToLookup) {
        const { data: approverProfile } = await supabase
          .from('profiles')
          .select('id, email, name, role')
          .eq('id', approverIdToLookup)
          .maybeSingle()

        if (approverProfile?.email && EMAIL_RE.test(String(approverProfile.email))) {
          configuredApproverEmail = String(approverProfile.email).trim()
        }
      }
    }

    const eligibleEmails: string[] = []

    if (configuredApproverEmail) {
      eligibleEmails.push(configuredApproverEmail)
    } else {
      // Fallback: Busca Administradores do mesmo client_id com acesso à planta
      const { data: adminProfiles, error: adminErr } = await supabase
        .from('profiles')
        .select('id, email, name, role, authorized_plants')
        .eq('client_id', sol.client_id)
        .eq('role', 'Administrador')

      if (adminErr) {
        console.error(`[${solicitacaoId}] Erro ao buscar aprovadores fallback da planta:`, adminErr)
      }

      for (const adm of adminProfiles || []) {
        const email = String(adm.email || '').trim()
        if (!email || !EMAIL_RE.test(email)) continue

        let plantOk = true
        if (sol.plant_id && adm.authorized_plants) {
          let authList: string[] = []
          if (Array.isArray(adm.authorized_plants)) {
            authList = adm.authorized_plants as string[]
          } else if (typeof adm.authorized_plants === 'string') {
            try {
              authList = JSON.parse(adm.authorized_plants)
            } catch {
              authList = []
            }
          }
          if (authList.length > 0 && !authList.includes(sol.plant_id)) {
            plantOk = false
          }
        }

        if (plantOk && !eligibleEmails.includes(email)) {
          eligibleEmails.push(email)
        }
      }

      if (eligibleEmails.length === 0) {
        for (const adm of adminProfiles || []) {
          const email = String(adm.email || '').trim()
          if (email && EMAIL_RE.test(email) && !eligibleEmails.includes(email)) {
            eligibleEmails.push(email)
          }
        }
      }
    }

    if (eligibleEmails.length === 0) {
      const msg =
        'Nenhum aprovador ou administrador com e-mail cadastrado encontrado para receber aviso de nova HE.'
      console.warn(`[${solicitacaoId}] ${msg}`)
      return jsonBody({ sent: false, error: msg })
    }

    const { subject, html, text } = buildCreationNotificationEmail(sol)
    const [primaryAdmin, ...otherAdmins] = eligibleEmails
    const result = await sendViaResend(from, [primaryAdmin], otherAdmins, subject, html, text)

    if (!result.ok) {
      const msg = `Falha ao enviar e-mail de nova solicitação (HTTP ${result.status || 'n/a'}): ${result.detail.slice(0, 500)}`
      console.error(`[${solicitacaoId}] ${msg}`)
      return jsonBody({ sent: false, error: msg })
    }

    console.log(
      `[${solicitacaoId}] E-mail de nova HE aceito pelo Resend (status ${result.status}) para [${eligibleEmails.join(', ')}]`,
    )
    return jsonBody({ sent: true, action: 'criada', recipients: eligibleEmails })
  }

  // -----------------------------------------------------------------------
  // CASO 3: APROVAÇÃO (Aprovada)
  // Destinatários: TODOS os e-mails da EMPRESA PARCEIRA
  // Suporta múltiplos e-mails cadastrados em companies (emails text[] ou email string separado por vírgula/ponto-e-vírgula)
  // Fallback: company_email da solicitação
  // CC: Solicitante e Aprovador
  // -----------------------------------------------------------------------
  if (sol.status !== 'aprovada') {
    return errorBody('Somente solicitações APROVADAS disparam este e-mail.', 409)
  }

  const companyRecipients: string[] = []
  let recipientSource = ''

  if (sol.company_id) {
    const { data: comp } = await supabase
      .from('companies')
      .select('email, emails')
      .eq('id', sol.company_id)
      .maybeSingle()

    if (comp) {
      // 1. Array emails
      if (Array.isArray(comp.emails)) {
        for (const e of comp.emails) {
          const trimmed = String(e || '').trim()
          if (trimmed && EMAIL_RE.test(trimmed) && !companyRecipients.includes(trimmed)) {
            companyRecipients.push(trimmed)
          }
        }
      }
      // 2. Campo clássico email (pode ser único ou separado por vírgula/ponto-e-vírgula)
      if (comp.email) {
        const parts = String(comp.email)
          .split(/[,;\s]+/)
          .map((s) => s.trim())
        for (const part of parts) {
          if (part && EMAIL_RE.test(part) && !companyRecipients.includes(part)) {
            companyRecipients.push(part)
          }
        }
      }
      if (companyRecipients.length > 0) {
        recipientSource = 'cadastro da empresa (múltiplos e-mails)'
      }
    }
  }

  // Fallback: se não encontrou no cadastro, tenta company_email da solicitação
  if (companyRecipients.length === 0 && sol.company_email) {
    const parts = String(sol.company_email)
      .split(/[,;\s]+/)
      .map((s) => s.trim())
    for (const part of parts) {
      if (part && EMAIL_RE.test(part) && !companyRecipients.includes(part)) {
        companyRecipients.push(part)
      }
    }
    if (companyRecipients.length > 0) {
      recipientSource = 'solicitação (ajuste pontual)'
    }
  }

  if (companyRecipients.length === 0) {
    const msg =
      'Empresa parceira sem e-mail cadastrado (nem no cadastro da empresa nem na solicitação).'
    console.warn(`[${solicitacaoId}] ${msg}`)
    await supabase
      .from('horas_extras_solicitacoes')
      .update({ email_error: msg })
      .eq('id', solicitacaoId)
    return jsonBody({ sent: false, error: msg })
  }

  // Cópias (CC): solicitante e aprovador
  const ccIds = Array.from(new Set([sol.created_by, sol.approved_by].filter(Boolean))) as string[]
  const cc: string[] = []
  if (ccIds.length > 0) {
    const { data: ccProfiles } = await supabase.from('profiles').select('id, email').in('id', ccIds)
    for (const p of ccProfiles || []) {
      const email = String((p as { email?: string | null }).email || '').trim()
      const isAlreadyRecipient = companyRecipients.some(
        (r) => r.toLowerCase() === email.toLowerCase(),
      )
      if (email && EMAIL_RE.test(email) && !isAlreadyRecipient && !cc.includes(email)) {
        cc.push(email)
      }
    }
  }

  // Idempotência de aprovação: já enviado com sucesso, não reenvia
  const { data: sentRow } = await supabase
    .from('horas_extras_solicitacoes')
    .select('email_sent_at')
    .eq('id', solicitacaoId)
    .single()
  if (sentRow?.email_sent_at) {
    return jsonBody({
      sent: true,
      alreadySent: true,
      recipients: companyRecipients,
      recipientSource,
    })
  }

  // Envia via Resend para todos os e-mails da empresa
  const { subject, html, text } = buildApprovalEmail(sol, cc)
  const [primaryCompanyEmail, ...otherCompanyEmails] = companyRecipients
  const allCc = [...otherCompanyEmails, ...cc]

  const result = await sendViaResend(from, [primaryCompanyEmail], allCc, subject, html, text)

  if (!result.ok) {
    const msg = `Falha ao enviar e-mail (HTTP ${result.status || 'n/a'}): ${result.detail.slice(0, 500)}`
    console.error(`[${solicitacaoId}] ${msg}`)
    await supabase
      .from('horas_extras_solicitacoes')
      .update({ email_error: msg })
      .eq('id', solicitacaoId)
    return jsonBody({ sent: false, error: msg })
  }

  console.log(
    `[${solicitacaoId}] E-mail de aprovação aceito pelo Resend (status ${result.status}) para [${companyRecipients.join(', ')}] (fonte: ${recipientSource})`,
  )
  await supabase
    .from('horas_extras_solicitacoes')
    .update({ email_sent_at: new Date().toISOString(), email_error: null })
    .eq('id', solicitacaoId)

  return jsonBody({ sent: true, recipients: companyRecipients, recipientSource })
})
