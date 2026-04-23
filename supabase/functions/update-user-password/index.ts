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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    const { data: creatorProfile } = await supabaseClient
      .from('profiles')
      .select('role, client_id')
      .eq('id', user.id)
      .single()

    if (!creatorProfile || !['Master', 'Administrador'].includes(creatorProfile.role)) {
      throw new Error('Insufficient permissions')
    }

    const { userId, password } = await req.json()

    if (!userId || !password) {
      throw new Error('Faltando userId ou password na requisição.')
    }

    // Verify if Administrador is trying to update a user from another client
    if (creatorProfile.role !== 'Master') {
      const { data: targetProfile } = await supabaseClient
        .from('profiles')
        .select('client_id')
        .eq('id', userId)
        .single()
      
      if (!targetProfile || targetProfile.client_id !== creatorProfile.client_id) {
        throw new Error('Insufficient permissions to update this user')
      }
    }

    const { data, error } = await supabaseClient.auth.admin.updateUserById(
      userId,
      { password }
    )

    if (error) throw error

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
