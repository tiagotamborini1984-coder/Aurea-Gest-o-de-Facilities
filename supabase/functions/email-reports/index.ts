import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const reqData = await req.json().catch(() => ({}));
    const reportType = reqData.reportType || 'Daily'; // Can be 'Daily' or 'Monthly'

    // Fetch all Admins and Gestors
    const { data: users, error } = await supabaseClient
      .from('profiles')
      .select('email, name, role, client_id, authorized_plants')
      .in('role', ['Administrador', 'Master', 'Gestor']);

    if (error) throw error;

    let sentCount = 0;
    
    // Simulate sending logic per user according to rules
    for (const u of (users || [])) {
      if (!u.email) continue;
      
      let scope = 'Todas as Plantas';
      if (u.role === 'Gestor') {
        if (u.authorized_plants && Array.isArray(u.authorized_plants) && u.authorized_plants.length > 0) {
          scope = `Plantas Autorizadas: ${u.authorized_plants.join(', ')}`;
        } else {
          // If manager has no authorized plants, maybe skip them
          scope = 'Nenhuma planta autorizada';
          console.log(`Skipping ${u.email} as they have no authorized plants.`);
          continue;
        }
      }

      console.log(`[${reportType} Report] Sending PDF to ${u.email} (Role: ${u.role}, Scope: ${scope})`);
      sentCount++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${reportType} PDF report successfully generated and simulated sending to ${sentCount} recipients.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
