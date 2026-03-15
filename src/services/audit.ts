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
