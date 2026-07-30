import { supabase } from '@/lib/supabase/client'

export interface CatalogDiagnostic {
  id: string
  name: string
  fs_code: string | null
  supply_code: string | null
  product_category: string | null
  is_active: boolean
  client_id: string
  client_name: string | null
  unit_of_measure: string | null
  item_value: number | null
  visibility_status: string | null
  diagnostic_message: string | null
}

export interface DiagnoseCatalogResponse {
  success: boolean
  totalProducts: number
  activeProducts: number
  inactiveProducts: number
  diagnostics: CatalogDiagnostic[]
}

export async function diagnoseCatalog(clientId: string): Promise<DiagnoseCatalogResponse> {
  const { data, error } = await supabase.functions.invoke('diagnose-catalog', {
    body: { clientId },
  })

  if (error) {
    console.error('Error diagnosing catalog:', error)
    throw new Error(error.message || 'Failed to diagnose catalog')
  }

  return data as DiagnoseCatalogResponse
}
