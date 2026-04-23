import { supabase } from '@/lib/supabase/client'

export const getOrgUnits = async (clientId: string) => {
  const { data, error } = await supabase
    .from('org_units' as any)
    .select('*, plants(name)')
    .eq('client_id', clientId)
    .order('name')
  if (error) throw error
  return data
}

export const getOrgFunctions = async (clientId: string) => {
  const { data, error } = await supabase
    .from('org_functions' as any)
    .select('*')
    .eq('client_id', clientId)
    .order('name')
  if (error) throw error
  return data
}

export const getOrgCollaborators = async (clientId: string, plantId?: string) => {
  let query = supabase
    .from('org_collaborators' as any)
    .select(`
      *,
      org_units(name),
      org_functions(name),
      plants(name)
    `)
    .eq('client_id', clientId)
    .order('name')

  if (plantId && plantId !== 'all') {
    query = query.eq('plant_id', plantId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const saveOrgUnit = async (unit: any) => {
  if (unit.id) {
    const { data, error } = await supabase
      .from('org_units' as any)
      .update(unit)
      .eq('id', unit.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('org_units' as any)
      .insert(unit)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export const saveOrgFunction = async (fn: any) => {
  if (fn.id) {
    const { data, error } = await supabase
      .from('org_functions' as any)
      .update(fn)
      .eq('id', fn.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('org_functions' as any)
      .insert(fn)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export const saveOrgCollaborator = async (collab: any) => {
  if (collab.id) {
    const { data, error } = await supabase
      .from('org_collaborators' as any)
      .update(collab)
      .eq('id', collab.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('org_collaborators' as any)
      .insert(collab)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export const deleteOrgItem = async (table: string, id: string) => {
  const { error } = await supabase
    .from(table as any)
    .delete()
    .eq('id', id)
  if (error) throw error
}
