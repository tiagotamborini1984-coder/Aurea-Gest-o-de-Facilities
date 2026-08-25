import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    let body: {
      email?: string
      password?: string
      client_id?: string
      name?: string
      role?: string
      plants?: string[]
    } = {}

    if (req.method === 'POST') {
      try {
        body = await req.json()
      } catch {
        body = {}
      }
    }

    const email = body.email || 'demo@aurea.com'
    const password = body.password || 'Demo@123'
    const clientId = body.client_id || '4db86cec-7623-406b-9aa6-b83132d84285'
    const name = body.name || 'Administrador Demo'
    const role = body.role || 'Master'
    const defaultPlants = [
      'c68f57fb-6257-49fa-a668-fa424f8e54ee', // Planta Alpha
      'c9ec792f-c6a6-420b-9cdd-71dae722a37a', // Planta Beta
      'e1af31e1-10b0-4fc0-b92e-a18bad45a52e', // Planta Gama
      '6498476e-460a-46e5-ba52-a2e59fdeb585', // Planta Delta
    ]
    const plants = body.plants && Array.isArray(body.plants) ? body.plants : defaultPlants

    // 1. Check if user already exists
    const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError

    const existingUser = usersList.users.find((u) => u.email === email)

    let userId: string

    if (!existingUser) {
      // Create user via admin API
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role,
          client_id: clientId,
        },
      })

      if (createError) throw createError
      if (!userData.user) throw new Error('User creation failed without returning user object')
      userId = userData.user.id
    } else {
      userId = existingUser.id
      // Update existing user password and metadata if needed
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role,
          client_id: clientId,
        },
      })
      if (updateError) throw updateError
    }

    // Wait briefly for triggers if any
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 2. Ensure profile is updated/created
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        client_id: clientId,
        name,
        email,
        role,
        accessible_menus: [],
        authorized_plants: [],
        force_password_change: false,
      },
      { onConflict: 'id' },
    )

    if (profileError) throw profileError

    // 3. Ensure user_plants are created
    const userPlantRows = plants.map((plantId) => ({
      user_id: userId,
      plant_id: plantId,
    }))

    const { error: plantsError } = await supabaseAdmin
      .from('user_plants')
      .upsert(userPlantRows, { onConflict: 'user_id,plant_id' })

    if (plantsError) throw plantsError

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo user created/updated successfully',
        user: {
          id: userId,
          email,
          client_id: clientId,
          role,
          name,
          plants,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || String(error),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
