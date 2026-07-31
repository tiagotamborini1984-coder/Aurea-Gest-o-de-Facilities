import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();

    let body: { clientId?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { clientId } = body;
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'clientId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { data: diagnostics, error: diagError } = await supabase
      .from('v_inventory_product_diagnostics')
      .select('*')
      .eq('client_id', clientId);

    if (diagError) throw diagError;

    const { data: stats, error: statsError } = await supabase
      .from('inventory_products')
      .select('id, is_active')
      .eq('client_id', clientId);

    if (statsError) throw statsError;

    const totalProducts = stats?.length || 0;
    const activeProducts = stats?.filter(p => p.is_active).length || 0;
    const inactiveProducts = totalProducts - activeProducts;

    return new Response(
      JSON.stringify({
        success: true,
        totalProducts,
        activeProducts,
        inactiveProducts,
        diagnostics: diagnostics || [],
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
