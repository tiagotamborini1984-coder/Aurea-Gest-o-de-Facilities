import { supabase } from '@/lib/supabase/client'

export const inventoryService = {
  async getProducts(clientId: string) {
    const { data, error } = await supabase
      .from('inventory_products')
      .select('*')
      .eq('client_id', clientId)
      .order('name')
    if (error) throw error
    return data
  },

  async getPlants(clientId: string) {
    const { data, error } = await supabase.from('plants').select('*').eq('client_id', clientId)
    if (error) throw error
    return data || []
  },

  async getAreas(plantId: string) {
    const { data, error } = await supabase
      .from('maintenance_areas')
      .select('*')
      .eq('plant_id', plantId)
    if (error) throw error
    return data || []
  },

  async submitRequest(requestData: any, items: any[]) {
    const { data: request, error } = await supabase
      .from('inventory_requests')
      .insert([requestData])
      .select()
      .single()

    if (error) throw error

    const itemsToInsert = items.map((item) => ({
      request_id: request.id,
      product_id: item.product_id,
      quantity: item.quantity,
    }))

    const { error: itemsError } = await supabase
      .from('inventory_request_items')
      .insert(itemsToInsert)
    if (itemsError) throw itemsError

    return request
  },

  async getRequests(clientId: string) {
    const { data, error } = await supabase
      .from('inventory_requests')
      .select(`
        *,
        requester:profiles!inventory_requests_requester_id_fkey(name),
        plant:plants!inventory_requests_plant_id_fkey(id, name),
        area:maintenance_areas!inventory_requests_area_id_fkey(id, name),
        items:inventory_request_items(
          quantity,
          product:inventory_products(name, unit_of_measure)
        )
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async updateRequestStatus(
    requestId: string,
    status: string,
    sapNumber?: string,
    processedBy?: string,
  ) {
    const payload: any = { status, processed_at: new Date().toISOString() }
    if (sapNumber) payload.sap_reservation_number = sapNumber
    if (processedBy) payload.processed_by = processedBy

    const { data, error } = await supabase
      .from('inventory_requests')
      .update(payload)
      .eq('id', requestId)
      .select()

    if (error) throw error
    return data
  },

  async saveProduct(product: any) {
    if (product.id) {
      const { data, error } = await supabase
        .from('inventory_products')
        .update(product)
        .eq('id', product.id)
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase.from('inventory_products').insert([product])
      if (error) throw error
      return data
    }
  },

  async deleteProduct(productId: string) {
    const { error } = await supabase.from('inventory_products').delete().eq('id', productId)
    if (error) throw error
  },

  async uploadFile(bucket: string, file: File, fileName: string) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert: true })
    if (error) throw error
    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(data.path)
    return publicUrl.publicUrl
  },
}
