import { supabase } from '@/lib/supabase/client'

export interface CleaningGardeningGoal {
  id: string
  client_id: string
  plant_id: string | null
  area_id: string | null
  target_percentage: number
  description?: string | null
  created_at?: string
  updated_at?: string
}

/**
 * Busca todas as metas de limpeza e jardinagem do cliente.
 */
export async function getCleaningGoals(clientId: string): Promise<CleaningGardeningGoal[]> {
  const { data, error } = await supabase
    .from('cleaning_gardening_goals' as any)
    .select('*')
    .eq('client_id', clientId)

  if (error) {
    console.error('Erro ao buscar metas de limpeza e jardinagem:', error)
    return []
  }
  return (data as any) || []
}

/**
 * Salva ou atualiza a meta geral ou por escopo (planta / área).
 * Se target_percentage for null/undefined/NaN, remove a meta correspondente.
 */
export async function upsertCleaningGoal(params: {
  clientId: string
  targetPercentage: number | null
  plantId?: string | null
  areaId?: string | null
  description?: string | null
}): Promise<{ success: boolean; error?: any }> {
  const { clientId, targetPercentage, plantId = null, areaId = null, description = null } = params

  try {
    // Se targetPercentage for null ou vazio, remover a meta existente naquele escopo
    if (
      targetPercentage === null ||
      targetPercentage === undefined ||
      Number.isNaN(targetPercentage)
    ) {
      let query = supabase
        .from('cleaning_gardening_goals' as any)
        .delete()
        .eq('client_id', clientId)

      if (plantId) query = query.eq('plant_id', plantId)
      else query = query.is('plant_id', null)

      if (areaId) query = query.eq('area_id', areaId)
      else query = query.is('area_id', null)

      const { error } = await query
      if (error) throw error
      return { success: true }
    }

    // Primeiro checar se já existe registro com esse escopo
    let checkQuery = supabase
      .from('cleaning_gardening_goals' as any)
      .select('id')
      .eq('client_id', clientId)

    if (plantId) checkQuery = checkQuery.eq('plant_id', plantId)
    else checkQuery = checkQuery.is('plant_id', null)

    if (areaId) checkQuery = checkQuery.eq('area_id', areaId)
    else checkQuery = checkQuery.is('area_id', null)

    const { data: existing, error: checkError } = await checkQuery.maybeSingle()
    if (checkError) throw checkError

    const existingRecord = existing as { id?: string } | null

    if (existingRecord?.id) {
      const { error: updateError } = await supabase
        .from('cleaning_gardening_goals' as any)
        .update({
          target_percentage: targetPercentage,
          description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRecord.id)
      if (updateError) throw updateError
    } else {
      const { error: insertError } = await supabase.from('cleaning_gardening_goals' as any).insert({
        client_id: clientId,
        plant_id: plantId,
        area_id: areaId,
        target_percentage: targetPercentage,
        description,
        updated_at: new Date().toISOString(),
      })
      if (insertError) throw insertError
    }

    return { success: true }
  } catch (err: any) {
    console.error('Erro ao salvar meta de limpeza e jardinagem:', err)
    return { success: false, error: err }
  }
}

/**
 * Remove a meta de um escopo.
 */
export async function deleteCleaningGoal(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('cleaning_gardening_goals' as any)
    .delete()
    .eq('id', id)
  if (error) {
    console.error('Erro ao deletar meta:', error)
    return false
  }
  return true
}
