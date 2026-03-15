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

    const {
      email,
      password,
      name,
      role,
      client_id,
      accessible_menus,
      authorized_plants,
      force_password_change,
    } = await req.json()

    const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (userError) throw userError

    // Wait for the trigger to insert profile
    await new Promise((resolve) => setTimeout(resolve, 800))

    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        role,
        client_id,
        accessible_menus,
        authorized_plants,
        force_password_change,
      })
      .eq('id', userData.user.id)

    if (profileError) throw profileError

    return new Response(JSON.stringify({ success: true, user: userData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
