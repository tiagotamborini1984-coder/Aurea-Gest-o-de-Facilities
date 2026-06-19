import { supabase } from '@/lib/supabase/client'

export const getOrgUnits = async (clientId: string, plantId?: string) => {
  let query = supabase.from('org_units').select('*').eq('client_id', clientId)
  if (plantId) query = query.eq('plant_id', plantId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const getOrgFunctions = async (clientId: string) => {
  const { data, error } = await supabase.from('org_functions').select('*').eq('client_id', clientId)
  if (error) throw error
  return data || []
}

export const getOrgCollaborators = async (clientId: string, plantId?: string) => {
  let query = supabase.from('org_collaborators').select('*').eq('client_id', clientId)
  // Ensure we only retrieve active collaborators
  query = query.not('is_active', 'eq', false)

  if (plantId) query = query.eq('plant_id', plantId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const saveOrgUnit = async (unit: any) => {
  const { data, error } = await supabase.from('org_units').upsert(unit).select().single()
  if (error) throw error
  return data
}

export const saveOrgFunction = async (func: any) => {
  const { data, error } = await supabase.from('org_functions').upsert(func).select().single()
  if (error) throw error
  return data
}

export const saveOrgCollaborator = async (collab: any) => {
  const { data, error } = await supabase.from('org_collaborators').upsert(collab).select().single()
  if (error) throw error
  return data
}

export const deleteOrgItem = async (
  table: 'org_units' | 'org_functions' | 'org_collaborators',
  id: string,
) => {
  if (table === 'org_collaborators') {
    // Soft delete for org_collaborators to maintain historical references
    const { error } = await supabase
      .from(table as any)
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw error
  } else {
    // Hard delete for other organogram entities
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
  }
}
