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
  // 1. Buscar todos os vínculos de plantas em org_collaborator_plants para o cliente (com paginação 1.000)
  const allPlantsRelations: any[] = []
  const relPageSize = 1000
  let relPage = 0
  let relHasMore = true

  while (relHasMore) {
    const start = relPage * relPageSize
    const end = start + relPageSize - 1

    const { data, error } = await supabase
      .from('org_collaborator_plants' as any)
      .select('collaborator_id, plant_id, plants(id, name)')
      .eq('client_id', clientId)
      .range(start, end)

    if (error) {
      // Se a tabela ainda não estiver disponível por algum motivo, não travar
      console.warn('org_collaborator_plants select warning:', error)
      break
    }

    if (data && data.length > 0) {
      allPlantsRelations.push(...data)
      relPage++
    }
    if (!data || data.length < relPageSize) {
      relHasMore = false
    }
  }

  // Agrupar plantas por colaborador
  const plantsByCollabId = new Map<string, { id: string; name: string }[]>()
  for (const rel of allPlantsRelations) {
    const cid = rel.collaborator_id
    if (!plantsByCollabId.has(cid)) {
      plantsByCollabId.set(cid, [])
    }
    if (rel.plants) {
      plantsByCollabId.get(cid)!.push({
        id: rel.plants.id,
        name: rel.plants.name,
      })
    } else if (rel.plant_id) {
      plantsByCollabId.get(cid)!.push({
        id: rel.plant_id,
        name: '',
      })
    }
  }

  // 2. Buscar todos os colaboradores ativos
  const allRows: any[] = []
  const pageSize = 1000
  let page = 0
  let hasMore = true

  while (hasMore) {
    const start = page * pageSize
    const end = start + pageSize - 1

    const query = supabase
      .from('org_collaborators')
      .select('*, org_functions(id, name), org_units(id, name), plants(id, name)')
      .eq('client_id', clientId)
      .not('is_active', 'eq', false)
      .order('name', { ascending: true })

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

  // Anexar lista de plantas a cada colaborador (incluindo retrocompatibilidade com c.plant_id)
  const enriched = allRows.map((c) => {
    const linkedPlants = plantsByCollabId.get(c.id) || []
    // Se não tiver registros na tabela N:N mas tiver plant_id legada, adicionar
    if (linkedPlants.length === 0 && c.plant_id) {
      linkedPlants.push({
        id: c.plant_id,
        name: c.plants?.name || '',
      })
    }
    const plantIds = Array.from(new Set(linkedPlants.map((p) => p.id)))
    return {
      ...c,
      plants_list: linkedPlants,
      plant_ids: plantIds,
    }
  })

  // 3. Filtrar por plantId se especificado
  if (Array.isArray(plantId)) {
    if (plantId.length === 0) {
      return []
    }
    return enriched.filter((c) => {
      // Retorna o colaborador se QUALQUER uma de suas plantas estiver na lista permitida
      return (
        c.plant_ids.some((id: string) => plantId.includes(id)) ||
        (c.plant_id && plantId.includes(c.plant_id))
      )
    })
  } else if (plantId && plantId !== 'all') {
    return enriched.filter((c) => {
      // Retorna o colaborador se for responsável pela planta filtrada
      return c.plant_ids.includes(plantId) || c.plant_id === plantId
    })
  }

  return enriched
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

export const saveOrgCollaborator = async (collab: any, plantIds?: string[]) => {
  // Salva o colaborador na tabela org_collaborators
  // Mantemos plant_id preenchido com a primeira planta selecionada (se houver) para retrocompatibilidade
  const payload = { ...collab }
  if (plantIds && plantIds.length > 0) {
    payload.plant_id = plantIds[0]
  } else if (plantIds && plantIds.length === 0) {
    payload.plant_id = null
  }

  const { data, error } = await supabase.from('org_collaborators').upsert(payload).select().single()
  if (error) throw error

  // Sincronizar vínculos em org_collaborator_plants se plantIds foi fornecido
  if (plantIds && data?.id && data?.client_id) {
    // 1. Deletar vínculos atuais deste colaborador
    const { error: delError } = await supabase
      .from('org_collaborator_plants' as any)
      .delete()
      .eq('collaborator_id', data.id)
    if (delError) console.warn('Erro ao atualizar vínculos anteriores de plantas:', delError)

    // 2. Inserir novos vínculos
    const uniqueIds = Array.from(new Set(plantIds.filter(Boolean)))
    if (uniqueIds.length > 0) {
      const rowsToInsert = uniqueIds.map((pid) => ({
        collaborator_id: data.id,
        plant_id: pid,
        client_id: data.client_id,
      }))
      const { error: insError } = await supabase
        .from('org_collaborator_plants' as any)
        .insert(rowsToInsert)
      if (insError) throw insError
    }
  }

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
