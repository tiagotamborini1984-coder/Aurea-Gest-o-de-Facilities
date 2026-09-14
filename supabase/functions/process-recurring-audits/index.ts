import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

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
      return new Date(date.getTime())
  }
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

async function ensureTaskForAudit(
  client: any,
  audit: { id: string; client_id: string; title: string; sla_days: number | null },
  assignment: { plant_id: string; assignee_id: string },
  today: Date,
): Promise<boolean> {
  const { data: existingTask } = await client
    .from('tasks')
    .select('id')
    .eq('audit_id', audit.id)
    .eq('plant_id', assignment.plant_id)
    .limit(1)
  if (existingTask?.length > 0) return false

  const { typeId, statusId } = await getTaskConfig(client, audit.client_id)
  if (!typeId || !statusId) return false

  const { data: admin } = await client
    .from('profiles')
    .select('id')
    .eq('client_id', audit.client_id)
    .in('role', ['Administrador', 'Master'])
    .limit(1)
  const reqId = admin?.[0]?.id || assignment.assignee_id

  const due =
    audit.sla_days != null
      ? new Date(today.getTime() + audit.sla_days * 86400000).toISOString()
      : new Date(today.getTime() + 86399999).toISOString()

  const { data: task, error: te } = await client
    .from('tasks')
    .insert({
      client_id: audit.client_id,
      plant_id: assignment.plant_id,
      type_id: typeId,
      status_id: statusId,
      requester_id: reqId,
      assignee_id: assignment.assignee_id,
      task_number: 'GERANDO...',
      title: `Auditoria: ${audit.title}`,
      due_date: due,
      status_updated_at: new Date().toISOString(),
      description: `Por favor, realize a auditoria "${audit.title}" agendada.`,
      audit_id: audit.id,
    })
    .select()
    .single()

  if (te) {
    console.error(
      `[process-recurring-audits] Task creation failed for audit "${audit.title}": ${te.message}`,
    )
    return false
  }

  const { data: existingExec } = await client
    .from('audit_executions')
    .select('id, task_id')
    .eq('audit_id', audit.id)
    .eq('plant_id', assignment.plant_id)
    .in('status', ['Pendente', 'Rascunho'])
    .limit(1)

  if (existingExec?.length > 0) {
    if (!existingExec[0].task_id) {
      await client
        .from('audit_executions')
        .update({ task_id: task.id })
        .eq('id', existingExec[0].id)
    }
  } else {
    await client.from('audit_executions').insert({
      audit_id: audit.id,
      task_id: task.id,
      assignee_id: assignment.assignee_id,
      plant_id: assignment.plant_id,
      status: 'Pendente',
    })
  }

  await client.from('task_timeline').insert({
    task_id: task.id,
    user_id: reqId,
    content: `Tarefa gerada para "${audit.title}".`,
    action_type: 'system',
  })
  return true
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
      backfill = 0,
      tasksCreated = 0

    for (const audit of audits || []) {
      const parentAssignments = audit.audit_assignments || []
      console.log(
        `[process-recurring-audits] "${audit.title}" (freq: ${audit.frequency}) — ${parentAssignments.length} parent assignment(s)`,
      )

      if (parentAssignments.length === 0) {
        await logAudit(
          client,
          audit.client_id,
          'audit_no_assignments',
          `Audit "${audit.title}" has no plant assignments.`,
        )
        skipped++
        continue
      }

      // 1. Buscar todos os children existentes deste template
      const { data: children } = await client
        .from('audits')
        .select('id, start_date')
        .eq('parent_audit_id', audit.id)

      const childIds: string[] = (children || []).map((c: any) => c.id)
      const allAuditIds = [audit.id, ...childIds]

      // 2. Buscar todas as atribuições (audit_assignments) de toda a árvore
      const { data: allAssignments } = await client
        .from('audit_assignments')
        .select('audit_id, plant_id, assignee_id')
        .in('audit_id', allAuditIds)

      // 3. Buscar todas as execuções (audit_executions) de toda a árvore
      const { data: allExecs } = await client
        .from('audit_executions')
        .select(
          'id, status, realization_date, created_at, task_id, assignee_id, audit_id, plant_id',
        )
        .in('audit_id', allAuditIds)
        .order('created_at', { ascending: false })

      // Mapa rápido de child_id -> start_date
      const childStartDateMap = new Map<string, string>()
      for (const c of children || []) {
        if (c.start_date) childStartDateMap.set(c.id, c.start_date.split('T')[0])
      }

      // Para cada planta vinculada no template parent, processar o ciclo de forma INDEPENDENTE
      for (const parentAssign of parentAssignments) {
        const plantId = parentAssign.plant_id
        if (!plantId) continue

        // Descobrir o assignee_id da planta (preferir o do template parent; fallback para o último conhecido)
        let plantAssigneeId = parentAssign.assignee_id
        if (!plantAssigneeId) {
          const prevAssign = (allAssignments || []).find(
            (a: any) => a.plant_id === plantId && !!a.assignee_id,
          )
          if (prevAssign) plantAssigneeId = prevAssign.assignee_id
        }

        if (!plantAssigneeId) {
          console.log(
            `[process-recurring-audits] Plant ${plantId} for "${audit.title}" has no assignee. Skipping.`,
          )
          skipped++
          continue
        }

        // Determinar todos os children que pertenceram ou pertencem a ESTA planta
        // Um child pertence a esta planta se houver audit_assignment para plantId OU audit_execution para plantId
        const plantChildIds = new Set<string>()
        for (const a of allAssignments || []) {
          if (a.plant_id === plantId && a.audit_id !== audit.id) {
            plantChildIds.add(a.audit_id)
          }
        }
        for (const e of allExecs || []) {
          if (e.plant_id === plantId && e.audit_id !== audit.id) {
            plantChildIds.add(e.audit_id)
          }
        }

        // Obter os children da planta com suas start_dates
        const plantChildList: Array<{ id: string; start_date: string }> = []
        for (const cId of plantChildIds) {
          const sDate = childStartDateMap.get(cId)
          if (sDate) {
            plantChildList.push({ id: cId, start_date: sDate })
          }
        }
        plantChildList.sort((a, b) =>
          a.start_date > b.start_date ? -1 : a.start_date < b.start_date ? 1 : 0,
        )
        const latestPlantChild = plantChildList[0]

        // Obter execuções DESTA planta
        const plantExecs = (allExecs || []).filter((e: any) => e.plant_id === plantId)

        const finalizedPlantExecs = plantExecs
          .filter((e: any) => e.status === 'Finalizado' || e.status === 'Finalizada')
          .sort((a: any, b: any) => {
            if (a.realization_date && b.realization_date) {
              return new Date(b.realization_date).getTime() - new Date(a.realization_date).getTime()
            }
            if (a.realization_date) return -1
            if (b.realization_date) return 1
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
        const lastPlantExec = finalizedPlantExecs[0]

        // Verificar se há execução pendente/rascunho no parent para ESTA planta
        const pendingOnParentForPlant = plantExecs.find(
          (e: any) =>
            e.audit_id === audit.id && (e.status === 'Pendente' || e.status === 'Rascunho'),
        )

        // CALCULAR nextDue INDEPENDENTE PARA ESTA PLANTA
        let nextDue: Date
        if (latestPlantChild && latestPlantChild.start_date) {
          // Regra primária: ancorar na start_date do child mais recente DESTA PLANTA
          const baseStr = latestPlantChild.start_date.split('T')[0]
          nextDue = addFrequency(new Date(baseStr + 'T00:00:00Z'), audit.frequency)
        } else if (lastPlantExec && lastPlantExec.realization_date) {
          // Fallback 1: se não houver child para esta planta, usar a realization_date da última execução finalizada desta planta
          const baseStr = lastPlantExec.realization_date.split('T')[0]
          nextDue = addFrequency(new Date(baseStr + 'T00:00:00Z'), audit.frequency)
        } else {
          // Fallback 2: audit.start_date do template
          if (!audit.start_date) {
            console.log(
              `[process-recurring-audits] Audit "${audit.title}" plant ${plantId} has no start_date and no previous children/executions. Skipping.`,
            )
            skipped++
            continue
          }
          nextDue = new Date(audit.start_date.split('T')[0] + 'T00:00:00Z')
        }

        // Avançar nextDue em passos de frequência até alcançar hoje ou data futura
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
            `[process-recurring-audits] Not yet due for "${audit.title}" (plant: ${plantId}) — due: ${fmtDate(nextDue)}, trigger: ${fmtDate(triggerDate)}`,
          )
          skipped++
          continue
        }

        const targetStr = fmtDate(nextDue)

        // DEDUPLICAÇÃO POR PLANTA:
        // Verificar se já existe child para ESTA PLANTA com start_date === targetStr
        const existingPlantChildForDate = plantChildList.find((c) => c.start_date === targetStr)
        if (existingPlantChildForDate) {
          console.log(
            `[process-recurring-audits] Child audit already exists for "${audit.title}" plant ${plantId} period ${targetStr}, ensuring tasks...`,
          )
          const created = await ensureTaskForAudit(
            client,
            {
              id: existingPlantChildForDate.id,
              client_id: audit.client_id,
              title: audit.title,
              sla_days: audit.sla_days,
            },
            { plant_id: plantId, assignee_id: plantAssigneeId },
            today,
          )
          if (created) {
            tasksCreated++
            backfill++
          }
          skipped++
          continue
        }

        // PROTEÇÃO POR PLANTA: se a auditoria inicial no parent ainda está pendente/rascunho para esta planta e nunca foi finalizada nenhuma execução nesta planta
        if (!lastPlantExec && pendingOnParentForPlant) {
          console.log(
            `[process-recurring-audits] Initial audit pending for "${audit.title}" on plant ${plantId}, skipping`,
          )
          skipped++
          continue
        }

        // CRIAÇÃO DO NOVO CHILD AUDIT PARA ESTA PLANTA NOVO CICLO
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
            `[process-recurring-audits] Create child failed for "${audit.title}" plant ${plantId}: ${newErr.message}`,
          )
          await logAudit(
            client,
            audit.client_id,
            'audit_creation_failed',
            `Failed for "${audit.title}" plant ${plantId}: ${newErr.message}`,
          )
          errors++
          continue
        }

        // Clonar ações do template parent para o novo child
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

        // Inserir a atribuição específica para ESTA PLANTA no child audit
        await client.from('audit_assignments').insert({
          audit_id: newAudit.id,
          plant_id: plantId,
          assignee_id: plantAssigneeId,
        })

        console.log(
          `[process-recurring-audits] Created child audit ${newAudit.id} for "${audit.title}" (plant ${plantId}) period ${targetStr}`,
        )

        // Criar tarefa e audit_execution vigentes para esta planta
        const created = await ensureTaskForAudit(
          client,
          newAudit,
          { plant_id: plantId, assignee_id: plantAssigneeId },
          today,
        )
        if (created) tasksCreated++

        await logAudit(
          client,
          audit.client_id,
          'audit_generated',
          `Generated "${audit.title}" for plant ${plantId} period ${targetStr} (child: ${newAudit.id})`,
        )
        generated++

        // Atualizar os caches em memória para eventuais iterações subsequentes
        childStartDateMap.set(newAudit.id, targetStr)
        plantChildList.unshift({ id: newAudit.id, start_date: targetStr })
      }
    }

    // BACKFILL: Garantir que auditorias ativas existentes com assignments tenham tasks/executions criadas se estiverem faltando
    const { data: allAudits } = await client
      .from('audits')
      .select('id, title, client_id, sla_days')
      .eq('status', 'Ativo')
    for (const a of allAudits || []) {
      const { data: auditAssignments } = await client
        .from('audit_assignments')
        .select('plant_id, assignee_id')
        .eq('audit_id', a.id)
      for (const assign of auditAssignments || []) {
        if (!assign.assignee_id || !assign.plant_id) continue
        const { data: existingTask } = await client
          .from('tasks')
          .select('id')
          .eq('audit_id', a.id)
          .eq('plant_id', assign.plant_id)
          .limit(1)
        if (existingTask?.length > 0) continue
        const created = await ensureTaskForAudit(client, a, assign, today)
        if (created) backfill++
      }
    }

    console.log(
      `[process-recurring-audits] Done. Generated: ${generated}, Tasks created: ${tasksCreated}, Backfilled: ${backfill}, Skipped: ${skipped}, Errors: ${errors}`,
    )
    return new Response(
      JSON.stringify({
        success: true,
        generatedCount: generated,
        tasksCreatedCount: tasksCreated,
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
