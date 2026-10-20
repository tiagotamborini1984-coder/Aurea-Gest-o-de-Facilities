import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Conferência de lista de presença via MAESTRO (Chico) — sem chave de IA externa.
// Fluxo: POST {record_id} → marca 'analyzing' → aciona webhook do Maestro →
// Maestro lê o documento com visão → POST callback {action:'callback', ...} → grava resultado.
// Integração fixa Maestro<->Aurea (repo privado). Env vars custom não chegam ao
// runtime das Edge Functions neste ambiente; os valores ficam aqui como fallback.

const CHICO_WEBHOOK_URL =
  (Deno.env.get('CHICO_WEBHOOK_URL') ?? '') ||
  'https://maestro.adapta.one/webhooks/generic/f709ed370a39cf342942b0a622d0fffeb0cc9d94d94792b063dbf3de0c3f8343'
const CHICO_WEBHOOK_SECRET =
  (Deno.env.get('CHICO_WEBHOOK_SECRET') ?? '') ||
  '3e8107918d5a42ad04e2f4dd9bcd18b2e5bd26b89f2f61ed6961fefead2ae47e'
const CHICO_CALLBACK_SECRET =
  (Deno.env.get('CHICO_CALLBACK_SECRET') ?? '') ||
  '1bb7858c646aa11edadb7fc2b08d21234c0ec5483a7691e911ad087bb6e83fd7'

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonRes({ error: 'Use POST' }, 405)
  }

  const admin = adminClient()
  let body: any = null
  try {
    body = await req.json()
  } catch (_e) {
    return jsonRes({ error: 'JSON inválido' }, 400)
  }

  // ===== CALLBACK do Maestro com o resultado da conferência =====
  if (body?.action === 'callback') {
    if (!CHICO_CALLBACK_SECRET || body.callback_secret !== CHICO_CALLBACK_SECRET) {
      return jsonRes({ error: 'Não autorizado' }, 401)
    }
    const recordId = body.record_id
    if (!recordId) return jsonRes({ error: 'Missing record_id' }, 400)

    const status = body.status === 'verified' ? 'verified' : 'rejected'
    await admin
      .from('employee_training_records')
      .update({
        verification_status: status,
        verification_notes: String(body.notes || '').slice(0, 500),
        verification_signed_name: String(body.signed_name || '').slice(0, 200),
        verification_confidence: typeof body.confidence === 'number' ? body.confidence : 50,
        verified_at: new Date().toISOString(),
      })
      .eq('id', recordId)

    return jsonRes({ success: true })
  }

  // ===== PEDIDO de conferência (chamado pelo frontend) =====
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonRes({ error: 'Missing Authorization header' }, 401)

    const recordId = body?.record_id
    if (!recordId) return jsonRes({ error: 'Missing record_id' }, 400)

    const { data: rec, error: recErr } = await admin
      .from('employee_training_records')
      .select('id, document_url, employees(name), trainings(name)')
      .eq('id', recordId)
      .single()

    if (recErr || !rec) return jsonRes({ error: 'Registro de treinamento não encontrado' }, 404)
    const record = rec as any
    if (!record.document_url) {
      return jsonRes({ error: 'Registro sem documento anexado' }, 400)
    }

    const webhookUrl = CHICO_WEBHOOK_URL
    const webhookSecret = CHICO_WEBHOOK_SECRET
    const cbSecret = CHICO_CALLBACK_SECRET
    if (!webhookUrl || !webhookSecret || !cbSecret) {
      await admin
        .from('employee_training_records')
        .update({
          verification_status: 'failed',
          verification_notes: 'Integração de conferência (Maestro) não configurada.',
          verified_at: new Date().toISOString(),
        })
        .eq('id', recordId)
      return jsonRes({ error: 'Integração de conferência não configurada' }, 500)
    }

    // marca como em análise
    await admin
      .from('employee_training_records')
      .update({
        verification_status: 'analyzing',
        verification_notes: 'Conferência em andamento.',
        verified_at: new Date().toISOString(),
      })
      .eq('id', recordId)

    // aciona o Maestro (Chico)
    const whRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret,
      },
      body: JSON.stringify({
        record_id: recordId,
        document_url: record.document_url,
        training_name: record.trainings?.name || '',
        employee_name: record.employees?.name || '',
        callback_url: `${Deno.env.get('SUPABASE_URL') ?? ''}/functions/v1/verify-training-presence`,
        callback_secret: cbSecret,
      }),
    })

    if (!whRes.ok) {
      const t = (await whRes.text()).slice(0, 300)
      await admin
        .from('employee_training_records')
        .update({
          verification_status: 'failed',
          verification_notes: `Falha ao acionar a conferência (${whRes.status}).`,
          verified_at: new Date().toISOString(),
        })
        .eq('id', recordId)
      return jsonRes({ error: `Falha ao acionar conferência: ${whRes.status}`, detail: t }, 502)
    }

    return jsonRes({ success: true, queued: true })
  } catch (error: any) {
    return jsonRes({ error: String(error?.message || error) }, 500)
  }
})
