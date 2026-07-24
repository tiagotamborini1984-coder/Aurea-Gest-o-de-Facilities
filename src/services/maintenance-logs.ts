import { supabase } from '@/lib/supabase/client'

export interface MaintenanceTicketLog {
  id: string
  ticket_id: string
  user_id: string | null
  action_type: string
  old_value: string | null
  new_value: string | null
  created_at: string
  user?: { name: string | null } | null
}

export async function fetchTicketLogs(ticketId: string): Promise<MaintenanceTicketLog[]> {
  const { data, error } = await supabase
    .from('maintenance_ticket_logs')
    .select('*, user:profiles!maintenance_ticket_logs_user_id_fkey(name)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as MaintenanceTicketLog[]
}
