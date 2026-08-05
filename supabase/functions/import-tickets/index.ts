import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = getSupabaseClient()

    let body: { clientId?: string; plantId?: string; tickets?: Record<string, unknown>[] }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { clientId, plantId, tickets } = body
    if (!clientId || !tickets || !Array.isArray(tickets)) {
      return new Response(JSON.stringify({ error: 'clientId and tickets array are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const ticketsPrepared = tickets.map((t) => ({
      ...t,
      client_id: clientId,
      plant_id: t.plant_id || plantId,
      origin: 'Importação',
      reported_at: t.reported_at || new Date().toISOString(),
    }))

    let inserted = 0
    const errors: Array<{ item: string; error: string }> = []

    const { data, error } = await supabase
      .from('maintenance_tickets')
      .insert(ticketsPrepared)
      .select()

    if (error) {
      for (const t of ticketsPrepared) {
        const { data: d2, error: e2 } = await supabase
          .from('maintenance_tickets')
          .insert(t)
          .select()
          .single()
        if (e2) {
          errors.push({ item: String(t.ticket_number || t.description || ''), error: e2.message })
        } else {
          inserted++
        }
      }
    } else {
      inserted = data?.length || 0
    }

    return new Response(
      JSON.stringify({ success: true, inserted, total: tickets.length, errors }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
