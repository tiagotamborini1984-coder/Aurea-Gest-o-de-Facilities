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

    const { data: callerProfile } = await supabaseClient
      .from('profiles')
      .select('role, client_id')
      .eq('id', user.id)
      .single()

    if (!callerProfile) throw new Error('Caller profile not found')
    if (!['Master', 'Administrador'].includes(callerProfile.role)) {
      throw new Error('Insufficient permissions to delete users')
    }

    const { userId } = await req.json()

    if (!userId) throw new Error('Missing userId')

    if (userId === user.id) {
      throw new Error('Cannot delete your own user')
    }

    // Get target user profile
    const { data: targetProfile } = await supabaseClient
      .from('profiles')
      .select('role, client_id')
      .eq('id', userId)
      .single()

    if (!targetProfile) throw new Error('Target user not found')

    // Check permissions
    if (callerProfile.role === 'Administrador') {
      if (targetProfile.client_id !== callerProfile.client_id) {
        throw new Error('Cannot delete user from another client')
      }
      if (['Master', 'Administrador'].includes(targetProfile.role)) {
        throw new Error('Cannot delete a user with equal or higher role')
      }
    } else if (callerProfile.role === 'Master') {
      if (targetProfile.role === 'Master') {
        throw new Error('Cannot delete another Master user')
      }
    }

    // Delete user from auth.users
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId)
    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
