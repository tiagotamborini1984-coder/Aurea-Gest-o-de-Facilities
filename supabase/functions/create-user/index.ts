import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

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
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    const { data: creatorProfile } = await supabaseClient
      .from('profiles')
      .select('role, client_id')
      .eq('id', user.id)
      .single()

    if (!creatorProfile) throw new Error('Creator profile not found')
    if (!['Master', 'Administrador'].includes(creatorProfile.role)) {
      throw new Error('Insufficient permissions to create users')
    }

    const body = await req.json()

    const {
      email,
      password,
      name,
      role,
      accessible_menus,
      authorized_plants,
      force_password_change,
      feature_permissions,
    } = body

    const finalClientId =
      role === 'Master'
        ? null
        : creatorProfile.role === 'Master'
          ? body.client_id
          : creatorProfile.client_id

    // Auto-promoção continua proibida em qualquer cenário.
    if (role === 'Master' && creatorProfile.role !== 'Master') {
      throw new Error('Cannot create a user with a higher role')
    }
    // Administrador só pode criar dentro da própria empresa (mesmo client_id) e sem Master.
    if (creatorProfile.role === 'Administrador') {
      if (role === 'Master') {
        throw new Error('Cannot create a user with a higher role')
      }
      if (body.client_id && body.client_id !== creatorProfile.client_id) {
        throw new Error('Cannot create a user in another company')
      }
    }

    if (!email || typeof email !== 'string') throw new Error('E-mail é obrigatório')
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres')
    }

    const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      // Confirma o e-mail na criação: a tela /usuarios define a senha, não há fluxo de
      // convite, e e-mail não confirmado bloquearia o login do novo usuário.
      email_confirm: true,
      user_metadata: { name },
    })

    if (userError) throw userError

    await new Promise((resolve) => setTimeout(resolve, 800))

    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        role,
        client_id: finalClientId,
        accessible_menus: accessible_menus || [],
        authorized_plants: authorized_plants || [],
        force_password_change: force_password_change || false,
        feature_permissions: feature_permissions || {},
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
