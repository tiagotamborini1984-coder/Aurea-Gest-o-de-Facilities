import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date.getTime())
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function addMonthsUTC(date: Date, months: number): Date {
  const d = new Date(date.getTime())
  const originalDay = d.getUTCDate()
  d.setUTCMonth(d.getUTCMonth() + months, 1)
  const maxDayInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(originalDay, maxDayInMonth))
  return d
}

function addYearsUTC(date: Date, years: number): Date {
  const d = new Date(date.getTime())
  const originalDay = d.getUTCDate()
  d.setUTCFullYear(d.getUTCFullYear() + years, d.getUTCMonth(), 1)
  const maxDayInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(originalDay, maxDayInMonth))
  return d
}

function addFrequency(date: Date, frequency: string): Date {
  const norm = (frequency || '').trim().toLowerCase()
  switch (norm) {
    case 'diária':
    case 'diaria':
      return addDaysUTC(date, 1)
    case 'semanal':
      return addDaysUTC(date, 7)
    case 'quinzenal':
      return addDaysUTC(date, 15)
    case 'mensal':
      return addMonthsUTC(date, 1)
    case 'bimestral':
      return addMonthsUTC(date, 2)
    case 'trimestral':
      return addMonthsUTC(date, 3)
    case 'semestral':
      return addMonthsUTC(date, 6)
    case 'anual':
      return addYearsUTC(date, 1)
    default:
      return addMonthsUTC(date, 1)
  }
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0]
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

    let body: any = {}
    if (req.method === 'POST') {
      try {
        body = await req.json()
      } catch {
        body = {}
      }
    }

    const filterClientId = body?.client_id || null
    const filterPlantId = body?.plant_id || null
    const filterPlanId = body?.plan_id || null

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const todayStr = fmtDate(today)

    let query = supabaseClient
      .from('maintenance_preventive_plans')
      .select('*')
      .eq('is_active', true)

    if (filterPlanId) {
      query = query.eq('id', filterPlanId)
    } else {
      if (filterClientId) query = query.eq('client_id', filterClientId)
      if (filterPlantId) query = query.eq('plant_id', filterPlantId)
    }

    const { data: plans, error: plansError } = await query

    if (plansError) throw plansError

    let generatedCount = 0
    let evaluatedCount = 0
    const details: any[] = []

    for (const plan of plans || []) {
      evaluatedCount++
      const startDateStr = (plan.start_date || todayStr).split('T')[0]
      const planStart = new Date(startDateStr + 'T00:00:00Z')
      const advanceDays = Math.max(0, Number(plan.advance_days) || 0)

      let nextDue: Date
      if (plan.last_generated_date) {
        const lastGenStr = plan.last_generated_date.split('T')[0]
        const lastGen = new Date(lastGenStr + 'T00:00:00Z')
        nextDue = addFrequency(lastGen, plan.frequency)
      } else {
        nextDue = planStart
      }

      // Se a data calculada ainda estiver no passado distante em relação a hoje e já teve geração,
      // avança respeitando a periodicidade até alcançar ou ultrapassar hoje
      // considerando também os advanceDays
      if (plan.last_generated_date && nextDue < today) {
        let guard = 0
        while (addDaysUTC(nextDue, -advanceDays) < today && nextDue < today && guard < 1000) {
          const adv = addFrequency(nextDue, plan.frequency)
          if (adv.getTime() <= nextDue.getTime()) break
          nextDue = adv
          guard++
        }
      }

      // A OS deve ser gerada quando (data planejada - dias de antecedência) <= hoje
      const triggerDate = addDaysUTC(nextDue, -advanceDays)
      const isDue = today >= triggerDate

      if (!isDue) {
        details.push({
          plan_id: plan.id,
          title: plan.title,
          status: 'skipped_not_due',
          next_due: fmtDate(nextDue),
          trigger_date: fmtDate(triggerDate),
          advance_days: advanceDays,
        })
        continue
      }

      // A data planejada de execução da OS é nextDue (não a data de hoje nem triggerDate)
      const scheduledDateStr = fmtDate(nextDue)

      // Verificar idempotência: já existe OS gerada para este plano nesta data planejada?
      const plannedDayStart = `${scheduledDateStr}T00:00:00.000Z`
      const plannedDayEnd = `${scheduledDateStr}T23:59:59.999Z`

      const { data: existingTicket } = await supabaseClient
        .from('maintenance_tickets')
        .select('id, ticket_number')
        .eq('plan_id', plan.id)
        .gte('planned_start', plannedDayStart)
        .lte('planned_start', plannedDayEnd)
        .limit(1)

      if (existingTicket && existingTicket.length > 0) {
        // Atualiza last_generated_date se estiver defasada
        if (!plan.last_generated_date || plan.last_generated_date < scheduledDateStr) {
          await supabaseClient
            .from('maintenance_preventive_plans')
            .update({ last_generated_date: scheduledDateStr })
            .eq('id', plan.id)
        }
        details.push({
          plan_id: plan.id,
          title: plan.title,
          status: 'already_generated',
          ticket_number: existingTicket[0].ticket_number,
        })
        continue
      }

      // Determinar número sequencial da OS (atômico por client e ano)
      const year = new Date().getFullYear()
      const { data: latestTickets } = await supabaseClient
        .from('maintenance_tickets')
        .select('ticket_number')
        .eq('client_id', plan.client_id)
        .like('ticket_number', `MAN-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(20)

      let maxSeq = 0
      if (latestTickets && latestTickets.length > 0) {
        for (const t of latestTickets) {
          const parts = (t.ticket_number || '').split('-')
          if (parts.length === 3) {
            const num = parseInt(parts[2], 10)
            if (!isNaN(num) && num > maxSeq) maxSeq = num
          }
        }
      }
      const seq = maxSeq + 1
      const ticketNumber = `MAN-${year}-${seq.toString().padStart(4, '0')}`

      // Buscar status inicial padrão para manutenção preventiva
      // Preferência: 'Planejado' > 'Aberto' > primeiro não-terminal
      const { data: clientStatuses } = await supabaseClient
        .from('maintenance_statuses')
        .select('id, name, step, is_terminal')
        .eq('client_id', plan.client_id)
        .order('order_index', { ascending: true })

      let initialStatusId: string | null = null
      if (clientStatuses && clientStatuses.length > 0) {
        const planejado = clientStatuses.find(
          (s) => s.step === 'Planejado' || (s.name || '').toLowerCase() === 'planejado',
        )
        const aberto = clientStatuses.find(
          (s) => s.step === 'Aberto' || (s.name || '').toLowerCase() === 'aberto',
        )
        const nonTerminal = clientStatuses.find((s) => !s.is_terminal)

        initialStatusId = planejado?.id || aberto?.id || nonTerminal?.id || clientStatuses[0].id
      }

      // Buscar itens do checklist configurados para este plano
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

      const plannedStart = `${scheduledDateStr}T08:00:00.000Z`
      const endCalc = addFrequency(new Date(scheduledDateStr + 'T00:00:00Z'), plan.frequency)
      const plannedEnd = `${fmtDate(endCalc)}T18:00:00.000Z`

      const insertPayload: any = {
        client_id: plan.client_id,
        plant_id: plan.plant_id,
        area_id: plan.area_id || null,
        location_id: plan.location_id || null,
        asset_id: plan.asset_id || null,
        type_id: plan.type_id || null,
        priority_id: plan.priority_id || null,
        status_id: initialStatusId,
        assignee_id: plan.assignee_id || null,
        ticket_number: ticketNumber,
        description: `[PREVENTIVA] ${plan.title}\n\n${plan.description || ''}`.trim(),
        origin: 'Preventiva',
        plan_id: plan.id,
        planned_start: plannedStart,
        planned_end: plannedEnd,
        checklist_responses: initialChecklist,
      }

      const { data: newTicket, error: insertError } = await supabaseClient
        .from('maintenance_tickets')
        .insert(insertPayload)
        .select()
        .single()

      if (insertError) {
        console.error(`Error inserting ticket for plan ${plan.id}:`, insertError)
        details.push({
          plan_id: plan.id,
          title: plan.title,
          status: 'error',
          error: insertError.message,
        })
        continue
      }

      // Atualiza last_generated_date do plano preventivo
      await supabaseClient
        .from('maintenance_preventive_plans')
        .update({ last_generated_date: scheduledDateStr })
        .eq('id', plan.id)

      generatedCount++
      details.push({
        plan_id: plan.id,
        title: plan.title,
        status: 'generated',
        ticket_number: ticketNumber,
        ticket_id: newTicket.id,
        scheduled_date: scheduledDateStr,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        evaluatedCount,
        generatedCount,
        details,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error: any) {
    console.error('process-preventive-maintenance error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
