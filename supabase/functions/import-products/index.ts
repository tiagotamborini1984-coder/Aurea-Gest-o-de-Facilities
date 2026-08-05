import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();

    let body: { clientId?: string; products?: Record<string, unknown>[] };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { clientId, products } = body;
    if (!clientId || !products || !Array.isArray(products)) {
      return new Response(
        JSON.stringify({ error: 'clientId and products array are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const cleanedProducts = products.map((p) => {
      const fsCode = p.fs_code ? String(p.fs_code).trim() : null;
      const supplyCode = p.supply_code ? String(p.supply_code).trim() : null;
      const category = p.category ? String(p.category).replace(/[\r\n\t]+/g, ' ').trim() : null;
      const name = p.name ? String(p.name).replace(/[\r\n\t]+/g, ' ').trim() : '';

      return {
        ...p,
        client_id: clientId,
        name: name || 'Produto sem nome',
        category: category || null,
        fs_code: fsCode || null,
        supply_code: supplyCode || null,
        is_active: true,
      };
    });

    const withFsCode = cleanedProducts.filter((p) => p.fs_code);
    const withoutFsCode = cleanedProducts.filter((p) => !p.fs_code);

    let totalInserted = 0;
    const errors: Array<{ item: string; error: string }> = [];

    if (withFsCode.length > 0) {
      const { data, error } = await supabase
        .from('inventory_products')
        .upsert(withFsCode, { onConflict: 'client_id,fs_code' })
        .select();
      if (error) {
        for (const p of withFsCode) {
          const { data: d2, error: e2 } = await supabase
            .from('inventory_products')
            .upsert(p, { onConflict: 'client_id,fs_code' })
            .select();
          if (e2) errors.push({ item: String(p.name || p.fs_code || ''), error: e2.message });
          else totalInserted += d2?.length || 0;
        }
      } else {
        totalInserted += data?.length || 0;
      }
    }

    if (withoutFsCode.length > 0) {
      const withSupplyCode = withoutFsCode.filter((p) => p.supply_code);
      const withoutAny = withoutFsCode.filter((p) => !p.supply_code);

      if (withSupplyCode.length > 0) {
        const { data, error } = await supabase
          .from('inventory_products')
          .upsert(withSupplyCode, { onConflict: 'client_id,supply_code' })
          .select();
        if (error) {
          for (const p of withSupplyCode) {
            const { data: d2, error: e2 } = await supabase
              .from('inventory_products')
              .upsert(p, { onConflict: 'client_id,supply_code' })
              .select();
            if (e2) errors.push({ item: String(p.name || p.supply_code || ''), error: e2.message });
            else totalInserted += d2?.length || 0;
          }
        } else {
          totalInserted += data?.length || 0;
        }
      }

      if (withoutAny.length > 0) {
        const { data, error } = await supabase
          .from('inventory_products')
          .insert(withoutAny)
          .select();
        if (error) {
          for (const p of withoutAny) {
            const { data: d2, error: e2 } = await supabase
              .from('inventory_products')
              .insert(p)
              .select();
            if (e2) errors.push({ item: String(p.name || ''), error: e2.message });
            else totalInserted += d2?.length || 0;
          }
        } else {
          totalInserted += data?.length || 0;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, inserted: totalInserted, total: products.length, errors }),
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
