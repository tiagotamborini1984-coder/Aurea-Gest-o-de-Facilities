import { supabase } from '@/lib/supabase/client'

export interface MaintenanceTicket {
  id?: string
  ticket_number?: string
  client_id?: string
  plant_id?: string
  location_id?: string
  sublocation_id?: string
  asset_id?: string
  type_id?: string
  priority_id?: string
  status_id?: string
  requester_name?: string
  requester_email?: string
  description?: string
  photos?: unknown
  reported_at?: string
  origin?: string
  area_id?: string
}

export interface ImportTicketsResult {
  success: boolean
  inserted: number
  total: number
  errors: Array<{ item: string; error: string }>
}

export async function getTickets(clientId: string, plantId?: string): Promise<MaintenanceTicket[]> {
  let query = supabase
    .from('maintenance_tickets')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (plantId) query = query.eq('plant_id', plantId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createTicket(ticket: MaintenanceTicket): Promise<MaintenanceTicket> {
  const { data, error } = await supabase
    .from('maintenance_tickets')
    .insert(ticket)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTicket(
  id: string,
  ticket: Partial<MaintenanceTicket>,
): Promise<MaintenanceTicket> {
  const { data, error } = await supabase
    .from('maintenance_tickets')
    .update(ticket)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTicket(id: string): Promise<void> {
  const { error } = await supabase.from('maintenance_tickets').delete().eq('id', id)
  if (error) throw error
}

export async function importTickets(
  clientId: string,
  plantId: string,
  tickets: MaintenanceTicket[],
): Promise<ImportTicketsResult> {
  const { data, error } = await supabase.functions.invoke('import-tickets', {
    body: { clientId, plantId, tickets },
  })

  if (error) {
    console.error('Error importing tickets:', error)
    throw new Error(error.message || 'Failed to import tickets')
  }

  return data as ImportTicketsResult
}
