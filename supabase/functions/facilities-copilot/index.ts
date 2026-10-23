import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Facilita — robô tira-dúvidas Facilities do Aurea, via MAESTRO (Chico), sem chave de IA externa.
// Fluxo: POST {conversation_id, question} com Authorization do usuário →
//   1) valida conversa (RLS via token do usuário), cria user message, marca assistant 'processing'
//   2) aciona webhook do Maestro (Facilita) com pergunta + callback
//   3) Maestro pesquisa POPs (facilita_chunks), budget e know-how e responde via callback
//   4) callback grava a resposta do assistente.
// Integração fixa Maestro<->Aurea (mesmo padrão de verify-training-presence).

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

  // ===== CALLBACK do Maestro (Facilita) com a resposta =====
  if (body?.action === 'callback') {
    if (!FACILITA_CALLBACK_SECRET || body.callback_secret !== FACILITA_CALLBACK_SECRET) {
      return jsonRes({ error: 'Não autorizado' }, 401)
    }
    const conversationId = body.conversation_id
    if (!conversationId) return jsonRes({ error: 'Missing conversation_id' }, 400)

    const answer = String(body.answer || '').slice(0, 20000)
    const sources = Array.isArray(body.sources) ? body.sources : []
    if (!answer) {
      await admin
        .from('facilita_messages')
        .update({
          status: 'failed',
          content: 'Não consegui gerar uma resposta agora. Tente reformular a pergunta.',
        })
        .eq('conversation_id', conversationId)
        .eq('role', 'assistant')
        .eq('status', 'processing')
      return jsonRes({ success: true })
    }

    // grava a resposta na mensagem 'processing' mais recente da conversa
    const { data: pend, error: pendErr } = await admin
      .from('facilita_messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('role', 'assistant')
      .eq('status', 'processing')
      .order('created_at', { ascending: false })
      .limit(1)

    if (pendErr || !pend || pend.length === 0) {
      // conversa pode ter sido apagada — grava nova mensagem
      await admin.from('facilita_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: answer,
        sources,
        status: 'sent',
      })
      return jsonRes({ success: true, note: 'inserted_new' })
    }

    await admin
      .from('facilita_messages')
      .update({ content: answer, sources, status: 'sent' })
      .eq('id', pend[0].id)

    return jsonRes({ success: true })
  }

  // ===== PERGUNTA do usuário (chamado pelo frontend) =====
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonRes({ error: 'Missing Authorization header' }, 401)

    const { conversation_id: conversationId, question } = body || {}
    if (!conversationId || !question) {
      return jsonRes({ error: 'Missing conversation_id ou question' }, 400)
    }

    // client com RLS do usuário: a conversa tem que pertencer a ele (ou ao client dele)
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: conv, error: convErr } = await userClient
      .from('facilita_conversations')
      .select('id, client_id, title')
      .eq('id', conversationId)
      .maybeSingle()

    if (convErr || !conv) {
      return jsonRes({ error: 'Conversa não encontrada ou sem permissão' }, 404)
    }

    // dados do usuário para o Facilita se contextualizar
    let userName = ''
    let userRole = ''
    const { data: userData } = await admin.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''))
    if (userData?.user) {
      userName = (userData.user.user_metadata as any)?.name || userData.user.email || ''
      const { data: prof } = await admin
        .from('profiles')
        .select('name, role')
        .eq('id', userData.user.id)
        .maybeSingle()
      userName = prof?.name || userName
      userRole = prof?.role || ''
    }

    // histórico recente da conversa (últimas 10 mensagens) para contexto
    const { data: history } = await admin
      .from('facilita_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    const recentHistory = (history || [])
      .slice(-10)
      .map(
        (m: any) =>
          `${m.role === 'user' ? 'Usuário' : 'Facilita'}: ${String(m.content).slice(0, 500)}`,
      )
      .join('\n')

    // grava a pergunta do usuário + placeholder do assistente
    await admin.from('facilita_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: String(question).slice(0, 4000),
      status: 'sent',
    })

    await admin.from('facilita_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: '',
      status: 'processing',
    })

    // aciona o Maestro (Facilita) com RETRY 3x (mesma proteção do conferidor)
    const whBody = JSON.stringify({
      action: 'facilita_ask',
      conversation_id: conversationId,
      client_id: conv.client_id,
      user_name: userName,
      user_role: userRole,
      question: String(question).slice(0, 4000),
      recent_history: recentHistory,
      callback_url: `${Deno.env.get('SUPABASE_URL') ?? ''}/functions/v1/facilities-copilot`,
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
        .from('facilita_messages')
        .update({
          status: 'failed',
          content: 'Falha ao acionar o Facilita. Tente novamente em instantes.',
        })
        .eq('conversation_id', conversationId)
        .eq('role', 'assistant')
        .eq('status', 'processing')
      return jsonRes({ error: `Falha ao acionar o Facilita: ${lastErr}` }, 502)
    }

    return jsonRes({ success: true, queued: true })
  } catch (error: any) {
    return jsonRes({ error: String(error?.message || error) }, 500)
  }
})
