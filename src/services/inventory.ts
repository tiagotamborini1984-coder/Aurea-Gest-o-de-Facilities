import { supabase } from '@/lib/supabase/client'

export const inventoryService = {
  async getProducts(clientId: string) {
    const { data, error } = await supabase
      .from('inventory_products')
      .select('*')
      .eq('client_id', clientId)
      .order('name')
      .limit(10000)
    if (error) throw error
    return data
  },

  async getPlants(clientId: string) {
    const { data, error } = await supabase.from('plants').select('*').eq('client_id', clientId)
    if (error) throw error
    return data || []
  },

  async getPlantInventoryValue(clientId: string) {
    const { data, error } = await supabase
      .from('inventory_requests')
      .select(`
        id,
        plant_id,
        plant:plants!inventory_requests_plant_id_fkey(id, name, code, city),
        items:inventory_request_items(
          quantity,
          product:inventory_products(item_value)
        )
      `)
      .eq('client_id', clientId)

    if (error) throw error

    const { data: plants, error: plantsError } = await supabase
      .from('plants')
      .select('id, name, code, city')
      .eq('client_id', clientId)

    if (plantsError) throw plantsError

    const valueMap: Record<string, number> = {}
    ;(plants || []).forEach((p) => {
      valueMap[p.id] = 0
    })

    ;(data || []).forEach((req: any) => {
      const plantId = req.plant?.id || req.plant_id
      if (!plantId) return
      const itemsTotal = (req.items || []).reduce((sum: number, item: any) => {
        const quantity = Number(item.quantity) || 0
        const itemValue = Number(item.product?.item_value) || 0
        return sum + quantity * itemValue
      }, 0)
      valueMap[plantId] = (valueMap[plantId] || 0) + itemsTotal
    })

    return (plants || []).map((p) => ({
      ...p,
      totalValue: valueMap[p.id] || 0,
    }))
  },

  async getAreas(plantId: string) {
    const { data, error } = await supabase
      .from('maintenance_areas')
      .select('*')
      .eq('plant_id', plantId)
    if (error) throw error
    return data || []
  },

  async getAreasByClient(clientId: string) {
    const { data, error } = await supabase
      .from('maintenance_areas')
      .select('*, plant:plants!maintenance_areas_plant_id_fkey(name)')
      .eq('client_id', clientId)
      .order('name')
    if (error) throw error
    return data || []
  },

  async saveArea(area: any) {
    if (area.id) {
      const { data, error } = await supabase
        .from('maintenance_areas')
        .update({ name: area.name, plant_id: area.plant_id })
        .eq('id', area.id)
      if (error) throw error
      return data
    } else {
      const { id, ...insertData } = area
      const { data, error } = await supabase.from('maintenance_areas').insert([insertData])
      if (error) throw error
      return data
    }
  },

  async deleteArea(areaId: string) {
    const { error } = await supabase.from('maintenance_areas').delete().eq('id', areaId)
    if (error) throw error
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
        processed_by_profile:profiles!inventory_requests_processed_by_fkey(name),
        plant:plants!inventory_requests_plant_id_fkey(id, name),
        area:maintenance_areas!inventory_requests_area_id_fkey(id, name),
        items:inventory_request_items(
          id,
          quantity,
          reserved_quantity,
          product:inventory_products(name, unit_of_measure, item_value, fs_code, supply_code)
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
    items?: { id: string; reserved_quantity: number }[],
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

    if (items && items.length > 0) {
      for (const item of items) {
        const { error: itemError } = await supabase
          .from('inventory_request_items')
          .update({ reserved_quantity: item.reserved_quantity })
          .eq('id', item.id)
        if (itemError) throw itemError
      }
    }

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
      const { id, ...insertData } = product
      const { data, error } = await supabase.from('inventory_products').insert([insertData])
      if (error) throw error
      return data
    }
  },

  async deleteProduct(productId: string) {
    const { error } = await supabase.from('inventory_products').delete().eq('id', productId)
    if (error) throw error
  },

  async deleteRequest(requestId: string) {
    const { error: itemsError } = await supabase
      .from('inventory_request_items')
      .delete()
      .eq('request_id', requestId)
    if (itemsError) throw itemsError

    const { error } = await supabase.from('inventory_requests').delete().eq('id', requestId)
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

  async getCategories(clientId: string) {
    const { data, error } = await (supabase as any)
      .from('inventory_categories')
      .select('*')
      .eq('client_id', clientId)
      .order('name')
    if (error) throw error
    return data || []
  },

  async saveCategory(category: any) {
    if (category.id) {
      const { data, error } = await (supabase as any)
        .from('inventory_categories')
        .update({ name: category.name })
        .eq('id', category.id)
        .select()
        .single()
      if (error) throw error
      if (category.oldName && category.oldName !== category.name) {
        const { error: prodError } = await supabase
          .from('inventory_products')
          .update({ category: category.name })
          .eq('client_id', category.client_id)
          .eq('category', category.oldName)
        if (prodError) throw prodError
      }
      return data
    } else {
      const { id, oldName, ...insertData } = category
      const { data, error } = await (supabase as any)
        .from('inventory_categories')
        .insert([insertData])
        .select()
        .single()
      if (error) throw error
      return data
    }
  },

  async deleteCategory(categoryId: string) {
    const { error } = await (supabase as any)
      .from('inventory_categories')
      .delete()
      .eq('id', categoryId)
    if (error) throw error
  },

  async getCategoryProductCount(clientId: string, categoryName: string) {
    const { count, error } = await supabase
      .from('inventory_products')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('category', categoryName)
    if (error) throw error
    return count || 0
  },

  async importProducts(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const { data, error } = await supabase.functions.invoke('import-products', {
      body: formData,
    })

    if (error) throw error
    return data as {
      success: boolean
      inserted: number
      skipped: number
      total: number
      errors: string[]
      error?: string
    }
  },
}
