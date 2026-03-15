import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase secrets not found in Edge Function environment.')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { email, password, name, role, client_id, accessible_menus, authorized_plants } =
      await req.json()

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (error) throw error

    // Sync profile
    await supabase
      .from('profiles')
      .update({
        role,
        client_id,
        accessible_menus,
        authorized_plants,
        force_password_change: true,
      })
      .eq('id', data.user.id)

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
