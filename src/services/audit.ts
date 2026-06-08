import { supabase } from '@/lib/supabase/client'

export const logAudit = async (
  client_id: string,
  user_id: string,
  action_type: string,
  details: string,
) => {
  await supabase.from('audit_logs').insert({
    client_id,
    user_id,
    action_type,
    details,
  })
}

export const submitAuditExecution = async (
  executionId: string,
  answers: any[],
  participants: string,
  isDraft: boolean = false,
  signatures: any[] = [],
) => {
  const { data, error } = await supabase.rpc('submit_audit_execution', {
    p_execution_id: executionId,
    p_answers: answers,
    p_participants: participants,
    p_is_draft: isDraft,
    p_signatures: signatures,
  })

  if (error) throw error
  return data
}
