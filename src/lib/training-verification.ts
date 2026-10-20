import { supabase } from '@/lib/supabase/client'

export type TrainingVerificationResult = {
  ok: boolean
  status?: 'pending' | 'verified' | 'rejected' | 'failed'
  notes?: string
  signed_name?: string
  confidence?: number
  error?: string
}

/**
 * Dispara a conferência IA da lista de presença de um registro de treinamento.
 * A Edge Function baixa o documento, analisa com visão (Gemini/OpenAI) e grava
 * verification_status/notes no próprio registro.
 */
export async function verifyTrainingPresence(
  recordId: string,
): Promise<TrainingVerificationResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) {
      return { ok: false, status: 'failed', notes: 'Sessão expirada — faça login novamente.' }
    }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-training-presence`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
        body: JSON.stringify({ record_id: recordId }),
      },
    )
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.success) {
      return {
        ok: false,
        status: 'failed',
        notes: json?.notes,
        error: json?.error || `Erro ${res.status}`,
      }
    }
    return {
      ok: true,
      status: json.status,
      notes: json.notes,
      signed_name: json.signed_name,
      confidence: json.confidence,
    }
  } catch (e: any) {
    return { ok: false, status: 'failed', notes: e?.message || 'Falha na verificação' }
  }
}
