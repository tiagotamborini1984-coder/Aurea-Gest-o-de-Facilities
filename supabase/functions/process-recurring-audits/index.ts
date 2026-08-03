import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

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
    default:
      break
  }
  return d
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

async function logAudit(client: any, clientId: string, actionType: string, details: string) {
  try {
    const { data: admin } = await client
      .from('profiles')
      .select('id')
      .eq('client_id', clientId)
      .in('role', ['Administrador', 'Master'])
      .limit(1)
    await client.from('audit_logs').insert({
      client_id: clientId,
      user_id: admin?.[0]?.id || '00000000-0000-0000-0000-000000000000',
      action_type: actionType,
      details,
    })
  } catch (e) {
    console.error('[process-recurring-audits] Log failed:', e)
  }
}

async function getTaskConfig(client: any, clientId: string) {
  const { data: typeRes } = await client
    .from('task_types')
    .select('id')
    .eq('client_id', clientId)
    .ilike('name', '%Auditoria%')
    .limit(1)
  let typeId = typeRes?.[0]?.id
  if (!typeId) {
    const { data: fb } = await client
      .from('task_types')
      .select('id')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })
      .limit(1)
    typeId = fb?.[0]?.id
  }
  const { data: statusRes } = await client
    .from('task_statuses')
    .select('id')
    .eq('client_id', clientId)
    .eq('is_terminal', false)
    .order('created_at', { ascending: true })
    .limit(1)
  return { typeId, statusId: statusRes?.[0]?.id }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    console.log(`[process-recurring-audits] Starting at ${new Date().toISOString()}`)

    const { data: audits, error: err } = await client
      .from('audits')
      .select('*, audit_assignments(plant_id, assignee_id)')
      .eq('status', 'Ativo')
      .is('parent_audit_id', null)
      .neq('frequency', 'Única')
    if (err) throw err

    console.log(`[process-recurring-audits] Found ${audits?.length || 0} template audits`)
    let generated = 0,
      skipped = 0,
      errors = 0,
      backfill = 0

    for (const audit of audits || []) {
      const assignments = audit.audit_assignments || []
      console.log(
        `[process-recurring-audits] "${audit.title}" (freq: ${audit.frequency}) — ${assignments.length} assignment(s)`,
      )

      if (assignments.length === 0) {
        await logAudit(
          client,
          audit.client_id,
          'audit_no_assignments',
          `Audit "${audit.title}" has no plant assignments.`,
        )
        skipped++
        continue
      }

      const { data: children } = await client
        .from('audits')
        .select('id, start_date')
        .eq('parent_audit_id', audit.id)
      const childIds = (children || []).map((c: any) => c.id)
      const allIds = [audit.id, ...childIds]

      const { data: execs } = await client
        .from('audit_executions')
        .select('id, status, realization_date, created_at, task_id, assignee_id, audit_id')
        .in('audit_id', allIds)
        .order('created_at', { ascending: false })

      const finalized = (execs || []).filter(
        (e: any) => e.status === 'Finalizado' || e.status === 'Finalizada',
      )
      const lastExec = finalized[0]
      const pendingOnParent = (execs || []).find(
        (e: any) => e.audit_id === audit.id && (e.status === 'Pendente' || e.status === 'Rascunho'),
      )

      let nextDue: Date
      if (lastExec) {
        const baseStr = lastExec.realization_date || lastExec.created_at.split('T')[0]
        nextDue = addFrequency(new Date(baseStr + 'T00:00:00Z'), audit.frequency)
      } else {
        if (!audit.start_date) {
          skipped++
          continue
        }
        nextDue = new Date(audit.start_date + 'T00:00:00Z')
      }

      let safety = 0
      while (nextDue < today && safety < 1000) {
        const adv = addFrequency(nextDue, audit.frequency)
        if (adv.getTime() === nextDue.getTime()) break
        nextDue = adv
        safety++
      }

      const advanceNotice = audit.advance_notice_days || 0
      const triggerDate = new Date(nextDue)
      triggerDate.setUTCDate(triggerDate.getUTCDate() - advanceNotice)

      if (today < triggerDate) {
        console.log(
          `[process-recurring-audits] Not yet due for "${audit.title}" — due: ${fmtDate(nextDue)}, trigger: ${fmtDate(triggerDate)}`,
        )
        skipped++
        continue
      }

      const targetStr = fmtDate(nextDue)
      const existingChild = (children || []).find((c: any) => c.start_date === targetStr)
      if (existingChild) {
        console.log(
          `[process-recurring-audits] Child audit exists for "${audit.title}" period ${targetStr}, skipping`,
        )
        skipped++
        continue
      }

      if (!lastExec && pendingOnParent) {
        console.log(
          `[process-recurring-audits] Initial audit pending for "${audit.title}", skipping`,
        )
        skipped++
        continue
      }

      const { data: newAudit, error: newErr } = await client
        .from('audits')
        .insert({
          parent_audit_id: audit.id,
          client_id: audit.client_id,
          title: audit.title,
          type: audit.type,
          frequency: audit.frequency,
          start_date: targetStr,
          status: 'Ativo',
          scoring_settings: audit.scoring_settings,
          sla_days: audit.sla_days,
          advance_notice_days: audit.advance_notice_days,
        })
        .select()
        .single()

      if (newErr) {
        console.error(
          `[process-recurring-audits] Create child failed for "${audit.title}": ${newErr.message}`,
        )
        await logAudit(
          client,
          audit.client_id,
          'audit_creation_failed',
          `Failed for "${audit.title}": ${newErr.message}`,
        )
        errors++
        continue
      }

      const { data: actions } = await client
        .from('audit_actions')
        .select('title, evidence_required, order_index, weight, comments_required')
        .eq('audit_id', audit.id)
        .order('order_index', { ascending: true })
      if (actions?.length) {
        await client.from('audit_actions').insert(
          actions.map((a: any) => ({
            audit_id: newAudit.id,
            title: a.title,
            evidence_required: a.evidence_required,
            order_index: a.order_index,
            weight: a.weight,
            comments_required: a.comments_required,
          })),
        )
      }

      for (const assign of assignments) {
        if (!assign.assignee_id) continue
        await client.from('audit_assignments').insert({
          audit_id: newAudit.id,
          plant_id: assign.plant_id,
          assignee_id: assign.assignee_id,
        })
      }

      console.log(
        `[process-recurring-audits] Created child audit ${newAudit.id} for "${audit.title}" period ${targetStr}`,
      )
      await logAudit(
        client,
        audit.client_id,
        'audit_generated',
        `Generated "${audit.title}" for ${targetStr} (child: ${newAudit.id})`,
      )
      generated++
    }

    const { data: allAudits } = await client
      .from('audits')
      .select('id, title, client_id, sla_days')
      .eq('status', 'Ativo')
    for (const a of allAudits || []) {
      const { data: pending } = await client
        .from('audit_executions')
        .select('id, task_id, plant_id, assignee_id')
        .eq('audit_id', a.id)
        .in('status', ['Pendente', 'Rascunho'])
        .is('task_id', null)
      for (const pe of pending || []) {
        const { typeId, statusId } = await getTaskConfig(client, a.client_id)
        if (!typeId || !statusId) continue
        const { data: admin } = await client
          .from('profiles')
          .select('id')
          .eq('client_id', a.client_id)
          .in('role', ['Administrador', 'Master'])
          .limit(1)
        const reqId = admin?.[0]?.id || pe.assignee_id
        const due =
          a.sla_days != null
            ? new Date(today.getTime() + a.sla_days * 86400000).toISOString()
            : new Date(today.getTime() + 86399999).toISOString()
        const { data: task, error: te } = await client
          .from('tasks')
          .insert({
            client_id: a.client_id,
            plant_id: pe.plant_id,
            type_id: typeId,
            status_id: statusId,
            requester_id: reqId,
            assignee_id: pe.assignee_id,
            task_number: 'GERANDO...',
            title: `Auditoria: ${a.title}`,
            due_date: due,
            status_updated_at: new Date().toISOString(),
            description: `Por favor, realize a auditoria "${a.title}" agendada.`,
            audit_id: a.id,
          })
          .select()
          .single()
        if (te) {
          console.error(`[process-recurring-audits] Backfill failed: ${te.message}`)
          continue
        }
        await client.from('audit_executions').update({ task_id: task.id }).eq('id', pe.id)
        await client
          .from('task_timeline')
          .insert({
            task_id: task.id,
            user_id: reqId,
            content: `Tarefa gerada para "${a.title}".`,
            action_type: 'system',
          })
        backfill++
      }
    }

    console.log(
      `[process-recurring-audits] Done. Generated: ${generated}, Backfilled: ${backfill}, Skipped: ${skipped}, Errors: ${errors}`,
    )
    return new Response(
      JSON.stringify({
        success: true,
        generatedCount: generated,
        backfillCount: backfill,
        skippedCount: skipped,
        errorCount: errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error(`[process-recurring-audits] Error: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
