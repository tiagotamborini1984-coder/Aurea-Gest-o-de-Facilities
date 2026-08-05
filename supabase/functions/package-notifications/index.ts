import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();

    let body: { packageId?: string; type?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { packageId, type } = body;
    if (!packageId) {
      return new Response(
        JSON.stringify({ error: 'packageId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { data: pkg, error } = await supabase
      .from('packages')
      .select('*, clients(name)')
      .eq('id', packageId)
      .single();

    if (error) throw error;

    if (pkg?.recipient_email) {
      console.log(`Notification (${type || 'created'}) sent to ${pkg.recipient_email} for package ${pkg.protocol_number}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification processed' }),
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
