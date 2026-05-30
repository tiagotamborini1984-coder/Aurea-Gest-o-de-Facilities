import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

function addFrequency(date: Date, frequency: string): Date {
  const d = new Date(date);
  switch (frequency) {
    case 'Diária':
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case 'Semanal':
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case 'Mensal':
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case 'Semestral':
      d.setUTCMonth(d.getUTCMonth() + 6);
      break;
    case 'Anual':
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
    case 'Única':
    default:
      break;
  }
  return d;
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

    const { data: audits, error: auditsError } = await supabaseClient
      .from('audits')
      .select(`
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
          .select('id, status, realization_date, created_at, task_id, assignee_id')
          .eq('audit_id', audit.id)
          .eq('plant_id', assign.plant_id)
          .order('created_at', { ascending: false })

        const pendingExec = (existingExecs || []).find(e => e.status === 'Pendente')
        
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
          continue;
        }

        let nextDueDate: Date;
        
        if (existingExecs && existingExecs.length > 0) {
          if (audit.frequency === 'Única') continue;

          const lastExec = existingExecs.find(e => e.status === 'Finalizado') || existingExecs[0];
          const baseDateStr = lastExec.realization_date || lastExec.created_at.split('T')[0];
          const baseDate = new Date(baseDateStr + 'T00:00:00Z');
          nextDueDate = addFrequency(baseDate, audit.frequency);
        } else {
          nextDueDate = new Date(audit.start_date + 'T00:00:00Z');
        }

        // Prevent nextDueDate from being in the past for recurring audits
        if (audit.frequency !== 'Única') {
          const todayUtc = new Date()
          todayUtc.setUTCHours(0, 0, 0, 0)
          while (nextDueDate < todayUtc) {
            nextDueDate = addFrequency(nextDueDate, audit.frequency)
          }
        }

        const advanceNotice = audit.advance_notice_days || 0;
        const triggerDate = new Date(nextDueDate);
        triggerDate.setUTCDate(triggerDate.getUTCDate() - advanceNotice);

        if (today >= triggerDate) {
          const { data: createdToday } = await supabaseClient
            .from('audit_executions')
            .select('id')
            .eq('audit_id', audit.id)
            .eq('plant_id', assign.plant_id)
            .gte('created_at', todayStr + 'T00:00:00Z')

          if (createdToday && createdToday.length > 0) {
            continue;
          }

          const { data: adminUser } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('client_id', audit.client_id)
            .in('role', ['Administrador', 'Master'])
            .limit(1)
          
          const requesterId = adminUser?.[0]?.id || assign.assignee_id

          const targetDateStr = nextDueDate.toISOString().split('T')[0];

          const taskTitle = `Auditoria: ${audit.title}`
          const taskDesc = `Por favor, realize a auditoria "${audit.title}" agendada para ${targetDateStr.split('-').reverse().join('/')}. Acesse os detalhes da tarefa para preencher o checklist.`
          
          // Fetch open statuses
          const { data: openStatuses } = await supabaseClient
            .from('task_statuses')
            .select('id')
            .eq('client_id', audit.client_id)
            .eq('is_terminal', false)
            
          const openStatusIds = openStatuses?.map(s => s.id) || [statusId]

          // Check for existing open task
          const { data: existingTasks } = await supabaseClient
            .from('tasks')
            .select('id')
            .eq('client_id', audit.client_id)
            .eq('plant_id', assign.plant_id)
            .eq('type_id', typeId)
            .eq('title', taskTitle)
            .in('status_id', openStatusIds)
            .limit(1)

          let finalTaskId = null

          if (existingTasks && existingTasks.length > 0) {
            finalTaskId = existingTasks[0].id
            // Upsert: update description and assignee, and fix due_date to correctly calculated date
            await supabaseClient
              .from('tasks')
              .update({
                description: taskDesc,
                assignee_id: assign.assignee_id,
                due_date: new Date(`${targetDateStr}T23:59:59.999Z`).toISOString()
              })
              .eq('id', finalTaskId)
              
            await supabaseClient.from('task_timeline').insert({
              task_id: finalTaskId,
              user_id: requesterId,
              content: `Tarefa de auditoria atualizada pelo agendador. Prazo ajustado para a frequência correta.`,
              action_type: 'comment',
            })
          } else {
            const { data: newTask } = await supabaseClient
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
                due_date: new Date(`${targetDateStr}T23:59:59.999Z`).toISOString(),
                status_updated_at: new Date().toISOString(),
              } as any)
              .select()
              .single()
              
            if (newTask) finalTaskId = newTask.id
          }

          if (finalTaskId) {
            // Check if there's already an execution for this task
            const { data: execsForTask } = await supabaseClient
              .from('audit_executions')
              .select('id')
              .eq('task_id', finalTaskId)
              .limit(1)
              
            if (!execsForTask || execsForTask.length === 0) {
              await supabaseClient.from('audit_executions').insert({
                audit_id: audit.id,
                task_id: finalTaskId,
                assignee_id: assign.assignee_id,
                plant_id: assign.plant_id,
                status: 'Pendente',
              } as any)
              generatedCount++
            }
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
