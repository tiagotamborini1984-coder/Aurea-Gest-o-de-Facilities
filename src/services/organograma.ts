import { supabase } from '@/lib/supabase/client'

export const getOrgUnits = async (clientId: string, plantId?: string) => {
  const allRows: any[] = []
  const pageSize = 1000
  let page = 0
  let hasMore = true

  while (hasMore) {
    const start = page * pageSize
    const end = start + pageSize - 1

    let query = supabase
      .from('org_units')
      .select('*')
      .eq('client_id', clientId)
      .order('name', { ascending: true })

    if (plantId && plantId !== 'all') {
      query = query.eq('plant_id', plantId)
    }

    const { data, error } = await query.range(start, end)
    if (error) throw error

    if (data && data.length > 0) {
      allRows.push(...data)
      page++
    }
    if (!data || data.length < pageSize) {
      hasMore = false
    }
  }

  return allRows
}

export const getOrgFunctions = async (clientId: string) => {
  const allRows: any[] = []
  const pageSize = 1000
  let page = 0
  let hasMore = true

  while (hasMore) {
    const start = page * pageSize
    const end = start + pageSize - 1

    const { data, error } = await supabase
      .from('org_functions')
      .select('*')
      .eq('client_id', clientId)
      .order('name', { ascending: true })
      .range(start, end)

    if (error) throw error

    if (data && data.length > 0) {
      allRows.push(...data)
      page++
    }
    if (!data || data.length < pageSize) {
      hasMore = false
    }
  }

  return allRows
}

export const getOrgCollaborators = async (clientId: string, plantId?: string | string[]) => {
  const allRows: any[] = []
  const pageSize = 1000
  let page = 0
  let hasMore = true

  while (hasMore) {
    const start = page * pageSize
    const end = start + pageSize - 1

    let query = supabase
      .from('org_collaborators')
      .select('*, org_functions(id, name), org_units(id, name), plants(id, name)')
      .eq('client_id', clientId)
      .not('is_active', 'eq', false)
      .order('name', { ascending: true })

    if (Array.isArray(plantId)) {
      if (plantId.length === 0) {
        // Se array vazio de plantas autorizadas, não retorna nenhum colaborador
        return []
      }
      query = query.in('plant_id', plantId)
    } else if (plantId && plantId !== 'all') {
      query = query.eq('plant_id', plantId)
    }

    const { data, error } = await query.range(start, end)
    if (error) throw error

    if (data && data.length > 0) {
      allRows.push(...data)
      page++
    }
    if (!data || data.length < pageSize) {
      hasMore = false
    }
  }

  return allRows
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
