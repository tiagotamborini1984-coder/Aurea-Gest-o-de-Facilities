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
    case 'Quinzenal':
      d.setUTCDate(d.getUTCDate() + 15)
      break
    case 'Mensal':
      d.setUTCMonth(d.getUTCMonth() + 1)
      break
    case 'Trimestral':
      d.setUTCMonth(d.getUTCMonth() + 3)
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

async function logAuditError(
  supabaseClient: any,
  clientId: string,
  actionType: string,
  details: string,
) {
  try {
    const { data: adminUser } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('client_id', clientId)
      .in('role', ['Administrador', 'Master'])
      .limit(1)

    const userId = adminUser?.[0]?.id || '00000000-0000-0000-0000-000000000000'

    await supabaseClient.from('audit_logs').insert({
      client_id: clientId,
      user_id: userId,
      action_type: actionType,
      details,
    })
  } catch (e) {
    console.error('[process-recurring-audits] Failed to log audit error:', e)
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

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    console.log(`[process-recurring-audits] Starting run at ${new Date().toISOString()}`)

    const { data: audits, error: auditsError } = await supabaseClient
      .from('audits')
      .select(`*, audit_assignments (plant_id, assignee_id)`)
      .eq('status', 'Ativo')

    if (auditsError) throw auditsError

    console.log(`[process-recurring-audits] Found ${audits?.length || 0} active audits`)

    let generatedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const audit of audits || []) {
      const assignments = audit.audit_assignments || []
      console.log(
        `[process-recurring-audits] Audit "${audit.title}" (freq: ${audit.frequency}, start: ${audit.start_date}) — ${assignments.length} assignment(s)`,
      )

      if (assignments.length === 0) {
        console.log(`[process-recurring-audits] No assignments for "${audit.title}", skipping`)
        await logAuditError(
          supabaseClient,
          audit.client_id,
          'audit_no_assignments',
          `Audit "${audit.title}" (ID: ${audit.id}) has no plant assignments.`,
        )
        continue
      }

      const { data: typeRes } = await supabaseClient
        .from('task_types')
        .select('id')
        .eq('client_id', audit.client_id)
        .ilike('name', '%Auditoria%')
        .limit(1)

      let typeId = typeRes?.[0]?.id

      if (!typeId) {
        const { data: fallback } = await supabaseClient
          .from('task_types')
          .select('id')
          .eq('client_id', audit.client_id)
          .order('created_at', { ascending: true })
          .limit(1)
        typeId = fallback?.[0]?.id
      }

      const { data: statusRes } = await supabaseClient
        .from('task_statuses')
        .select('id')
        .eq('client_id', audit.client_id)
        .eq('is_terminal', false)
        .order('created_at', { ascending: true })
        .limit(1)

      const statusId = statusRes?.[0]?.id

      if (!typeId || !statusId) {
        console.log(
          `[process-recurring-audits] Missing config for client ${audit.client_id}, skipping "${audit.title}"`,
        )
        await logAuditError(
          supabaseClient,
          audit.client_id,
          'audit_missing_config',
          `Audit "${audit.title}" (ID: ${audit.id}): missing ${!typeId ? 'task_type (Auditoria)' : ''}${!typeId && !statusId ? ' and ' : ''}${!statusId ? 'non-terminal task_status' : ''}.`,
        )
        errorCount++
        skippedCount++
        continue
      }

      const { data: openStatuses } = await supabaseClient
        .from('task_statuses')
        .select('id')
        .eq('client_id', audit.client_id)
        .eq('is_terminal', false)
      const openStatusIds = openStatuses?.map((s) => s.id) || [statusId]

      for (const assign of assignments) {
        if (!assign.assignee_id) {
          console.log(
            `[process-recurring-audits] No assignee for "${audit.title}" plant ${assign.plant_id}`,
          )
          await logAuditError(
            supabaseClient,
            audit.client_id,
            'audit_missing_assignee',
            `Audit "${audit.title}" (ID: ${audit.id}) has no assignee for plant ${assign.plant_id}.`,
          )
          errorCount++
          skippedCount++
          continue
        }

        const { data: existingExecs } = await supabaseClient
          .from('audit_executions')
          .select('id, status, realization_date, created_at, task_id, assignee_id')
          .eq('audit_id', audit.id)
          .eq('plant_id', assign.plant_id)
          .order('created_at', { ascending: false })

        const pendingExec = (existingExecs || []).find(
          (e) => e.status === 'Pendente' || e.status === 'Rascunho',
        )

        if (pendingExec) {
          if (pendingExec.assignee_id !== assign.assignee_id) {
            await supabaseClient
              .from('audit_executions')
              .update({ assignee_id: assign.assignee_id })
              .eq('id', pendingExec.id)
            if (pendingExec.task_id) {
              await supabaseClient
                .from('tasks')
                .update({ assignee_id: assign.assignee_id })
                .eq('id', pendingExec.task_id)
            }
          }
          console.log(
            `[process-recurring-audits] Pending exec exists for "${audit.title}" plant ${assign.plant_id}, skipping`,
          )
          skippedCount++
          continue
        }

        let nextDueDate: Date

        if (existingExecs && existingExecs.length > 0) {
          if (audit.frequency === 'Única') {
            skippedCount++
            continue
          }
          const lastExec = existingExecs.find((e) => e.status === 'Finalizado') || existingExecs[0]
          const baseDateStr = lastExec.realization_date || lastExec.created_at.split('T')[0]
          nextDueDate = addFrequency(new Date(baseDateStr + 'T00:00:00Z'), audit.frequency)
        } else {
          nextDueDate = new Date(audit.start_date + 'T00:00:00Z')
        }

        if (audit.frequency !== 'Única') {
          let safety = 0
          while (nextDueDate < today && safety < 1000) {
            const advanced = addFrequency(nextDueDate, audit.frequency)
            if (advanced.getTime() === nextDueDate.getTime()) {
              console.log(
                `[process-recurring-audits] Unknown freq "${audit.frequency}" for "${audit.title}", cannot advance`,
              )
              break
            }
            nextDueDate = advanced
            safety++
          }
        }

        const advanceNotice = audit.advance_notice_days || 0
        const triggerDate = new Date(nextDueDate)
        triggerDate.setUTCDate(triggerDate.getUTCDate() - advanceNotice)

        if (today < triggerDate) {
          console.log(
            `[process-recurring-audits] Not yet due for "${audit.title}" — due: ${nextDueDate.toISOString().split('T')[0]}, trigger: ${triggerDate.toISOString().split('T')[0]}`,
          )
          skippedCount++
          continue
        }

        const taskTitle = `Auditoria: ${audit.title}`

        const { data: existingTasks } = await supabaseClient
          .from('tasks')
          .select('id')
          .eq('client_id', audit.client_id)
          .eq('plant_id', assign.plant_id)
          .eq('type_id', typeId)
          .eq('title', taskTitle)
          .in('status_id', openStatusIds)
          .limit(1)

        if (existingTasks && existingTasks.length > 0) {
          console.log(
            `[process-recurring-audits] Open task exists for "${audit.title}" plant ${assign.plant_id}, skipping`,
          )
          skippedCount++
          continue
        }

        const { data: adminUser } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('client_id', audit.client_id)
          .in('role', ['Administrador', 'Master'])
          .limit(1)
        const requesterId = adminUser?.[0]?.id || assign.assignee_id

        const targetDateStr = nextDueDate.toISOString().split('T')[0]
        const targetDateTime = new Date(`${targetDateStr}T00:00:00.000Z`)
        const calculatedDueDate =
          audit.sla_days != null
            ? new Date(targetDateTime.getTime() + audit.sla_days * 86400000).toISOString()
            : new Date(targetDateTime.getTime() + 86399999).toISOString()

        const taskDesc = `Por favor, realize a auditoria "${audit.title}" agendada para ${targetDateStr.split('-').reverse().join('/')}. Acesse os detalhes da tarefa para preencher o checklist.`

        const { data: newTask, error: taskError } = await supabaseClient
          .from('tasks')
          .insert({
            client_id: audit.client_id,
            plant_id: assign.plant_id,
            type_id: typeId,
            status_id: statusId,
            requester_id: requesterId,
            assignee_id: assign.assignee_id,
            task_number: 'GERANDO...',
            title: taskTitle,
            description: taskDesc,
            due_date: calculatedDueDate,
            status_updated_at: new Date().toISOString(),
          } as any)
          .select()
          .single()

        if (taskError) {
          console.error(
            `[process-recurring-audits] Task creation failed for "${audit.title}":`,
            taskError.message,
          )
          await logAuditError(
            supabaseClient,
            audit.client_id,
            'audit_task_creation_failed',
            `Audit "${audit.title}" (ID: ${audit.id}) plant ${assign.plant_id}. Error: ${taskError.message}`,
          )
          errorCount++
          continue
        }

        const { error: execError } = await supabaseClient.from('audit_executions').insert({
          audit_id: audit.id,
          task_id: newTask.id,
          assignee_id: assign.assignee_id,
          plant_id: assign.plant_id,
          status: 'Pendente',
        } as any)

        if (execError) {
          console.error(
            `[process-recurring-audits] Execution creation failed for "${audit.title}":`,
            execError.message,
          )
          await logAuditError(
            supabaseClient,
            audit.client_id,
            'audit_execution_creation_failed',
            `Audit "${audit.title}" (ID: ${audit.id}) task ${newTask.id}. Error: ${execError.message}`,
          )
          errorCount++
        } else {
          generatedCount++
          console.log(
            `[process-recurring-audits] Created task+execution for "${audit.title}" plant ${assign.plant_id}`,
          )
        }
      }
    }

    console.log(
      `[process-recurring-audits] Done. Generated: ${generatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
    )

    return new Response(
      JSON.stringify({ success: true, generatedCount, skippedCount, errorCount }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error: any) {
    console.error(`[process-recurring-audits] Error: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
