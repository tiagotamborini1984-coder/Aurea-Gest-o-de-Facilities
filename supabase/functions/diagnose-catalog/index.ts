import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

    const selectFields = 'id, name, category, is_active, client_id, fs_code, supply_code'

    const { data: allProducts, error: allError } = await adminClient
      .from('inventory_products')
      .select(selectFields)
      .eq('client_id', clientId)
      .order('name')

    if (allError) throw allError

    const { data: rlsProducts, error: rlsError } = await userClient
      .from('inventory_products')
      .select(selectFields)
      .eq('client_id', clientId)
      .order('name')

    if (rlsError) throw rlsError

    const { data: catalogProducts, error: catalogError } = await userClient
      .from('inventory_products')
      .select(selectFields)
      .eq('client_id', clientId)
      .or('is_active.eq.true,is_active.is.null')
      .order('name')

    if (catalogError) throw catalogError

    const rlsIds = new Set((rlsProducts || []).map((p: any) => p.id))
    const catalogIds = new Set((catalogProducts || []).map((p: any) => p.id))

    const missingFromRLS = (allProducts || []).filter((p: any) => !rlsIds.has(p.id))
    const missingFromCatalog = (allProducts || []).filter((p: any) => !catalogIds.has(p.id))

    const diagnoseReason = (p: any): string => {
      if (p.is_active === false) return 'is_active = false (produto arquivado)'
      if (p.is_active === null) return 'is_active IS NULL'
      if (p.client_id === null) return 'client_id IS NULL (RLS bloqueando)'
      if (!rlsIds.has(p.id)) return 'RLS policy bloqueando SELECT'
      return 'Filtro is_active do catálogo'
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
        missing_from_rls: missingFromRLS.map((p: any) => ({
          id: p.id,
          name: p.name,
          is_active: p.is_active,
          client_id: p.client_id,
          reason: diagnoseReason(p),
        })),
        missing_from_catalog: missingFromCatalog.map((p: any) => ({
          id: p.id,
          name: p.name,
          is_active: p.is_active,
          category: p.category,
          reason: diagnoseReason(p),
        })),
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
        missing_from_rls: [],
        missing_from_catalog: [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
