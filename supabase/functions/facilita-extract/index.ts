import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Facilita — extração automática de dados do documento (título, categoria, revisão, descrição)
// via MAESTRO (Chico), sem chave de IA externa.
// Fluxo: POST {document_id} com Authorization → aciona webhook do Maestro (action facilita_extract)
// → Maestro lê o arquivo (pdftotext / visão) → callback grava title/category/revision/description
// e marca status 'draft' para o usuário revisar antes de adicionar à base.

const FACILITA_WEBHOOK_URL =
  (Deno.env.get('FACILITA_WEBHOOK_URL') ?? '') ||
  'https://maestro.adapta.one/webhooks/generic/64970cf58df1482c7c019487eb6bb272ca039d13b4adbc03f84ae0ffeebf4d6a'
const FACILITA_WEBHOOK_SECRET =
  (Deno.env.get('FACILITA_WEBHOOK_SECRET') ?? '') ||
  'b7d5081360e601c05a311ac28de8a9f388ba935f9495653c3e6adc1b6543b163'
const FACILITA_CALLBACK_SECRET =
  (Deno.env.get('FACILITA_CALLBACK_SECRET') ?? '') ||
  'f6a2c9e4d1b87a5c3e09f8d2b4a6c1e8d7b3f0a9c5e2d8b4f6a1c3e9d7b5f0a2'

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

  // ===== CALLBACK do Maestro com os dados extraídos =====
  if (body?.action === 'callback') {
    if (!FACILITA_CALLBACK_SECRET || body.callback_secret !== FACILITA_CALLBACK_SECRET) {
      return jsonRes({ error: 'Não autorizado' }, 401)
    }
    const documentId = body.document_id
    if (!documentId) return jsonRes({ error: 'Missing document_id' }, 400)

    const title = String(body.title || '')
      .trim()
      .slice(0, 300)
    if (!title) {
      await admin
        .from('facilita_documents')
        .update({
          status: 'failed',
          status_message:
            'Não consegui extrair os dados do documento — preencha manualmente e adicione à base.',
        })
        .eq('id', documentId)
      return jsonRes({ success: true })
    }

    await admin
      .from('facilita_documents')
      .update({
        title,
        category:
          String(body.category || 'POP')
            .trim()
            .slice(0, 80) || 'POP',
        revision: String(body.revision || '')
          .trim()
          .slice(0, 40),
        description: String(body.description || '')
          .trim()
          .slice(0, 600),
        status: 'draft',
        status_message: 'Dados extraídos do documento — revise e confirme.',
      })
      .eq('id', documentId)

    return jsonRes({ success: true })
  }

  // ===== PEDIDO de extração (chamado pelo frontend ao anexar o arquivo) =====
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonRes({ error: 'Missing Authorization header' }, 401)

    const documentId = body?.document_id
    if (!documentId) return jsonRes({ error: 'Missing document_id' }, 400)

    // client com RLS do usuário: o rascunho tem que pertencer ao client dele
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: doc, error: docErr } = await userClient
      .from('facilita_documents')
      .select('id, file_urls')
      .eq('id', documentId)
      .maybeSingle()

    if (docErr || !doc) {
      return jsonRes({ error: 'Documento não encontrado ou sem permissão' }, 404)
    }

    const fileUrl = (doc.file_urls || [])[0]
    if (!fileUrl) {
      await admin
        .from('facilita_documents')
        .update({ status: 'failed', status_message: 'Documento sem arquivo anexado.' })
        .eq('id', documentId)
      return jsonRes({ error: 'Documento sem arquivo anexado' }, 400)
    }

    // aciona o Maestro (Facilita) com RETRY 3x
    const whBody = JSON.stringify({
      action: 'facilita_extract',
      document_id: documentId,
      document_url: fileUrl,
      callback_url: `${Deno.env.get('SUPABASE_URL') ?? ''}/functions/v1/facilita-extract`,
      callback_secret: FACILITA_CALLBACK_SECRET,
    })

    let whOk = false
    let lastErr = ''
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await fetch(FACILITA_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': FACILITA_WEBHOOK_SECRET,
          },
          body: whBody,
        })
        if (r.ok) {
          whOk = true
          break
        }
        lastErr = `HTTP ${r.status}`
      } catch (e: any) {
        lastErr = String(e?.message || e)
      }
      if (attempt < 3) await new Promise((res) => setTimeout(res, attempt * 2000))
    }

    if (!whOk) {
      await admin
        .from('facilita_documents')
        .update({
          status: 'failed',
          status_message: 'Falha ao acionar a extração — preencha manualmente.',
        })
        .eq('id', documentId)
      return jsonRes({ error: `Falha ao acionar extração: ${lastErr}` }, 502)
    }

    return jsonRes({ success: true, queued: true })
  } catch (error: any) {
    return jsonRes({ error: String(error?.message || error) }, 500)
  }
})
