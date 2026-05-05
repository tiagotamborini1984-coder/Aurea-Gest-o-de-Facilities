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
    case 'Única':
    default:
      break
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

    const { data: audits, error: auditsError } = await supabaseClient.from('audits').select(`
        *,
        audit_assignments (
          plant_id,
          assignee_id
        )
      `)

    if (auditsError) throw auditsError

    let generatedCount = 0

    for (const audit of audits || []) {
      let { data: typeRes } = await supabaseClient
        .from('task_types')
        .select('id')
        .eq('client_id', audit.client_id)
        .ilike('name', '%Auditoria%')
        .limit(1)

      let typeId = typeRes?.[0]?.id

      if (!typeId) {
        let { data: fallbackTypeRes } = await supabaseClient
          .from('task_types')
          .select('id')
          .eq('client_id', audit.client_id)
          .order('created_at', { ascending: true })
          .limit(1)
        typeId = fallbackTypeRes?.[0]?.id
      }

      let { data: statusRes } = await supabaseClient
        .from('task_statuses')
        .select('id')
        .eq('client_id', audit.client_id)
        .eq('is_terminal', false)
        .order('created_at', { ascending: true })
        .limit(1)

      let statusId = statusRes?.[0]?.id

      if (!typeId || !statusId) {
        continue
      }

      for (const assign of audit.audit_assignments) {
        const { data: existingExecs } = await supabaseClient
          .from('audit_executions')
          .select('id, status, realization_date, created_at')
          .eq('audit_id', audit.id)
          .eq('assignee_id', assign.assignee_id)
          .eq('plant_id', assign.plant_id)
          .order('created_at', { ascending: false })

        const hasPending = (existingExecs || []).some((e) => e.status === 'Pendente')
        if (hasPending) continue

        let nextDueDate: Date

        if (existingExecs && existingExecs.length > 0) {
          if (audit.frequency === 'Única') continue

          const lastExec = existingExecs.find((e) => e.status === 'Finalizado') || existingExecs[0]
          const baseDateStr = lastExec.realization_date || lastExec.created_at.split('T')[0]
          const baseDate = new Date(baseDateStr + 'T00:00:00Z')
          nextDueDate = addFrequency(baseDate, audit.frequency)
        } else {
          nextDueDate = new Date(audit.start_date + 'T00:00:00Z')
        }

        const advanceNotice = audit.advance_notice_days || 0
        const triggerDate = new Date(nextDueDate)
        triggerDate.setUTCDate(triggerDate.getUTCDate() - advanceNotice)

        if (today >= triggerDate) {
          const { data: createdToday } = await supabaseClient
            .from('audit_executions')
            .select('id')
            .eq('audit_id', audit.id)
            .eq('assignee_id', assign.assignee_id)
            .eq('plant_id', assign.plant_id)
            .gte('created_at', todayStr + 'T00:00:00Z')

          if (createdToday && createdToday.length > 0) {
            continue
          }

          const { data: adminUser } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('client_id', audit.client_id)
            .in('role', ['Administrador', 'Master'])
            .limit(1)

          const requesterId = adminUser?.[0]?.id || assign.assignee_id

          const year = new Date().getFullYear()
          const { data: latest } = await supabaseClient
            .from('tasks')
            .select('task_number')
            .eq('client_id', audit.client_id)
            .like('task_number', `TSK-${year}-%`)
            .order('created_at', { ascending: false })
            .limit(1)

          let seq = 1
          if (latest && latest.length > 0) {
            const p = latest[0].task_number.split('-')
            if (p.length === 3) seq = parseInt(p[2], 10) + 1
          }
          const taskNumber = `TSK-${year}-${seq.toString().padStart(4, '0')}`

          // Calculate SLA based on creation date + periodicidade
          const creationDate = new Date()
          creationDate.setUTCHours(0, 0, 0, 0)

          let targetDateStr = audit.start_date
          if (audit.frequency !== 'Única') {
            const slaDate = addFrequency(creationDate, audit.frequency)
            targetDateStr = slaDate.toISOString().split('T')[0]
          }

          const { data: newTask } = await supabaseClient
            .from('tasks')
            .insert({
              client_id: audit.client_id,
              plant_id: assign.plant_id,
              type_id: typeId,
              status_id: statusId,
              requester_id: requesterId,
              assignee_id: assign.assignee_id,
              task_number: taskNumber,
              title: `Auditoria: ${audit.title}`,
              description: `Por favor, realize a auditoria "${audit.title}" agendada para ${targetDateStr.split('-').reverse().join('/')}. Acesse os detalhes da tarefa para preencher o checklist.`,
              due_date: new Date(`${targetDateStr}T23:59:59.999Z`).toISOString(),
              status_updated_at: new Date().toISOString(),
            } as any)
            .select()
            .single()

          if (newTask) {
            await supabaseClient.from('audit_executions').insert({
              audit_id: audit.id,
              task_id: newTask.id,
              assignee_id: assign.assignee_id,
              plant_id: assign.plant_id,
              status: 'Pendente',
            } as any)
            generatedCount++
          }
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
