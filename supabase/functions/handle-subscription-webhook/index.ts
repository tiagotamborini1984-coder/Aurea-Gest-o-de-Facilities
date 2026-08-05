import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = getSupabaseClient()

    const contentType = req.headers.get('Content-Type') || ''
    let payload: Record<string, unknown>

    if (contentType.includes('application/json')) {
      payload = await req.json()
    } else {
      const text = await req.text()
      try {
        payload = JSON.parse(text)
      } catch {
        payload = { raw: text }
      }
    }

    const eventType = (payload.type as string) || 'unknown'
    const subscriptionId = (payload.subscription_id as string) || (payload.id as string)
    const clientId = payload.client_id as string
    const status = payload.status as string
    const planType = payload.plan_type as string

    if (clientId) {
      const updateData: Record<string, unknown> = {}
      if (subscriptionId) updateData.subscription_id = subscriptionId
      if (status) updateData.status = status === 'active' ? 'Ativo' : 'Inativo'
      if (planType) updateData.plan_type = planType

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase.from('clients').update(updateData).eq('id', clientId)
        if (error) console.error('Failed to update client:', error.message)
      }
    }

    return new Response(JSON.stringify({ received: true, event: eventType }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
