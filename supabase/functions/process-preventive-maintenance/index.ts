import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

function addFrequency(date: Date, frequency: string): Date {
  const d = new Date(date)
  switch (frequency) {
    case 'Diária':
      d.setUTCDate(d.getUTCDate() + 1)
      break
    case 'Semanal':
      d.setUTCDate(d.getUTCDate() + 7)
      break
    case 'Mensal':
      d.setUTCMonth(d.getUTCMonth() + 1)
      break
    case 'Semestral':
      d.setUTCMonth(d.getUTCMonth() + 6)
      break
    case 'Anual':
      d.setUTCFullYear(d.getUTCFullYear() + 1)
      break
    default:
      d.setUTCMonth(d.getUTCMonth() + 1)
  }
  return d
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

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    const { data: plans, error: plansError } = await supabaseClient
      .from('maintenance_preventive_plans')
      .select('*')
      .eq('is_active', true)

    if (plansError) throw plansError

    let generatedCount = 0

    for (const plan of plans || []) {
      let nextDate = new Date(plan.start_date + 'T00:00:00Z')

      if (plan.last_generated_date) {
        const lastGen = new Date(plan.last_generated_date + 'T00:00:00Z')
        nextDate = addFrequency(lastGen, plan.frequency)
      }

      if (today >= nextDate || !plan.last_generated_date) {
        // Generate OS Number
        const year = new Date().getFullYear()
        const { data: latest } = await supabaseClient
          .from('maintenance_tickets')
          .select('ticket_number')
          .eq('client_id', plan.client_id)
          .like('ticket_number', `MAN-${year}-%`)
          .order('created_at', { ascending: false })
          .limit(1)

        let seq = 1
        if (latest && latest.length > 0) {
          const p = latest[0].ticket_number.split('-')
          if (p.length === 3) seq = parseInt(p[2], 10) + 1
        }
        const ticketNumber = `MAN-${year}-${seq.toString().padStart(4, '0')}`

        // Get initial status
        const { data: statusRes } = await supabaseClient
          .from('maintenance_statuses')
          .select('id')
          .eq('client_id', plan.client_id)
          .order('order_index', { ascending: true })
          .limit(1)

        // Get checklist items
        const { data: checklistItems } = await supabaseClient
          .from('maintenance_plan_checklist_items')
          .select('id, description, order_index')
          .eq('plan_id', plan.id)
          .order('order_index', { ascending: true })

        const initialChecklist =
          checklistItems?.map((item) => ({
            item_id: item.id,
            description: item.description,
            status: 'pending',
            notes: '',
          })) || []

        const plannedStart = nextDate.toISOString()
        const endDate = addFrequency(nextDate, plan.frequency)
        const plannedEnd = endDate.toISOString()

        const { data: newTicket } = await supabaseClient
          .from('maintenance_tickets')
          .insert({
            client_id: plan.client_id,
            plant_id: plan.plant_id,
            location_id: plan.location_id,
            asset_id: plan.asset_id,
            type_id: plan.type_id,
            priority_id: plan.priority_id,
            status_id: statusRes?.[0]?.id,
            assignee_id: plan.assignee_id,
            ticket_number: ticketNumber,
            description: `[PREVENTIVA] ${plan.title}\n\n${plan.description || ''}`,
            origin: 'Preventiva',
            plan_id: plan.id,
            planned_start: plannedStart,
            planned_end: plannedEnd,
            checklist_responses: initialChecklist,
          } as any)
          .select()

        if (newTicket) {
          await supabaseClient
            .from('maintenance_preventive_plans')
            .update({ last_generated_date: nextDate.toISOString().split('T')[0] })
            .eq('id', plan.id)
          generatedCount++
        }
      }
    }

    return new Response(JSON.stringify({ success: true, generatedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
