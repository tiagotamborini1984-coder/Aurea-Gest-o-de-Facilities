import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

const BRAZIL_TZ = 'America/Sao_Paulo'

/**
 * Retorna a data no calendário civil do Brasil no formato YYYY-MM-DD.
 */
function getBrazilDateStr(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  return `${y}-${m}-${d}`
}

/**
 * Constrói um Date UTC a partir de "YYYY-MM-DD" para operações aritméticas de calendário.
 */
function parseDateUTC(dateStr: string): Date {
  const clean = (dateStr || '').split('T')[0]
  return new Date(`${clean}T00:00:00.000Z`)
}

function fmtDateUTC(d: Date): string {
  return d.toISOString().split('T')[0]
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

/**
 * Interpreta todas as periodicidades configuradas no formulário de Preventivas.
 * Suporta normalização de acentos, maiúsculas e espaços.
 */
function addFrequency(date: Date, frequency: string): Date {
  const norm = (frequency || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  switch (norm) {
    case 'diaria':
    case 'diario':
    case 'dia':
    case 'daily':
      return addDaysUTC(date, 1)
    case 'semanal':
    case 'semana':
    case 'weekly':
      return addDaysUTC(date, 7)
    case 'quinzenal':
    case 'quinzena':
    case 'biweekly':
    case 'fortnightly':
      return addDaysUTC(date, 15)
    case 'mensal':
    case 'mes':
    case 'monthly':
      return addMonthsUTC(date, 1)
    case 'bimestral':
    case 'bimonthly':
      return addMonthsUTC(date, 2)
    case 'trimestral':
    case 'quarterly':
      return addMonthsUTC(date, 3)
    case 'semestral':
    case 'biannual':
    case 'semiannual':
      return addMonthsUTC(date, 6)
    case 'anual':
    case 'ano':
    case 'yearly':
    case 'annual':
      return addYearsUTC(date, 1)
    default:
      return addMonthsUTC(date, 1)
  }
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

    // Data de referência no fuso horário do Brasil (America/Sao_Paulo)
    // Evita deslocamento do dia entre 00h e 03h BRT quando o servidor roda em UTC
    const todayStr = getBrazilDateStr()
    const today = parseDateUTC(todayStr)

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
      const planStart = parseDateUTC(startDateStr)
      const advanceDays = Math.max(0, Number(plan.advance_days) || 0)

      let nextDue: Date
      if (plan.last_generated_date) {
        const lastGen = parseDateUTC(plan.last_generated_date)
        nextDue = addFrequency(lastGen, plan.frequency)
      } else {
        nextDue = planStart
      }

      // Loop de avanço ("catch-up"):
      // Caso 1: Já teve geração, mas nextDue ainda está no passado distante.
      // Caso 2: Não tem geração anterior, mas a data inicial (start_date) já está no passado.
      // Em ambos os casos, avança respeitando a periodicidade até alcançar a ocorrência atual
      // onde a data de disparo (nextDue - advanceDays) alcança hoje, ou nextDue >= hoje.
      // Guard contra loop infinito (máx 1000 iterações).
      if (nextDue.getTime() < today.getTime()) {
        let guard = 0
        while (
          addDaysUTC(nextDue, -advanceDays).getTime() < today.getTime() &&
          nextDue.getTime() < today.getTime() &&
          guard < 1000
        ) {
          const adv = addFrequency(nextDue, plan.frequency)
          if (adv.getTime() <= nextDue.getTime()) break
          nextDue = adv
          guard++
        }
      }

      // A OS deve ser gerada quando (data planejada - dias de antecedência) <= hoje
      const triggerDate = addDaysUTC(nextDue, -advanceDays)
      const isDue = today.getTime() >= triggerDate.getTime()

      if (!isDue) {
        details.push({
          plan_id: plan.id,
          title: plan.title,
          status: 'skipped_not_due',
          next_due: fmtDateUTC(nextDue),
          trigger_date: fmtDateUTC(triggerDate),
          advance_days: advanceDays,
        })
        continue
      }

      // A data planejada de execução da OS é nextDue
      const scheduledDateStr = fmtDateUTC(nextDue)

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
      const year = todayStr.split('-')[0]
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

      // Correção da data fim: planned_end deve ser o fim do MESMO dia planejado (18:00 do próprio scheduledDateStr),
      // e NUNCA a ocorrência do próximo período.
      const plannedStart = `${scheduledDateStr}T08:00:00.000Z`
      const plannedEnd = `${scheduledDateStr}T18:00:00.000Z`

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

      // Atualiza last_generated_date do plano preventivo com a data planejada executada
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
