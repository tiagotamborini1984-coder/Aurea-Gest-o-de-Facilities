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

    const body = await req.json()
    const { email, company_name, plan, event_type, subscription_id } = body

    if (event_type !== 'subscription.created') {
      return new Response(JSON.stringify({ message: 'Ignored event type' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!subscription_id || !email || !company_name) {
      throw new Error('Missing required fields')
    }

    // Idempotency check: see if client with this subscription_id exists
    const { data: existingClient } = await supabaseClient
      .from('clients')
      .select('id')
      .eq('subscription_id', subscription_id)
      .single()

    if (existingClient) {
      return new Response(JSON.stringify({ message: 'Subscription already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const urlSlug = company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000)

    // Insert client
    const { data: newClient, error: clientError } = await supabaseClient
      .from('clients')
      .insert({
        name: company_name,
        url_slug: urlSlug,
        admin_name: company_name + ' Admin',
        status: 'Ativo',
        plan_type: plan || 'Profissional',
        subscription_id: subscription_id,
        modules: ['Gestão de Terceiros', 'Gestão de Manutenção'], // Default base modules
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (clientError) throw clientError

    // Insert User in Auth
    const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
      email,
      password: 'InitialPassword123!',
      email_confirm: true,
      user_metadata: { name: 'Admin ' + company_name },
    })

    if (userError && !userError.message.includes('already exists')) {
      throw userError
    }

    let finalUserId = userData?.user?.id
    
    // Fallback if user already existed
    if (!finalUserId) {
      const { data: existingUsers } = await supabaseClient.auth.admin.listUsers()
      const eu = existingUsers.users.find((u: any) => u.email === email)
      if (eu) finalUserId = eu.id
    }

    if (finalUserId) {
      // Wait for trigger to fire and insert the operational profile
      await new Promise(r => setTimeout(r, 800));

      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
          role: 'Administrador',
          client_id: newClient.id,
        })
        .eq('id', finalUserId)

      if (profileError) {
         // Fallback if trigger didn't insert
         await supabaseClient.from('profiles').insert({
           id: finalUserId,
           email: email,
           name: 'Admin ' + company_name,
           role: 'Administrador',
           client_id: newClient.id
         })
      }
    }

    return new Response(JSON.stringify({ success: true, client_id: newClient.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Webhook Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
