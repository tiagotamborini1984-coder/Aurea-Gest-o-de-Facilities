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

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

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
      const advanceNotice = audit.advance_notice_days || 0
      const targetDate = new Date(today)
      targetDate.setUTCDate(targetDate.getUTCDate() + advanceNotice)

      const targetDateStr = targetDate.toISOString().split('T')[0]

      if (!isOccurrence(audit.start_date, targetDateStr, audit.frequency)) {
        continue
      }

      let { data: typeRes } = await supabaseClient
        .from('task_types')
        .select('id')
        .eq('client_id', audit.client_id)
        .ilike('name', '%Auditoria%')
        .limit(1)
      let typeId = typeRes?.[0]?.id

      if (!typeId) {
        const { data: newType } = await supabaseClient
          .from('task_types')
          .insert({ client_id: audit.client_id, name: 'Auditoria', sla_hours: 24 } as any)
          .select('id')
          .single()
        typeId = newType?.id
      }

      let { data: statusRes } = await supabaseClient
        .from('task_statuses')
        .select('id')
        .eq('client_id', audit.client_id)
        .eq('is_terminal', false)
        .order('created_at', { ascending: true })
        .limit(1)
      let statusId = statusRes?.[0]?.id

      if (!statusId) {
        const { data: newStatus } = await supabaseClient
          .from('task_statuses')
          .insert({
            client_id: audit.client_id,
            name: 'Pendente',
            color: '#eab308',
            is_terminal: false,
          } as any)
          .select('id')
          .single()
        statusId = newStatus?.id
      }

      if (!typeId || !statusId) continue

      for (const assign of audit.audit_assignments) {
        const { data: existingExec } = await supabaseClient
          .from('audit_executions')
          .select('id')
          .eq('audit_id', audit.id)
          .eq('assignee_id', assign.assignee_id)
          .eq('plant_id', assign.plant_id)
          .eq('status', 'Pendente')

        if (!existingExec || existingExec.length === 0) {
          const todayStr = today.toISOString().split('T')[0]
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

function isOccurrence(startDateStr: string, targetDateStr: string, frequency: string): boolean {
  const start = new Date(startDateStr + 'T00:00:00Z')
  const target = new Date(targetDateStr + 'T00:00:00Z')

  if (target < start) return false

  const diffTime = target.getTime() - start.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  switch (frequency) {
    case 'Única':
      return diffDays === 0
    case 'Diária':
      return diffDays >= 0
    case 'Semanal':
      return diffDays % 7 === 0
    case 'Mensal': {
      const startYear = start.getUTCFullYear()
      const startMonth = start.getUTCMonth()
      const targetYear = target.getUTCFullYear()
      const targetMonth = target.getUTCMonth()

      const monthDiff = (targetYear - startYear) * 12 + (targetMonth - startMonth)
      if (monthDiff < 0) return false

      const startDay = start.getUTCDate()
      const targetDay = target.getUTCDate()
      const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
      const expectedDay = Math.min(startDay, daysInTargetMonth)

      return targetDay === expectedDay
    }
    case 'Semestral': {
      const startYear = start.getUTCFullYear()
      const startMonth = start.getUTCMonth()
      const targetYear = target.getUTCFullYear()
      const targetMonth = target.getUTCMonth()

      const monthDiff = (targetYear - startYear) * 12 + (targetMonth - startMonth)
      if (monthDiff < 0 || monthDiff % 6 !== 0) return false

      const startDay = start.getUTCDate()
      const targetDay = target.getUTCDate()
      const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
      const expectedDay = Math.min(startDay, daysInTargetMonth)

      return targetDay === expectedDay
    }
    case 'Anual': {
      const startYear = start.getUTCFullYear()
      const startMonth = start.getUTCMonth()
      const targetYear = target.getUTCFullYear()
      const targetMonth = target.getUTCMonth()

      if (targetYear < startYear || targetMonth !== startMonth) return false

      const startDay = start.getUTCDate()
      const targetDay = target.getUTCDate()
      const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
      const expectedDay = Math.min(startDay, daysInTargetMonth)

      return targetDay === expectedDay
    }
    default:
      return false
  }
}
