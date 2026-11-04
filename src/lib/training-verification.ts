import { supabase } from '@/lib/supabase/client'

/**
 * Critério ÚNICO de "lista de presença validada pelo agente" — usado tanto pela
 * badge (VerificationBadge via verification_status) quanto pelo portão de
 * salvamento (Cadastros onAdd/onUpdate). A badge fica verde exatamente quando
 * verification_status === 'verified'; o save não pode exigir nada além disso.
 */
export function isListValidated(tr?: any): boolean {
  return !!tr && tr.verification_status === 'verified'
}

export type TrainingVerificationResult = {
  ok: boolean
  status?: 'pending' | 'analyzing' | 'verified' | 'rejected' | 'failed'
  notes?: string
  signed_name?: string
  confidence?: number
  completion_date?: string
  error?: string
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-training-presence`

async function callFn(payload: Record<string, unknown>): Promise<any> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) {
    return { success: false, error: 'Sessão expirada — faça login novamente.' }
  }
  try {
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      },
      body: JSON.stringify(payload),
    })
    return await res.json().catch(() => ({ success: false, error: `Erro ${res.status}` }))
  } catch (e: any) {
    return { success: false, error: e?.message || 'Falha na verificação' }
  }
}

/**
 * Verificação por job avulso (no momento do ANEXO, antes de salvar o colaborador).
 * Cria o job, aciona o agente e faz polling até o resultado.
 */
export async function verifyByJob(params: {
  documentUrl: string
  trainingName: string
  employeeName?: string
  timeoutMs?: number
}): Promise<TrainingVerificationResult> {
  // Teto longo: a análise de um dossiê pode levar alguns minutos; desistir cedo
  // fazia o usuário ver "tempo esgotado" com a lista correta.
  const { documentUrl, trainingName, employeeName = '', timeoutMs = 900000 } = params

  const ins = await supabase
    .from('training_verification_jobs')
    .insert({
      document_url: documentUrl,
      training_name: trainingName,
      employee_name: employeeName,
      status: 'analyzing',
    })
    .select('id')
    .single()
  if (ins.error || !ins.data) {
    return { ok: false, status: 'failed', notes: 'Falha ao criar verificação.' }
  }
  const jobId = (ins.data as any).id

  const start = await callFn({ job_id: jobId })
  if (!start?.success) {
    await supabase.from('training_verification_jobs').delete().eq('id', jobId)
    return { ok: false, status: 'failed', notes: start?.error || 'Falha ao acionar conferência.' }
  }

  // A análise de um dossiê multi-página é naturalmente lenta (o agente lê o arquivo
  // uma vez e responde todos os treinamentos). Por isso NÃO desistimos nem apagamos
  // o job: continuamos esperando até o resultado chegar (teto de segurança longo)
  // e, se a entrega falhar de verdade, re-acionamos o pedido uma vez.
  const deadline = Date.now() + timeoutMs
  let nextRetryAt = Date.now() + 180000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000))
    const { data } = await supabase
      .from('training_verification_jobs')
      .select('status, notes, signed_name, confidence, completion_date')
      .eq('id', jobId)
      .single()
    const row = data as any
    if (
      row &&
      (row.status === 'verified' || row.status === 'rejected' || row.status === 'failed')
    ) {
      // job é descartável: o resultado já está em mãos
      supabase.from('training_verification_jobs').delete().eq('id', jobId)
      return {
        ok: row.status === 'verified',
        status: row.status,
        notes: row.notes || undefined,
        signed_name: row.signed_name || undefined,
        confidence: row.confidence ?? undefined,
        completion_date: row.completion_date || undefined,
      }
    }
    // a cada 3 min sem resposta, garante que o pedido está vivo (retry limitado)
    if (Date.now() >= nextRetryAt) {
      nextRetryAt = Date.now() + 180000
      await callFn({ job_id: jobId })
    }
  }
  // NÃO apagar o job: manter para o resultado tardio aparecer no selo ao recarregar.
  return {
    ok: false,
    status: 'failed',
    notes:
      'A conferência está demorando mais que o normal — o resultado aparecerá no selo assim que ficar pronto. Recarregue a página em instantes.',
  }
}

/**
 * Espera o resultado de uma conferência já pedida (job por document_url), sem
 * disparar nada novo. Usado no SALVAR: se a lista ainda está em análise, o
 * cadastro espera o veredito em vez de falhar com "tempo esgotado".
 */
export async function awaitPendingVerification(
  documentUrl: string,
  timeoutMs = 300000,
): Promise<TrainingVerificationResult | null> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const { data } = await supabase
      .from('training_verification_jobs')
      .select('status, notes, signed_name, confidence, completion_date')
      .eq('document_url', documentUrl)
      .order('created_at', { ascending: false })
      .limit(1)
    const row = (data || [])[0] as any
    if (row && (row.status === 'verified' || row.status === 'rejected')) {
      return {
        ok: row.status === 'verified',
        status: row.status,
        notes: row.notes || undefined,
        signed_name: row.signed_name || undefined,
        confidence: row.confidence ?? undefined,
        completion_date: row.completion_date || undefined,
      }
    }
    await new Promise((r) => setTimeout(r, 3000))
  }
  return null
}

/**
 * Verificação de registro salvo (usado na tela Treinamentos e no re-check ao salvar).
 */
export async function verifyTrainingPresence(
  recordId: string,
): Promise<TrainingVerificationResult> {
  const start = await callFn({ record_id: recordId })
  if (!start?.success) {
    return { ok: false, status: 'failed', notes: start?.error || 'Falha ao acionar conferência.' }
  }
  const deadline = Date.now() + 900000
  let nextRetryAt = Date.now() + 180000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000))
    const { data } = await supabase
      .from('employee_training_records')
      .select(
        'verification_status, verification_notes, verification_signed_name, verification_confidence, completion_date',
      )
      .eq('id', recordId)
      .single()
    const row = data as any
    if (
      row &&
      row.verification_status !== 'analyzing' &&
      row.verification_status !== 'pending' &&
      row.verification_status !== null
    ) {
      return {
        ok: row.verification_status === 'verified',
        status: row.verification_status,
        notes: row.verification_notes || undefined,
        signed_name: row.verification_signed_name || undefined,
        confidence: row.verification_confidence ?? undefined,
        completion_date: row.completion_date || undefined,
      }
    }
    if (Date.now() >= nextRetryAt) {
      nextRetryAt = Date.now() + 180000
      await callFn({ record_id: recordId })
    }
  }
  return { ok: false, status: 'failed', notes: 'A conferência está demorando mais que o normal.' }
}
