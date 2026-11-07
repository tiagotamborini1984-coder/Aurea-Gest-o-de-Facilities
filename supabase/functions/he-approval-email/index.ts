import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient, jsonBody, errorBody } from '../_shared/supabase.ts'

/**
 * he-approval-email
 * -----------------
 * Envia (ou reenvia) o e-mail para a empresa parceira quando uma Solicitação de
 * Horas Extras é APROVADA pelo gestor Administrador. Chamada pelo frontend logo
 * após o UPDATE de aprovação — o envio NUNCA bloqueia nem reverte a aprovação:
 * qualquer falha é apenas registrada em email_error (auditoria).
 *
 * Segurança:
 *  - exige um JWT de usuário autenticado (Authorization: Bearer <jwt>) e que o
 *    usuário tenha papel Administrador/Master;
 *  - consulta/escrita no banco com service_role, mas sempre filtrada pelo
 *    client_id do chamador (mesmo isolamento de tenant do RLS da tela);
 *  - a chave RESEND_API_KEY vive apenas nos segredos do backend.
 *
 * POST { solicitacao_id } → { sent: boolean, recipient?: string, error?: string }
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

// Validação simples de formato de e-mail (mesma regra usada no frontend)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface SolicitacaoRow {
  id: string
  client_id: string
  employee_name: string
  company_id: string | null
  company_name: string | null
  company_email: string | null
  created_by: string | null
  approved_by: string | null
  plant_id: string | null
  date: string
  hours: number
  cost_center_text: string | null
  cost_center_id: string | null
  approved_by_name: string | null
  approved_at: string | null
  plants: { name: string | null; code: string | null } | null
  budget_cost_centers: { name: string | null; code: string | null } | null
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildEmail(
  row: SolicitacaoRow,
  cc: string[],
): { subject: string; html: string; text: string } {
  const plantName = row.plants?.name || '—'
  const costCenter =
    row.cost_center_text || row.budget_cost_centers?.name || row.budget_cost_centers?.code || '—'
  const approvedBy = row.approved_by_name || 'Gestor Administrador'
  const approvedAt = formatDateTime(row.approved_at || new Date().toISOString())
  const hours = Number(row.hours).toFixed(2).replace('.', ',')
  const date = formatDateTime(`${row.date}T12:00:00`)
  const companyName = row.company_name || 'Empresa parceira'
  const ccNote =
    cc.length > 0
      ? `Cópia deste e-mail enviada para: ${cc.join(', ')}.`
      : 'Sem cópias para usuários do sistema (solicitante/aprovador sem e-mail válido).'

  const subject = `Solicitação de Horas Extras aprovada — ${row.employee_name}`

  const rowsHtml: Array<[string, string]> = [
    ['Colaborador', row.employee_name],
    ['Empresa (prestadora)', companyName],
    ['Planta', plantName],
    ['Data da HE', date],
    ['Quantidade de horas', `${hours} h`],
    ['Centro de Custo pagador', costCenter],
    ['Aprovada por', approvedBy],
    ['Data/hora da aprovação', approvedAt],
  ]

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#166534;padding:20px 24px;">
              <h1 style="margin:0;font-size:18px;color:#ffffff;">Solicitação de Horas Extras aprovada</h1>
              <p style="margin:4px 0 0;font-size:13px;color:#dcfce7;">Aurea — Gestão de Terceiros</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
                Olá, <strong>${escapeHtml(companyName)}</strong>. A solicitação de horas extras abaixo foi
                <strong style="color:#166534;">APROVADA</strong> pelo gestor Administrador.
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
                Este é um e-mail automático do sistema Aurea. Em caso de divergência, entre em
                contato com o gestor da planta.
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
    '— Enviado automaticamente pelo sistema Aurea.',
  ].join('\n')

  return { subject, html, text }
}

async function sendViaResend(
  from: string,
  to: string,
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
      to: [to],
      ...(cc.length > 0 ? { cc } : {}),
      subject,
      html,
      text,
    }),
  })

  const detail = await res.text()
  if (!res.ok) {
    // Nunca loga a chave — apenas o corpo do erro do Resend.
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

  // 2) Papel do chamador: apenas Administrador/Master dispara o e-mail
  const { data: caller, error: callerError } = await supabase.auth.getUser(jwt)
  if (callerError || !caller?.user?.id) {
    return errorBody('Sessão inválida ou expirada.', 401)
  }

  const { data: callerProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, client_id')
    .eq('id', caller.user.id)
    .single()

  if (profileError || !callerProfile) {
    return errorBody('Perfil do chamador não encontrado.', 403)
  }

  const role = String(callerProfile.role || '')
  if (role !== 'Administrador' && role !== 'Master') {
    return errorBody('Apenas Administradores podem disparar o e-mail de aprovação.', 403)
  }

  // 3) Payload
  let payload: { solicitacao_id?: string }
  try {
    payload = await req.json()
  } catch {
    return errorBody('Payload inválido: JSON esperado.', 400)
  }
  const solicitacaoId = payload?.solicitacao_id
  if (!solicitacaoId) {
    return errorBody('Campo obrigatório ausente: solicitacao_id.', 400)
  }

  // 4) Carrega a solicitação (isolada por client_id do chamador — mesma regra do RLS)
  const { data: row, error: rowError } = await supabase
    .from('horas_extras_solicitacoes')
    .select(
      `id, client_id, employee_name, company_id, company_name, company_email,
       created_by, approved_by,
       plant_id, date, hours, cost_center_text, cost_center_id,
       approved_by_name, approved_at, status,
       plants ( name, code ),
       budget_cost_centers ( name, code )`,
    )
    .eq('id', solicitacaoId)
    .single()

  if (rowError || !row) {
    return errorBody('Solicitação de HE não encontrada.', 404)
  }

  if (row.client_id && callerProfile.client_id && row.client_id !== callerProfile.client_id) {
    // Master pode ver todos os clientes; demais, apenas o próprio.
    if (role !== 'Master') {
      return errorBody('Solicitação pertence a outro cliente.', 403)
    }
  }

  if (row.status !== 'aprovada') {
    return errorBody('Somente solicitações APROVADAS disparam o e-mail.', 409)
  }

  const from = Deno.env.get('RESEND_FROM') || 'onboarding@resend.dev'
  const sol = row as SolicitacaoRow

  // 5) Destinatário principal: e-mail da EMPRESA PARCEIRA no cadastro (companies.email).
  //    Fallback: e-mail informado na própria solicitação (company_email). Sem e-mail
  //    em nenhum dos dois, registra email_error sem bloquear a aprovação.
  let recipient: string | null = null
  let recipientSource = ''
  if (sol.company_id) {
    const { data: comp } = await supabase
      .from('companies')
      .select('email')
      .eq('id', sol.company_id)
      .maybeSingle()
    if (comp?.email && EMAIL_RE.test(String(comp.email))) {
      recipient = String(comp.email).trim()
      recipientSource = 'cadastro da empresa'
    }
  }
  if (!recipient && sol.company_email && EMAIL_RE.test(sol.company_email)) {
    recipient = sol.company_email.trim()
    recipientSource = 'solicitação (ajuste pontual)'
  }
  if (!recipient) {
    const msg =
      'Empresa parceira sem e-mail cadastrado (nem no cadastro da empresa nem na solicitação).'
    console.warn(`[${solicitacaoId}] ${msg}`)
    await supabase
      .from('horas_extras_solicitacoes')
      .update({ email_error: msg })
      .eq('id', solicitacaoId)
    return jsonBody({ sent: false, error: msg })
  }

  // 6) Cópias (CC): e-mail do usuário solicitante e do aprovador (profiles.email).
  //    Falha/ausência de um CC NUNCA bloqueia o envio principal.
  const ccIds = Array.from(new Set([sol.created_by, sol.approved_by].filter(Boolean))) as string[]
  const cc: string[] = []
  if (ccIds.length > 0) {
    const { data: ccProfiles } = await supabase.from('profiles').select('id, email').in('id', ccIds)
    for (const p of ccProfiles || []) {
      const email = String((p as { email?: string | null }).email || '').trim()
      if (email && EMAIL_RE.test(email) && email.toLowerCase() !== recipient.toLowerCase()) {
        cc.push(email)
      }
    }
  }

  // 7) Idempotência: já enviado com sucesso, não reenvia em re-execuções
  const { data: sentRow } = await supabase
    .from('horas_extras_solicitacoes')
    .select('email_sent_at')
    .eq('id', solicitacaoId)
    .single()
  if (sentRow?.email_sent_at) {
    return jsonBody({ sent: true, alreadySent: true, recipient, recipientSource })
  }

  // 8) Envia via Resend — falha NÃO reverte a aprovação, só registra email_error
  const { subject, html, text } = buildEmail(sol, cc)
  const result = await sendViaResend(from, recipient, cc, subject, html, text)

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
    `[${solicitacaoId}] E-mail de aprovação aceito pelo Resend (status ${result.status}) para ${recipient} (fonte: ${recipientSource})`,
  )
  await supabase
    .from('horas_extras_solicitacoes')
    .update({ email_sent_at: new Date().toISOString(), email_error: null })
    .eq('id', solicitacaoId)

  return jsonBody({ sent: true, recipient, recipientSource })
})
