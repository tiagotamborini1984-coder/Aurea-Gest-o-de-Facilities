import { supabase } from '@/lib/supabase/client'

export interface DiagnosticSummary {
  total_in_database: number
  visible_with_rls: number
  visible_in_catalog: number
  missing_from_rls: number
  missing_from_catalog: number
}

export interface DiagnosticProduct {
  id: string
  name: string
  is_active: boolean | null
  client_id: string | null
  category?: string | null
  reason: string
  suspected_field: string
  correction_suggestion: string
}

export interface SimpleProduct {
  id: string
  name: string
  category: string | null
  is_active: boolean | null
  client_id: string | null
  fs_code: string | null
  supply_code: string | null
}

export interface RlsAnalysis {
  has_rls: boolean
  blocking_count: number
  suggestion: string | null
}

export interface DiagnosticResult {
  success: boolean
  summary: DiagnosticSummary
  all_products: SimpleProduct[]
  visible_products: SimpleProduct[]
  missing_from_rls: DiagnosticProduct[]
  missing_from_catalog: DiagnosticProduct[]
  rls_analysis: RlsAnalysis
  error?: string
}

export async function runCatalogDiagnostic(): Promise<DiagnosticResult> {
  const { data, error } = await supabase.functions.invoke('diagnose-catalog')
  if (error) throw error
  return data as DiagnosticResult
}
