import { supabase } from '@/lib/supabase/client'

export const getFlowcharts = async (clientId: string) => {
  const { data, error } = await supabase
    .from('process_flowcharts' as any)
    .select('*, plants(name)')
    .eq('client_id', clientId)
    .order('name')
  if (error) throw error
  return data
}

export const saveFlowchart = async (flow: any) => {
  if (flow.id) {
    const { data, error } = await supabase
      .from('process_flowcharts' as any)
      .update(flow)
      .eq('id', flow.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('process_flowcharts' as any)
      .insert(flow)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export const deleteFlowchart = async (id: string) => {
  const { error } = await supabase
    .from('process_flowcharts' as any)
    .delete()
    .eq('id', id)
  if (error) throw error
}
