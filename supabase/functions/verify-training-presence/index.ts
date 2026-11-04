import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Conferência de lista de presença via MAESTRO (Chico) — sem chave de IA externa.
// Fluxo: POST {record_id} OU {job_id} → aciona webhook do Maestro →
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
    const jobId = body.job_id

    // ===== CALLBACK EM LOTE =====
    // results: [{job_id, status, notes, signed_name, confidence, completion_date}, ...]
    if (Array.isArray(body?.results) && body.results.length > 0) {
      let n = 0
      for (const r of body.results) {
        if (!r?.job_id) continue
        const st = r.status === 'verified' ? 'verified' : 'rejected'
        const jp: any = {
          status: st,
          notes: String(r.notes || '').slice(0, 500),
          signed_name: String(r.signed_name || '').slice(0, 200),
          confidence: typeof r.confidence === 'number' ? r.confidence : 50,
          updated_at: new Date().toISOString(),
        }
        const cd = String(r.completion_date || '').match(/^\d{4}-\d{2}-\d{2}$/)
        if (cd) jp.completion_date = r.completion_date
        const { error } = await admin
          .from('training_verification_jobs')
          .update(jp)
          .eq('id', r.job_id)
        if (!error) n++
      }
      return jsonRes({ success: true, updated: n })
    }

    if (!recordId && !jobId) return jsonRes({ error: 'Missing record_id/job_id' }, 400)

    const status = body.status === 'verified' ? 'verified' : 'rejected'
    const payload = {
      verification_status: status,
      verification_notes: String(body.notes || '').slice(0, 500),
      verification_signed_name: String(body.signed_name || '').slice(0, 200),
      verification_confidence: typeof body.confidence === 'number' ? body.confidence : 50,
      verified_at: new Date().toISOString(),
    }
    // Data de conclusão extraída da lista (se veio no callback)
    const completionDate = String(body.completion_date || '').match(/^\d{4}-\d{2}-\d{2}$/)
      ? body.completion_date
      : null
    if (completionDate) {
      ;(payload as any).completion_date = completionDate
    }

    if (recordId) {
      await admin.from('employee_training_records').update(payload).eq('id', recordId)
    }
    if (jobId) {
      const jobPayload: any = {
        status: status,
        notes: payload.verification_notes,
        signed_name: payload.verification_signed_name,
        confidence: payload.verification_confidence,
        updated_at: new Date().toISOString(),
      }
      if (completionDate) jobPayload.completion_date = completionDate
      await admin.from('training_verification_jobs').update(jobPayload).eq('id', jobId)
    }

    return jsonRes({ success: true })
  }

  // ===== PEDIDO de conferência (chamado pelo frontend) =====
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonRes({ error: 'Missing Authorization header' }, 401)

    const recordId = body?.record_id
    const jobId = body?.job_id
    if (!recordId && !jobId) return jsonRes({ error: 'Missing record_id ou job_id' }, 400)

    let documentUrl = ''
    let trainingName = ''
    let employeeName = ''

    if (recordId) {
      const { data: rec, error: recErr } = await admin
        .from('employee_training_records')
        .select('id, document_url, employees(name), trainings(name)')
        .eq('id', recordId)
        .single()
      if (recErr || !rec) return jsonRes({ error: 'Registro de treinamento não encontrado' }, 404)
      if (!(rec as any).document_url) {
        return jsonRes({ error: 'Registro sem documento anexado' }, 400)
      }
      documentUrl = (rec as any).document_url
      trainingName = (rec as any).trainings?.name || ''
      employeeName = (rec as any).employees?.name || ''
    } else {
      const { data: job, error: jobErr } = await admin
        .from('training_verification_jobs')
        .select('*')
        .eq('id', jobId)
        .single()
      if (jobErr || !job) return jsonRes({ error: 'Job de verificação não encontrado' }, 404)
      documentUrl = (job as any).document_url
      trainingName = (job as any).training_name || ''
      employeeName = (job as any).employee_name || ''
    }

    // Falha que deve ser registrada no registro e/ou no job
    const markFail = async (notes: string) => {
      if (recordId) {
        await admin
          .from('employee_training_records')
          .update({
            verification_status: 'failed',
            verification_notes: notes,
            verified_at: new Date().toISOString(),
          })
          .eq('id', recordId)
      }
      if (jobId) {
        await admin
          .from('training_verification_jobs')
          .update({ status: 'failed', notes, updated_at: new Date().toISOString() })
          .eq('id', jobId)
      }
    }

    // Resolve caminhos legados (sem URL completa) para a URL pública do bucket
    if (!/^https?:\/\//i.test(documentUrl)) {
      let cleanPath = String(documentUrl)
        .replace(/^documents\//, '')
        .replace(/^training-documents\//, '')
        .replace(/^\//, '')
      const base = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')
      const uuidPrefix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i.test(
        cleanPath,
      )
      const candidates = uuidPrefix
        ? [`${base}/storage/v1/object/public/training-documents/${cleanPath}`]
        : [
            `${base}/storage/v1/object/public/training-documents/${cleanPath}`,
            `${base}/storage/v1/object/public/training-documents/trainings/${cleanPath}`,
          ]
      let ok = false
      for (const c of candidates) {
        const r = await fetch(c, { method: 'HEAD' })
        if (r.ok) {
          ok = true
          documentUrl = c
          break
        }
      }
      if (!ok) {
        await markFail('Documento não encontrado no repositório (caminho antigo).')
        return jsonRes({ error: 'Documento não encontrado no repositório' }, 404)
      }
    }

    const webhookUrl = CHICO_WEBHOOK_URL
    const webhookSecret = CHICO_WEBHOOK_SECRET
    const cbSecret = CHICO_CALLBACK_SECRET
    if (!webhookUrl || !webhookSecret || !cbSecret) {
      await markFail('Integração de conferência (Maestro) não configurada.')
      return jsonRes({ error: 'Integração de conferência não configurada' }, 500)
    }

    // ===== LOTE POR DOCUMENTO =====
    // Um mesmo dossiê gera vários jobs (um por treinamento) e o MESMO arquivo pode
    // ser reenviado com URL diferente. Analisar o mesmo PDF N vezes deixa a fila
    // lentíssima (>20 min) e estoura o tempo do usuário. Aqui juntamos todos os jobs
    // pendentes cujo CONTEÚDO é o mesmo (hash do arquivo) num pedido só: o agente lê
    // o documento UMA vez e responde todos os itens.
    const batchJobs: Array<{
      job_id: string
      training_name: string
      employee_name: string
    }> = []
    if (jobId) {
      // Pequena espera: o usuário anexa as listas do mesmo dossiê em sequência.
      await new Promise((r) => setTimeout(r, 6000))

      // Hash do conteúdo deste documento
      let myHash = ''
      try {
        const f = await fetch(documentUrl)
        if (f.ok) {
          const buf = await f.arrayBuffer()
          const digest = await crypto.subtle.digest('SHA-256', buf)
          myHash = Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
        }
      } catch (_e) {
        // sem hash: segue sem lote (nunca bloqueia a conferência)
      }

      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { data: pending } = await admin
        .from('training_verification_jobs')
        .select('id, training_name, employee_name, document_url')
        .eq('status', 'analyzing')
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(40)

      const sameDoc: any[] = []
      for (const p of pending || []) {
        if ((p as any).id === jobId) {
          sameDoc.push(p)
          continue
        }
        const url = (p as any).document_url as string
        if (!url) continue
        if (url === documentUrl) {
          sameDoc.push(p)
          continue
        }
        if (!myHash) continue
        try {
          const r = await fetch(url)
          if (!r.ok) continue
          const b = await r.arrayBuffer()
          const dg = await crypto.subtle.digest('SHA-256', b)
          const h = Array.from(new Uint8Array(dg))
            .map((x) => x.toString(16).padStart(2, '0'))
            .join('')
          if (h === myHash) sameDoc.push(p)
        } catch (_e) {
          // ignora irmão inacessível
        }
      }

      for (const s of sameDoc) {
        batchJobs.push({
          job_id: (s as any).id,
          training_name: (s as any).training_name || '',
          employee_name: (s as any).employee_name || '',
        })
      }
      if (!batchJobs.some((b) => b.job_id === jobId)) {
        batchJobs.unshift({
          job_id: jobId,
          training_name: trainingName,
          employee_name: employeeName,
        })
      }
    }

    // marca o registro (se existir) como em análise
    if (recordId) {
      await admin
        .from('employee_training_records')
        .update({
          verification_status: 'analyzing',
          verification_notes: 'Conferência em andamento.',
          verified_at: new Date().toISOString(),
        })
        .eq('id', recordId)
    }

    // aciona o Maestro (Chico) — com RETRY: a entrega do webhook pode falhar
    // silenciosamente (job fica 'analyzing' para sempre e o usuário não pode salvar).
    const whBody = JSON.stringify({
      record_id: recordId,
      job_id: jobId,
      document_url: documentUrl,
      training_name: trainingName,
      employee_name: employeeName,
      // Lote: demais jobs do MESMO documento (o agente lê o arquivo uma vez só)
      batch_jobs: batchJobs.length > 1 ? batchJobs : undefined,
      callback_url: `${Deno.env.get('SUPABASE_URL') ?? ''}/functions/v1/verify-training-presence`,
      callback_secret: cbSecret,
    })
    let whRes: Response | null = null
    let lastErr = ''
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': webhookSecret,
          },
          body: whBody,
        })
        if (r.ok) {
          whRes = r
          break
        }
        lastErr = `HTTP ${r.status}`
      } catch (e: any) {
        lastErr = String(e?.message || e)
      }
      // espera progressiva antes de tentar de novo (2s, 4s)
      if (attempt < 3) await new Promise((res) => setTimeout(res, attempt * 2000))
    }

    if (!whRes) {
      await markFail(`Falha ao acionar a conferência (${lastErr}). Tente anexar novamente.`)
      return jsonRes({ error: `Falha ao acionar conferência: ${lastErr}` }, 502)
    }

    return jsonRes({ success: true, queued: true })
  } catch (error: any) {
    return jsonRes({ error: String(error?.message || error) }, 500)
  }
})
