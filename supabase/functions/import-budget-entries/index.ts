import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();

    let body: { clientId?: string; entries?: Record<string, unknown>[] };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { clientId, entries } = body;
    if (!clientId || !entries || !Array.isArray(entries)) {
      return new Response(
        JSON.stringify({ error: 'clientId and entries array are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const entriesPrepared = entries.map(e => ({
      ...e,
      client_id: clientId,
      budgeted_amount: Number(e.budgeted_amount) || 0,
      realized_amount: Number(e.realized_amount) || 0,
    }));

    let upserted = 0;
    const errors: Array<{ item: string; error: string }> = [];

    const { data, error } = await supabase
      .from('budget_entries')
      .upsert(entriesPrepared, { onConflict: 'client_id,cost_center_id,account_id,reference_month' })
      .select();

    if (error) {
      for (const e of entriesPrepared) {
        const { data: d2, error: e2 } = await supabase
          .from('budget_entries')
          .upsert(e, { onConflict: 'client_id,cost_center_id,account_id,reference_month' })
          .select()
          .single();
        if (e2) {
          errors.push({ item: String(e.reference_month || ''), error: e2.message });
        } else {
          upserted++;
        }
      }
    } else {
      upserted = data?.length || 0;
    }

    return new Response(
      JSON.stringify({ success: true, upserted, total: entries.length, errors }),
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
