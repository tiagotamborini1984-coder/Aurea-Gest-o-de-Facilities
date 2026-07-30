import { supabase } from '@/lib/supabase/client'

export interface InventoryProduct {
  id?: string
  client_id?: string
  name: string
  description?: string
  category?: string
  unit_of_measure?: string
  image_url?: string
  sds_url?: string
  fs_code?: string
  supply_code?: string
  item_value?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface ImportProductsResult {
  success: boolean
  inserted: number
  total: number
  errors: Array<{ item: string; error: string }>
}

export async function getProducts(
  clientId: string,
  includeInactive = false,
): Promise<InventoryProduct[]> {
  let query = supabase.from('inventory_products').select('*').eq('client_id', clientId)
  if (!includeInactive) query = query.neq('is_active', false)
  const { data, error } = await query.order('name')
  if (error) throw error
  return data || []
}

export async function createProduct(product: InventoryProduct): Promise<InventoryProduct> {
  const { data, error } = await supabase
    .from('inventory_products')
    .insert(product)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProduct(
  id: string,
  product: Partial<InventoryProduct>,
): Promise<InventoryProduct> {
  const { data, error } = await supabase
    .from('inventory_products')
    .update(product)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('inventory_products').delete().eq('id', id)
  if (error) throw error
}

export async function importProducts(
  clientId: string,
  products: InventoryProduct[],
): Promise<ImportProductsResult> {
  const { data, error } = await supabase.functions.invoke('import-products', {
    body: { clientId, products },
  })
  if (error) throw new Error(error.message || 'Failed to import products')
  return data as ImportProductsResult
}

async function searchProducts(
  clientId: string,
  search: string,
  fsCodeSearch: string,
): Promise<any[]> {
  let query = supabase
    .from('inventory_products')
    .select('*')
    .eq('client_id', clientId)
    .neq('is_active', false)
  if (search.trim()) query = query.ilike('name', `%${search.trim()}%`)
  if (fsCodeSearch.trim()) query = query.ilike('fs_code', `%${fsCodeSearch.trim()}%`)
  const { data, error } = await query.order('name')
  if (error) throw error
  return data || []
}

async function getCategories(clientId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('inventory_categories')
    .select('*')
    .eq('client_id', clientId)
    .order('name')
  if (error) throw error
  return data || []
}

async function getPlants(clientId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('plants')
    .select('*')
    .eq('client_id', clientId)
    .order('name')
  if (error) throw error
  return data || []
}

async function getAreas(plantId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('maintenance_areas')
    .select('*, plant:plants(name)')
    .eq('plant_id', plantId)
    .order('name')
  if (error) throw error
  return data || []
}

async function getAreasByClient(clientId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('maintenance_areas')
    .select('*, plant:plants(name)')
    .eq('client_id', clientId)
    .order('name')
  if (error) throw error
  return data || []
}

async function submitRequest(requestData: any, itemsData: any[]): Promise<any> {
  const { data, error } = await supabase
    .from('inventory_requests')
    .insert(requestData)
    .select()
    .single()
  if (error) throw error
  const items = itemsData.map((item) => ({ ...item, request_id: data.id }))
  const { error: itemsError } = await supabase.from('inventory_request_items').insert(items)
  if (itemsError) throw itemsError
  return data
}

async function getRequests(clientId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('inventory_requests')
    .select(
      '*, plant:plants(*), area:maintenance_areas(*), requester:profiles!requester_id(name), processed_by_profile:profiles!processed_by(name), items:inventory_request_items(*, product:inventory_products(*))',
    )
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

async function getPlantInventoryValue(clientId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('plants')
    .select('*')
    .eq('client_id', clientId)
    .order('name')
  if (error) throw error
  return (data || []).map((p) => ({ ...p, totalValue: 0 }))
}

async function deleteRequest(requestId: string): Promise<void> {
  const { error: itemsError } = await supabase
    .from('inventory_request_items')
    .delete()
    .eq('request_id', requestId)
  if (itemsError) throw itemsError
  const { error } = await supabase.from('inventory_requests').delete().eq('id', requestId)
  if (error) throw error
}

async function updateRequestStatus(
  requestId: string,
  status: string,
  sapNumber: string,
  userId: string,
  itemsToUpdate?: any[],
): Promise<void> {
  const updateData: any = { status }
  if (sapNumber) updateData.sap_reservation_number = sapNumber
  if (status !== 'Pendente') {
    updateData.processed_at = new Date().toISOString()
    updateData.processed_by = userId
  }
  const { error } = await supabase.from('inventory_requests').update(updateData).eq('id', requestId)
  if (error) throw error
  if (itemsToUpdate?.length) {
    for (const item of itemsToUpdate) {
      const { error: ie } = await supabase
        .from('inventory_request_items')
        .update({ reserved_quantity: item.reserved_quantity })
        .eq('id', item.id)
      if (ie) throw ie
    }
  }
}

async function getImportLogs(clientId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('import_logs')
    .select('*, creator:profiles!created_by(name)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

async function getProductNamesByIds(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {}
  const { data, error } = await supabase.from('inventory_products').select('id, name').in('id', ids)
  if (error) throw error
  const map: Record<string, string> = {}
  ;(data || []).forEach((p) => {
    map[p.id] = p.name
  })
  return map
}

async function undoImport(logId: string): Promise<{ deletedCount: number; restoredCount: number }> {
  const { data: log, error } = await supabase
    .from('import_logs')
    .select('*')
    .eq('id', logId)
    .single()
  if (error) throw error
  const insertedIds: string[] = log.inserted_products || []
  const updatedEntries = log.updated_products || []
  let deletedCount = 0
  let restoredCount = 0
  if (insertedIds.length > 0) {
    const { data: deleted } = await supabase
      .from('inventory_products')
      .delete()
      .in('id', insertedIds)
    deletedCount = deleted?.length || 0
  }
  for (const entry of updatedEntries) {
    if (entry.previous_values) {
      const { error: re } = await supabase
        .from('inventory_products')
        .update(entry.previous_values)
        .eq('id', entry.product_id)
      if (!re) restoredCount++
    }
  }
  const { error: dle } = await supabase.from('import_logs').delete().eq('id', logId)
  if (dle) throw dle
  return { deletedCount, restoredCount }
}

async function uploadFile(bucket: string, file: File, path: string): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file)
  if (error) throw error
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

async function saveProduct(payload: any): Promise<any> {
  const { id, ...rest } = payload
  if (id) {
    const { data, error } = await supabase
      .from('inventory_products')
      .update(rest)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase.from('inventory_products').insert(rest).select().single()
  if (error) throw error
  return data
}

async function normalizeClientInventory(clientId: string): Promise<void> {
  const { error } = await supabase.rpc('normalize_client_inventory_categories', {
    p_client_id: clientId,
  })
  if (error) throw error
}

async function archiveProduct(productId: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_products')
    .update({ is_active: false })
    .eq('id', productId)
  if (error) throw error
}

async function reactivateProduct(productId: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_products')
    .update({ is_active: true })
    .eq('id', productId)
  if (error) throw error
}

async function saveArea(payload: any): Promise<any> {
  const { id, ...rest } = payload
  if (id) {
    const { data, error } = await supabase
      .from('maintenance_areas')
      .update(rest)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase.from('maintenance_areas').insert(rest).select().single()
  if (error) throw error
  return data
}

async function deleteArea(areaId: string): Promise<void> {
  const { error } = await supabase.from('maintenance_areas').delete().eq('id', areaId)
  if (error) throw error
}

export const inventoryService = {
  getProducts,
  searchProducts,
  getCategories,
  getPlants,
  getAreas,
  getAreasByClient,
  submitRequest,
  getRequests,
  getPlantInventoryValue,
  deleteRequest,
  updateRequestStatus,
  getImportLogs,
  getProductNamesByIds,
  undoImport,
  uploadFile,
  normalizeClientInventory,
  saveProduct,
  archiveProduct,
  reactivateProduct,
  saveArea,
  deleteArea,
  importProducts,
}
