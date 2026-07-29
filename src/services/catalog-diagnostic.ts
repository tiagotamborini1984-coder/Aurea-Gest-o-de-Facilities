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
  category: string | null
  reason: string
}

export interface DiagnosticResult {
  success: boolean
  summary: DiagnosticSummary
  missing_from_rls: DiagnosticProduct[]
  missing_from_catalog: DiagnosticProduct[]
  error?: string
}

export async function runCatalogDiagnostic(): Promise<DiagnosticResult> {
  const { data, error } = await supabase.functions.invoke('diagnose-catalog')
  if (error) throw error
  return data as DiagnosticResult
}
