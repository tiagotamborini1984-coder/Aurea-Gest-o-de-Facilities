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

export async function getProducts(clientId: string): Promise<InventoryProduct[]> {
  const { data, error } = await supabase
    .from('inventory_products')
    .select('*')
    .eq('client_id', clientId)
    .order('name')
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

  if (error) {
    console.error('Error importing products:', error)
    throw new Error(error.message || 'Failed to import products')
  }

  return data as ImportProductsResult
}
