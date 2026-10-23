import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Facilita — robô tira-dúvidas Facilities do Aurea, via MAESTRO (Chico), sem chave de IA externa.
// Fluxo: POST {conversation_id, question} com Authorization do usuário →
//   1) valida conversa (RLS via token do usuário), cria user message, marca assistant 'processing'
//   2) FRENTE 1: pergunta de DADOS (budget/imóveis/tarefas) → resposta montada aqui (0 tokens, <1s)
//      FRENTE 2: pergunta de conhecimento já cacheada (pg_trgm ≥ 0.85) → resposta do cache (0 tokens)
//   3) senão, aciona webhook do Maestro (Facilita) com pergunta + contexto enxuto + callback
//   4) Maestro responde via callback; respostas de conhecimento são cacheadas p/ reuso.
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

// ===== FRENTE 1/2 — respostas locais (economia de tokens) =====
// Detectores de intenção SÓ para resposta determinística (mais estritos que os
// detectores de contexto — falso positivo aqui geraria resposta errada).
const RE_BUDGET =
  /(orcado|orcamento|realizado|budget|forecast|previsao|opex|capex|gasto|gastos|despesa|despesas|quanto.*gast|quanto.*cust|centro de custo|estour.{0,20}(custo|budget|orcado|orcament|gasto|despesa))/
const RE_IMOVEIS = /(quarto|quartos|ocupad|ocupac|hospede|reserva|imovel|imoveis)/
const RE_TAREFAS =
  /(chamado|chamados|tarefa|tarefas|ticket|solicitac|ordem de servico|pendenc|demanda)/

function matchesBudget(q: string) {
  return RE_BUDGET.test(q)
}
function matchesImoveis(q: string) {
  return RE_IMOVEIS.test(q)
}
function matchesTarefas(q: string) {
  return RE_TAREFAS.test(q)
}

function normalizeForCache(s: string) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400)
}

const fmtBRL = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

// Resposta determinística para perguntas de dados (budget, imóveis, tarefas).
// Retorna null quando não há dados — o fluxo segue para o Maestro com contexto.
async function localAnswer(admin: any, clientId: string, question: string) {
  const today = new Date().toISOString().slice(0, 10)

  if (matchesBudget(normalizeForCache(question))) {
    const { data: entries } = await admin
      .from('budget_entries')
      .select(
        'reference_month, budgeted_amount, realized_amount, budget_accounts(name), budget_cost_centers(name)',
      )
      .eq('client_id', clientId)
      .order('reference_month')
      .limit(2000)
    if (!entries || entries.length === 0) return null
    const byMonth: any = {}
    const byAccount: any = {}
    const byCC: any = {}
    for (const e of entries) {
      const m = e.reference_month
      byMonth[m] = byMonth[m] || { b: 0, r: 0 }
      byMonth[m].b += Number(e.budgeted_amount) || 0
      byMonth[m].r += Number(e.realized_amount) || 0
      const acc = e.budget_accounts?.name || 'Desconhecida'
      byAccount[acc] = byAccount[acc] || { b: 0, r: 0 }
      byAccount[acc].b += Number(e.budgeted_amount) || 0
      byAccount[acc].r += Number(e.realized_amount) || 0
      const ccName = e.budget_cost_centers?.name || 'Sem centro de custo'
      byCC[ccName] = byCC[ccName] || { b: 0, r: 0 }
      byCC[ccName].b += Number(e.budgeted_amount) || 0
      byCC[ccName].r += Number(e.realized_amount) || 0
    }
    const months = Object.keys(byMonth).sort()
    const top = Object.entries(byAccount)
      .map(([n, v]: any) => ({ n, ...v, pct: v.b > 0 ? (v.r / v.b) * 100 : 0 }))
      .sort((a: any, b: any) => b.pct - a.pct)
      .slice(0, 5)
    const ccList = Object.entries(byCC)
      .map(([n, v]: any) => ({ n, ...v, pct: v.b > 0 ? (v.r / v.b) * 100 : 0 }))
      .sort((a: any, b: any) => b.pct - a.pct)
    const estourados = ccList.filter((c: any) => c.b > 0 && c.r > c.b)
    const answer =
      '**Budget — orçado vs realizado**\n\n' +
      months
        .map((m) => `- ${m}: orçado ${fmtBRL(byMonth[m].b)} | realizado ${fmtBRL(byMonth[m].r)}`)
        .join('\n') +
      '\n\n**Centros de custo que estouraram (realizado > orçado):**\n' +
      (estourados.length
        ? estourados
            .map(
              (c: any) =>
                `- ${c.n}: ${c.pct.toFixed(1)}% (orçado ${fmtBRL(c.b)}, realizado ${fmtBRL(c.r)}) — excesso de ${fmtBRL(c.r - c.b)}`,
            )
            .join('\n')
        : 'Nenhum centro de custo estourou no período da base.') +
      '\n\n**Top contas por % realizado:**\n' +
      top
        .map(
          (a: any) =>
            `- ${a.n}: ${a.pct.toFixed(1)}% (orçado ${fmtBRL(a.b)}, realizado ${fmtBRL(a.r)})`,
        )
        .join('\n') +
      '\n\nQuer detalhe de algum mês, conta ou centro de custo específico? É só perguntar! 😊'
    return {
      answer,
      sources: [{ type: 'budget', ref: `budget do client — até ${months[months.length - 1]}` }],
    }
  }

  if (matchesImoveis(normalizeForCache(question))) {
    const { data: props } = await admin
      .from('properties')
      .select('id, name, city')
      .eq('client_id', clientId)
    const propIds = (props || []).map((p: any) => p.id)
    if (!propIds.length) {
      return {
        answer:
          '**Gestão de Imóveis**\n\nNão há imóveis cadastrados para este cliente no momento. Quando houver cadastro no módulo de Gestão de Imóveis, eu te mostro a ocupação aqui! 😊',
        sources: [{ type: 'aurea', ref: 'Gestão de Imóveis — sem registros' }],
      }
    }
    const { data: rooms } = await admin
      .from('property_rooms')
      .select('id, name, property_id')
      .in('property_id', propIds)
    const roomIds = (rooms || []).map((r: any) => r.id)
    let reservations: any[] = []
    if (roomIds.length) {
      const { data: resv } = await admin
        .from('property_reservations')
        .select(
          'id, room_id, bed_number, check_in_date, check_out_date, status, property_guests(name)',
        )
        .in('room_id', roomIds)
        .neq('status', 'Cancelada')
      reservations = resv || []
    }
    const active = reservations.filter(
      (r: any) => r.check_in_date <= today && r.check_out_date >= today,
    )
    const byCity: any = {}
    for (const p of props || []) {
      const city = p.city || 'Sem cidade'
      byCity[city] = byCity[city] || { properties: 0, rooms: 0, occupied: 0 }
      byCity[city].properties += 1
      const pRooms = (rooms || []).filter((r: any) => r.property_id === p.id)
      byCity[city].rooms += pRooms.length
      byCity[city].occupied += active.filter((r: any) =>
        pRooms.some((rm: any) => rm.id === r.room_id),
      ).length
    }
    const answer =
      `**Gestão de Imóveis — ocupação hoje (${today})**\n\n` +
      `Total: ${props?.length || 0} imóveis, ${(rooms || []).length} quartos, ${active.length} ocupações ativas.\n\n` +
      Object.entries(byCity)
        .map(
          ([city, v]: any) =>
            `- ${city}: ${v.properties} imóveis, ${v.rooms} quartos, ${v.occupied} ocupados`,
        )
        .join('\n') +
      '\n\n**Ocupações ativas:**\n' +
      (active
        .slice(0, 15)
        .map((r: any) => {
          const room = (rooms || []).find((rm: any) => rm.id === r.room_id)
          const prop = (props || []).find((p: any) => p.id === room?.property_id)
          return `- ${prop?.city || '?'}/${prop?.name || '?'} — quarto ${room?.name || '?'}: ${r.property_guests?.name || '—'}, ${r.check_in_date} → ${r.check_out_date}`
        })
        .join('\n') || '(nenhuma)') +
      '\n\nDados do módulo de Gestão de Imóveis. 😊'
    return { answer, sources: [{ type: 'aurea', ref: 'Gestão de Imóveis' }] }
  }

  if (matchesTarefas(normalizeForCache(question))) {
    const { data: tks } = await admin
      .from('tasks')
      .select(
        'id, title, due_date, created_at, task_statuses(name, is_terminal), plants(name, city)',
      )
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(300)
    const list = tks || []
    if (!list.length) {
      return {
        answer:
          '**Gestão de Tarefas**\n\nNão há chamados registrados para este cliente no momento. Quando houver, eu te mostro o resumo aqui! 😊',
        sources: [{ type: 'aurea', ref: 'Gestão de Tarefas — sem registros' }],
      }
    }
    const byStatus: any = {}
    for (const t of list) {
      const s = t.task_statuses?.name || 'Sem status'
      byStatus[s] = (byStatus[s] || 0) + 1
    }
    const open = list.filter((t: any) => !t.task_statuses?.is_terminal)
    const answer =
      '**Gestão de Tarefas — chamados**\n\n' +
      `Total recentes: ${list.length} | Em aberto: ${open.length}\n\n` +
      Object.entries(byStatus)
        .map(([s, n]) => `- ${s}: ${n}`)
        .join('\n') +
      '\n\n**Últimos 10:**\n' +
      list
        .slice(0, 10)
        .map(
          (t: any) =>
            `- [${t.task_statuses?.name || '?'}] ${t.title || '(sem título)'} — ${t.plants?.name || '?'}${t.due_date ? ' | prazo ' + t.due_date : ''}`,
        )
        .join('\n') +
      '\n\nDados do módulo de Gestão de Tarefas. 😊'
    return { answer, sources: [{ type: 'aurea', ref: 'Gestão de Tarefas' }] }
  }

  return null
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

  // ===== OPERAÇÕES DE SERVIÇO do indexador (Maestro) — autentica pelo callback secret =====
  if (body?.action === 'facilita_index' && body.secret === FACILITA_CALLBACK_SECRET) {
    const op = body.op
    if (op === 'queue') {
      const { data, error } = await admin
        .from('facilita_documents')
        .select('id, title, file_urls, client_id, status')
        .in('status', ['pending', 'analyzing'])
        .order('created_at', { ascending: true })
        .limit(10)
      if (error) return jsonRes({ error: error.message }, 500)
      return jsonRes({ success: true, documents: data || [] })
    }
    if (op === 'commit') {
      const documentId = body.document_id
      if (!documentId) return jsonRes({ error: 'Missing document_id' }, 400)
      const chunks = Array.isArray(body.chunks) ? body.chunks : []
      if (chunks.length === 0) {
        await admin
          .from('facilita_documents')
          .update({
            status: 'failed',
            status_message: String(body.error || 'Nenhum trecho extraído do documento.').slice(
              0,
              300,
            ),
          })
          .eq('id', documentId)
        return jsonRes({ success: true })
      }
      await admin.from('facilita_chunks').delete().eq('document_id', documentId)
      const rows = chunks.map((c: any, i: number) => ({
        document_id: documentId,
        client_id: body.client_id,
        chunk_index: typeof c.chunk_index === 'number' ? c.chunk_index : i,
        content: String(c.content || '').slice(0, 8000),
        keywords: Array.isArray(c.keywords) ? c.keywords.slice(0, 20) : [],
      }))
      for (let i = 0; i < rows.length; i += 50) {
        const { error } = await admin.from('facilita_chunks').insert(rows.slice(i, i + 50))
        if (error) return jsonRes({ error: error.message }, 500)
      }
      await admin
        .from('facilita_documents')
        .update({
          status: 'indexed',
          status_message: `Indexado: ${rows.length} trechos na base do Facilita.`,
          indexed_at: new Date().toISOString(),
        })
        .eq('id', documentId)
      return jsonRes({ success: true, chunks: rows.length })
    }
    if (op === 'clear-cache') {
      const cid = body.client_id
      if (!cid) return jsonRes({ error: 'Missing client_id' }, 400)
      const { error } = await admin.from('facilita_answer_cache').delete().eq('client_id', cid)
      if (error) return jsonRes({ error: error.message }, 500)
      return jsonRes({ success: true, cleared: true })
    }
    return jsonRes({ error: 'op inválida (use queue, commit ou clear-cache)' }, 400)
  }

  // ===== CALLBACK do Maestro (Facilita): resposta do chat OU dados extraídos do POP =====
  if (body?.action === 'callback') {
    if (!FACILITA_CALLBACK_SECRET || body.callback_secret !== FACILITA_CALLBACK_SECRET) {
      return jsonRes({ error: 'Não autorizado' }, 401)
    }

    // --- callback de EXTRAÇÃO de dados do documento (document_id) ---
    if (body.document_id && !body.conversation_id) {
      const title = String(body.title || '')
        .trim()
        .slice(0, 300)
      if (!title) {
        await admin
          .from('facilita_documents')
          .update({
            status: 'failed',
            status_message:
              'Não consegui extrair os dados do documento — preencha manualmente e confirme.',
          })
          .eq('id', body.document_id)
      } else {
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
          .eq('id', body.document_id)
      }
      return jsonRes({ success: true })
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

    // FRENTE 2: cacheia resposta de CONHECIMENTO (fontes só pop/know-how/web) para reuso
    try {
      const answeredByLocal = body.answered_by_local === true
      const knowledgeOnly =
        !answeredByLocal &&
        sources.length > 0 &&
        sources.every((s: any) => ['pop', 'know-how', 'web'].includes(String(s.type)))
      if (knowledgeOnly) {
        const { data: lastUser } = await admin
          .from('facilita_messages')
          .select('content')
          .eq('conversation_id', conversationId)
          .eq('role', 'user')
          .order('created_at', { ascending: false })
          .limit(1)
        const q = lastUser?.[0]?.content
        if (q) {
          const { data: convRow } = await admin
            .from('facilita_conversations')
            .select('client_id')
            .eq('id', conversationId)
            .maybeSingle()
          if (convRow?.client_id) {
            await admin.from('facilita_answer_cache').upsert(
              {
                client_id: convRow.client_id,
                question: String(q).slice(0, 4000),
                question_norm: normalizeForCache(q),
                answer,
                sources,
              },
              { onConflict: 'client_id,question_norm' },
            )
          }
        }
      }
    } catch (_e) {
      // cache é otimização — falha não afeta a resposta
    }

    return jsonRes({ success: true })
  }

  // ===== PEDIDO de extração de dados do documento (chamado pelo frontend ao anexar) =====
  if (body?.document_id && !body?.action) {
    try {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) return jsonRes({ error: 'Missing Authorization header' }, 401)

      const documentId = body.document_id
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

    // Base de conhecimento: trechos de POPs relevantes à pergunta (service role, todos os clients)
    let kbContext = ''
    try {
      const qWords = String(question)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3)
      const { data: chunks } = await admin
        .from('facilita_chunks')
        .select('content, keywords, document_id')
        .eq('client_id', conv.client_id)
        .limit(400)
      const { data: docs } = await admin
        .from('facilita_documents')
        .select('id, title, revision')
        .eq('client_id', conv.client_id)
      const docMap = new Map((docs || []).map((d: any) => [d.id, d]))
      const scored = (chunks || [])
        .map((c: any) => {
          const hay = String(c.content)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
          let score = 0
          for (const w of qWords) if (hay.includes(w)) score += 1
          for (const k of c.keywords || []) if (qWords.includes(String(k))) score += 2
          return { c, score }
        })
        .filter((s: any) => s.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5) // DIETA: 5 trechos em vez de 8
      if (scored.length > 0) {
        kbContext = scored
          .map((s: any) => {
            const doc = docMap.get(s.c.document_id)
            const ref = doc
              ? `${doc.title}${doc.revision ? ' (' + doc.revision + ')' : ''}`
              : 'documento'
            return `--- ${ref} ---\n${String(s.c.content).slice(0, 800)}`
          })
          .join('\n\n')
      }
    } catch (_e) {
      // KB indisponível não bloqueia a resposta
    }

    // ===== MÓDULOS DO AUREA: contexto real de imóveis, tarefas, manutenção etc. =====
    let modulesContext = ''
    try {
      const q = String(question)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

      // --- Gestão de Imóveis: ocupação por cidade/quarto/hóspede ---
      if (
        /(imovel|imoveis|quarto|quartos|hosped|hospede|ocupac|reserva|propriedade|pousada|cidade)/.test(
          q,
        )
      ) {
        const { data: props } = await admin
          .from('properties')
          .select('id, name, city, address')
          .eq('client_id', conv.client_id)
        const propIds = (props || []).map((p: any) => p.id)
        if (propIds.length > 0) {
          const { data: rooms } = await admin
            .from('property_rooms')
            .select('id, name, capacity, property_id')
            .in('property_id', propIds)
          const roomIds = (rooms || []).map((r: any) => r.id)
          const today = new Date().toISOString().slice(0, 10)
          let reservations: any[] = []
          if (roomIds.length > 0) {
            const { data: resv } = await admin
              .from('property_reservations')
              .select(
                'id, room_id, bed_number, check_in_date, check_out_date, status, property_guests(name)',
              )
              .in('room_id', roomIds)
              .neq('status', 'Cancelada')
            reservations = resv || []
          }
          const activeRes = reservations.filter(
            (r: any) => r.check_in_date <= today && r.check_out_date >= today,
          )
          const byCity: any = {}
          for (const p of props || []) {
            const city = p.city || 'Sem cidade'
            byCity[city] = byCity[city] || { properties: 0, rooms: 0, occupied: 0 }
            byCity[city].properties += 1
            const pRooms = (rooms || []).filter((r: any) => r.property_id === p.id)
            byCity[city].rooms += pRooms.length
            byCity[city].occupied += activeRes.filter((r: any) =>
              pRooms.some((rm: any) => rm.id === r.room_id),
            ).length
          }
          modulesContext +=
            '\n\n=== GESTÃO DE IMÓVEIS (dados atuais) ===\n' +
            `Total: ${props?.length || 0} imóveis, ${(rooms || []).length} quartos, ${activeRes.length} ocupações ativas hoje (${today}).\n` +
            Object.entries(byCity)
              .map(
                ([city, v]: any) =>
                  `- ${city}: ${v.properties} imóveis, ${v.rooms} quartos, ${v.occupied} ocupados hoje`,
              )
              .join('\n') +
            '\nOcupações ativas (quarto — hóspede, check-in → check-out):\n' +
            (activeRes
              .slice(0, 15)
              .map((r: any) => {
                const room = (rooms || []).find((rm: any) => rm.id === r.room_id)
                const prop = (props || []).find((p: any) => p.id === room?.property_id)
                const guest = r.property_guests?.name || '—'
                return `- ${prop?.city || '?'}/${prop?.name || '?'} — quarto ${room?.name || '?'} (leito ${r.bed_number ?? '-'}): ${guest}, ${r.check_in_date} → ${r.check_out_date}`
              })
              .join('\n') || '(nenhuma)')
        }
      }

      // --- Gestão de Tarefas: chamados por status ---
      if (
        /(tarefa|tarefas|chamado|chamados|solicitac|ticket|ordem|servico|demanda|pendenc)/.test(q)
      ) {
        const { data: tks } = await admin
          .from('tasks')
          .select(
            'id, title, description, due_date, created_at, task_statuses(name, is_terminal), task_types(name), plants(name, city)',
          )
          .eq('client_id', conv.client_id)
          .order('created_at', { ascending: false })
          .limit(300)
        const list = tks || []
        const byStatus: any = {}
        for (const t of list) {
          const s = t.task_statuses?.name || 'Sem status'
          byStatus[s] = (byStatus[s] || 0) + 1
        }
        const open = list.filter((t: any) => !t.task_statuses?.is_terminal)
        modulesContext +=
          `\n\n=== GESTÃO DE TAREFAS (chamados) ===\nTotal recentes: ${list.length} | Em aberto (não terminal): ${open.length}\n` +
          Object.entries(byStatus)
            .map(([s, n]) => `- ${s}: ${n}`)
            .join('\n') +
          '\nÚltimos 10 chamados:\n' +
          list
            .slice(0, 10)
            .map(
              (t: any) =>
                `- [${t.task_statuses?.name || '?'}] ${t.title || t.description?.slice(0, 60) || '(sem título)'} — ${t.plants?.name || '?'}${t.plants?.city ? '/' + t.plants.city : ''}${t.due_date ? ' | prazo ' + t.due_date : ''}`,
            )
            .join('\n')
      }
    } catch (_e) {
      // módulos indisponíveis não bloqueiam a resposta
    }

    // Budget: resumo real (orçado vs realizado) do client, para perguntas de custos
    let budgetContext = ''
    try {
      // DIETA: consulta pesada (até 2000 linhas) só quando a pergunta é de custos;
      // fora disso pula direto para o catch e budgetContext fica vazio.
      if (!matchesBudget(normalizeForCache(question))) throw new Error('skip-budget-context')
      const { data: entries } = await admin
        .from('budget_entries')
        .select(
          'reference_month, budgeted_amount, realized_amount, forecast_amount, budget_accounts(name), budget_cost_centers(name)',
        )
        .eq('client_id', conv.client_id)
        .order('reference_month')
        .limit(2000)
      if (entries && entries.length > 0) {
        const byMonth: any = {}
        const byAccount: any = {}
        const byCC: any = {}
        for (const e of entries) {
          const m = e.reference_month
          byMonth[m] = byMonth[m] || { b: 0, r: 0 }
          byMonth[m].b += Number(e.budgeted_amount) || 0
          byMonth[m].r += Number(e.realized_amount) || 0
          const acc = e.budget_accounts?.name || 'Desconhecida'
          byAccount[acc] = byAccount[acc] || { b: 0, r: 0 }
          byAccount[acc].b += Number(e.budgeted_amount) || 0
          byAccount[acc].r += Number(e.realized_amount) || 0
          const ccName = e.budget_cost_centers?.name || 'Sem centro de custo'
          byCC[ccName] = byCC[ccName] || { b: 0, r: 0 }
          byCC[ccName].b += Number(e.budgeted_amount) || 0
          byCC[ccName].r += Number(e.realized_amount) || 0
        }
        const months = Object.keys(byMonth).sort()
        budgetContext =
          'RESUMO DO BUDGET (orçado vs realizado):\n' +
          months
            .map(
              (m) =>
                `- ${m}: orçado R$ ${byMonth[m].b.toFixed(2)} | realizado R$ ${byMonth[m].r.toFixed(2)}`,
            )
            .join('\n') +
          '\n\nTOP CONTAS POR % REALIZADO/ORÇADO:\n' +
          Object.entries(byAccount)
            .map(([n, v]: any) => ({ n, ...v, pct: v.b > 0 ? (v.r / v.b) * 100 : 0 }))
            .sort((a: any, b: any) => b.pct - a.pct)
            .slice(0, 8)
            .map(
              (a: any) =>
                `- ${a.n}: ${a.pct.toFixed(1)}% (orçado R$ ${a.b.toFixed(2)}, realizado R$ ${a.r.toFixed(2)})`,
            )
            .join('\n') +
          '\n\nCENTROS DE CUSTO (top por % realizado):\n' +
          Object.entries(byCC)
            .map(([n, v]: any) => ({ n, ...v, pct: v.b > 0 ? (v.r / v.b) * 100 : 0 }))
            .sort((a: any, b: any) => b.pct - a.pct)
            .slice(0, 8)
            .map(
              (c: any) =>
                `- ${c.n}: ${c.pct.toFixed(1)}% (orçado R$ ${c.b.toFixed(2)}, realizado R$ ${c.r.toFixed(2)})${c.r > c.b ? ' — ESTOUROU' : ''}`,
            )
            .join('\n')
      }
    } catch (_e) {
      // budget indisponível não bloqueia a resposta
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
      .slice(-6) // DIETA: 6 mensagens em vez de 10
      .map(
        (m: any) =>
          `${m.role === 'user' ? 'Usuário' : 'Facilita'}: ${String(m.content).slice(0, 300)}`,
      )
      .join('\n')

    // ===== FRENTE 1/2: respostas locais (0 tokens) =====
    let localReply: { answer: string; sources: any[] } | null = null
    let answeredByLocal = false
    try {
      // FRENTE 2: cache de respostas de conhecimento (pg_trgm >= 0.85, TTL 30 dias)
      const { data: cached } = await admin.rpc('facilita_cache_lookup', {
        p_client: conv.client_id,
        p_qnorm: normalizeForCache(question),
      })
      const hit = Array.isArray(cached) && cached.length > 0 ? cached[0] : null
      if (hit?.answer) {
        localReply = { answer: String(hit.answer), sources: hit.sources || [] }
        answeredByLocal = true
      }
      // FRENTE 1: perguntas de dados → resposta determinística (nunca cacheada)
      if (!localReply) {
        localReply = await localAnswer(admin, conv.client_id, question)
      }
    } catch (_e) {
      // respostas locais indisponíveis não bloqueiam o fluxo do Maestro
    }

    // grava a pergunta do usuário + placeholder do assistente
    await admin.from('facilita_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: String(question).slice(0, 4000),
      status: 'sent',
    })

    if (localReply) {
      await admin.from('facilita_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: localReply.answer,
        sources: localReply.sources,
        status: 'sent',
      })
      return jsonRes({ success: true, answered_by: 'local', answered_by_local: true })
    }

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
      kb_context: kbContext,
      budget_context: budgetContext,
      modules_context: modulesContext,
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
