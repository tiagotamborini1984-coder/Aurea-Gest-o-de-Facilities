import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const FIELDS = 'id, name, category, is_active, client_id, fs_code, supply_code'

function diagnoseProduct(p: any, rlsIds: Set<string>, clientId: string) {
  if (p.is_active === false)
    return {
      suspected_field: 'is_active',
      reason: 'is_active = false (produto arquivado)',
      suggestion: 'UPDATE inventory_products SET is_active = true WHERE id = this product',
    }
  if (p.is_active === null)
    return {
      suspected_field: 'is_active',
      reason: 'is_active IS NULL',
      suggestion: 'UPDATE inventory_products SET is_active = true WHERE id = this product',
    }
  if (!p.client_id)
    return {
      suspected_field: 'client_id',
      reason: 'client_id IS NULL (RLS bloqueando)',
      suggestion: 'Definir o client_id correto para este produto',
    }
  if (p.client_id !== clientId)
    return {
      suspected_field: 'client_id',
      reason: `client_id não corresponde ao cliente do usuário (${p.client_id} ≠ ${clientId})`,
      suggestion: 'Verificar se o produto pertence a outro cliente',
    }
  if (!rlsIds.has(p.id))
    return {
      suspected_field: 'RLS',
      reason: 'RLS policy bloqueando SELECT',
      suggestion: 'Verificar políticas RLS na tabela inventory_products',
    }
  return {
    suspected_field: 'is_active',
    reason: 'Filtro is_active do catálogo',
    suggestion: 'Verificar filtro or(is_active.eq.true,is_active.is.null) no frontend',
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('client_id, name')
      .eq('id', user.id)
      .single()
    if (profileError || !profile?.client_id) throw new Error('Profile or client not found')
    const clientId = profile.client_id

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: allProducts, error: allError } = await adminClient
      .from('inventory_products')
      .select(FIELDS)
      .eq('client_id', clientId)
      .order('name')
    if (allError) throw allError

    const { data: rlsProducts, error: rlsError } = await userClient
      .from('inventory_products')
      .select(FIELDS)
      .eq('client_id', clientId)
      .order('name')
    if (rlsError) throw rlsError

    const { data: catalogProducts, error: catalogError } = await userClient
      .from('inventory_products')
      .select(FIELDS)
      .eq('client_id', clientId)
      .or('is_active.eq.true,is_active.is.null')
      .order('name')
    if (catalogError) throw catalogError

    const rlsIds = new Set((rlsProducts || []).map((p: any) => p.id))
    const catalogIds = new Set((catalogProducts || []).map((p: any) => p.id))

    const missingFromRLS = (allProducts || []).filter((p: any) => !rlsIds.has(p.id))
    const missingFromCatalog = (allProducts || []).filter((p: any) => !catalogIds.has(p.id))

    const rlsAnalysis = {
      has_rls: true,
      blocking_count: missingFromRLS.length,
      suggestion:
        missingFromRLS.length > 0
          ? `${missingFromRLS.length} produto(s) bloqueado(s) por RLS. Verifique se client_id está correto ou ajuste as políticas.`
          : null,
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_in_database: allProducts?.length || 0,
          visible_with_rls: rlsProducts?.length || 0,
          visible_in_catalog: catalogProducts?.length || 0,
          missing_from_rls: missingFromRLS.length,
          missing_from_catalog: missingFromCatalog.length,
        },
        all_products: allProducts || [],
        visible_products: catalogProducts || [],
        missing_from_rls: missingFromRLS.map((p: any) => {
          const d = diagnoseProduct(p, rlsIds, clientId)
          return {
            id: p.id,
            name: p.name,
            is_active: p.is_active,
            client_id: p.client_id,
            reason: d.reason,
            suspected_field: d.suspected_field,
            correction_suggestion: d.suggestion,
          }
        }),
        missing_from_catalog: missingFromCatalog.map((p: any) => {
          const d = diagnoseProduct(p, rlsIds, clientId)
          return {
            id: p.id,
            name: p.name,
            is_active: p.is_active,
            category: p.category,
            client_id: p.client_id,
            reason: d.reason,
            suspected_field: d.suspected_field,
            correction_suggestion: d.suggestion,
          }
        }),
        rls_analysis: rlsAnalysis,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        summary: {
          total_in_database: 0,
          visible_with_rls: 0,
          visible_in_catalog: 0,
          missing_from_rls: 0,
          missing_from_catalog: 0,
        },
        all_products: [],
        visible_products: [],
        missing_from_rls: [],
        missing_from_catalog: [],
        rls_analysis: { has_rls: false, blocking_count: 0, suggestion: null },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
