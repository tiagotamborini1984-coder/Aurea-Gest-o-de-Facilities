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
  const { data, error } = await (supabase.from('maintenance_tickets') as any)
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
  const { data, error } = await (supabase.from('maintenance_tickets') as any)
    .update(ticket)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

function extractStoragePath(url: string, bucket: string): string | null {
  if (!url || typeof url !== 'string') return null
  const marker = `/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const pathWithParams = url.substring(idx + marker.length)
  return pathWithParams.split('?')[0] || null
}

export async function deleteTicket(id: string): Promise<void> {
  // 1. Fetch ticket to find photos/closure_photos to clean up storage
  const { data: ticket } = await supabase
    .from('maintenance_tickets')
    .select('id, photos, closure_photos')
    .eq('id', id)
    .maybeSingle()

  // 2. Unlink any corrective tickets spawned from this ticket as parent_ticket_id
  await supabase
    .from('maintenance_tickets')
    .update({ parent_ticket_id: null })
    .eq('parent_ticket_id', id)

  // 3. Delete ticket logs explicitly (even if CASCADE is configured, ensures no FK constraint block)
  await supabase.from('maintenance_ticket_logs').delete().eq('ticket_id', id)

  // 4. Delete the ticket itself
  const { error } = await supabase.from('maintenance_tickets').delete().eq('id', id)

  if (error) throw error

  // 5. Clean up attached storage files best-effort if available
  try {
    const filePaths: string[] = []
    const collectPaths = (raw: unknown) => {
      if (Array.isArray(raw)) {
        for (const item of raw) {
          if (typeof item === 'string') {
            const p = extractStoragePath(item, 'maintenance_attachments')
            if (p) filePaths.push(p)
          }
        }
      }
    }
    if (ticket) {
      collectPaths(ticket.photos)
      collectPaths(ticket.closure_photos)
    }
    if (filePaths.length > 0) {
      await supabase.storage.from('maintenance_attachments').remove(filePaths)
    }
  } catch (storageErr) {
    console.warn('Não foi possível remover anexos de armazenamento da OS:', storageErr)
  }
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
