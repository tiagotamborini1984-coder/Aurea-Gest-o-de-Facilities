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
  const { documentUrl, trainingName, employeeName = '', timeoutMs = 240000 } = params

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

  const deadline = Date.now() + timeoutMs
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
  }
  // Tempo esgotado: NÃO apagar o job — o agente pode ainda responder (entrega atrasada).
  // Re-aciona a conferência uma vez (retry do webhook) e estende a espera.
  const retry = await callFn({ job_id: jobId })
  if (retry?.success) {
    const deadline2 = Date.now() + 120000
    while (Date.now() < deadline2) {
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
    }
  }
  supabase.from('training_verification_jobs').delete().eq('id', jobId)
  return { ok: false, status: 'failed', notes: 'Tempo esgotado aguardando a conferência.' }
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
  const deadline = Date.now() + 180000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000))
    const { data } = await supabase
      .from('employee_training_records')
      .select(
        'verification_status, verification_notes, verification_signed_name, verification_confidence',
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
  }
  return { ok: false, status: 'failed', notes: 'Tempo esgotado aguardando a conferência.' }
}
