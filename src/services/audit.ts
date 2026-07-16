import { supabase } from '@/lib/supabase/client'

export const logAudit = async (
  client_id: string,
  user_id: string,
  action_type: string,
  details: string,
) => {
  await supabase.from('audit_logs').insert({
    client_id,
    user_id,
    action_type,
    details,
  })
}

export const submitAuditExecution = async (
  executionId: string,
  answers: any[],
  participants: string,
  isDraft: boolean = false,
  signatures: any[] = [],
) => {
  const { data, error } = await supabase.rpc('submit_audit_execution', {
    p_execution_id: executionId,
    p_answers: answers,
    p_participants: participants,
    p_is_draft: isDraft,
    p_signatures: signatures,
  })

  if (error) throw error

  return data
}

export const reopenAuditExecution = async (executionId: string) => {
  const { data, error } = await supabase.rpc('reopen_audit_execution', {
    p_execution_id: executionId,
  })

  if (error) throw error

  return data
}

export const cloneAudit = async (auditId: string, userId: string) => {
  const { audit, actions, assignments } = await getAuditConfig(auditId)

  const { data: newAudit, error: auditError } = await supabase
    .from('audits')
    .insert({
      client_id: audit.client_id,
      title: `[Cópia] ${audit.title}`,
      type: audit.type,
      frequency: audit.frequency,
      start_date: audit.start_date,
      status: 'Rascunho',
      scoring_settings: audit.scoring_settings,
      sla_days: audit.sla_days,
      advance_notice_days: audit.advance_notice_days,
    })
    .select()
    .single()

  if (auditError) throw auditError

  if (actions && actions.length > 0) {
    const clonedActions = actions.map((a) => ({
      audit_id: newAudit.id,
      title: a.title,
      weight: a.weight,
      order_index: a.order_index,
      evidence_required: a.evidence_required,
      comments_required: a.comments_required,
    }))
    const { error: actionsError } = await supabase.from('audit_actions').insert(clonedActions)
    if (actionsError) throw actionsError
  }

  if (assignments && assignments.length > 0) {
    const clonedAssignments = assignments.map((a) => ({
      audit_id: newAudit.id,
      plant_id: a.plant_id,
      assignee_id: a.assignee_id,
    }))
    const { error: assignmentsError } = await supabase
      .from('audit_assignments')
      .insert(clonedAssignments)
    if (assignmentsError) throw assignmentsError
  }

  await logAudit(audit.client_id, userId, 'clone_audit', `Audit cloned: ${audit.title}`)

  return newAudit.id
}

export const getAuditConfig = async (auditId: string) => {
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('*')
    .eq('id', auditId)
    .single()

  if (auditError) throw auditError

  const { data: actions, error: actionsError } = await supabase
    .from('audit_actions')
    .select('*')
    .eq('audit_id', auditId)
    .order('order_index', { ascending: true })

  if (actionsError) throw actionsError

  const { data: assignments, error: assignmentsError } = await supabase
    .from('audit_assignments')
    .select('*')
    .eq('audit_id', auditId)

  if (assignmentsError) throw assignmentsError

  return { audit, actions, assignments }
}

export const saveAuditConfig = async ({
  auditId,
  clientId,
  auditData,
  actions,
  assignments,
}: {
  auditId?: string
  clientId: string
  auditData: any
  actions: any[]
  assignments: any[]
}) => {
  let currentAuditId = auditId

  // Prevent overwriting scoring_settings if it's explicitly null or undefined
  const safeAuditData = { ...auditData }
  if (safeAuditData.scoring_settings === undefined || safeAuditData.scoring_settings === null) {
    delete safeAuditData.scoring_settings
  }

  // 1. Save or Update Audit
  if (currentAuditId) {
    const { error } = await supabase.from('audits').update(safeAuditData).eq('id', currentAuditId)
    if (error) throw error
  } else {
    const { data, error } = await supabase
      .from('audits')
      .insert({ ...safeAuditData, client_id: clientId })
      .select()
      .single()
    if (error) throw error
    currentAuditId = data.id
  }

  // 2. Manage Actions with Upsert to prevent Data Loss
  if (currentAuditId) {
    // Get existing actions
    const { data: existingActions } = await supabase
      .from('audit_actions')
      .select('id, title')
      .eq('audit_id', currentAuditId)

    const actionsToUpsert = actions.map((a) => {
      const existing = existingActions?.find(
        (ex) => (a.id && ex.id === a.id) || (!a.id && ex.title === a.title),
      )
      return {
        ...(existing?.id || a.id ? { id: existing?.id || a.id } : {}),
        audit_id: currentAuditId,
        title: a.title,
        evidence_required: a.evidence_required || false,
        comments_required: a.comments_required || false,
        weight: a.weight ?? 1,
        order_index: a.order_index ?? 0,
      }
    })

    const upsertedIds = actionsToUpsert.map((a) => a.id).filter(Boolean) as string[]
    const existingActionIds = existingActions?.map((a) => a.id) || []

    const actionsToDelete = existingActionIds.filter((id) => !upsertedIds.includes(id))

    if (actionsToDelete.length > 0) {
      const { error } = await supabase.from('audit_actions').delete().in('id', actionsToDelete)
      if (error) throw error
    }

    if (actionsToUpsert.length > 0) {
      const { error } = await supabase.from('audit_actions').upsert(actionsToUpsert)
      if (error) throw error
    }

    // 3. Manage Assignments
    await supabase.from('audit_assignments').delete().eq('audit_id', currentAuditId)

    if (assignments.length > 0) {
      const assignmentsToInsert = assignments.map((a) => ({
        audit_id: currentAuditId,
        plant_id: a.plant_id,
        assignee_id: a.assignee_id,
      }))
      const { error } = await supabase.from('audit_assignments').insert(assignmentsToInsert)
      if (error) throw error
    }
  }

  // Fetch updated actions to ensure IDs are populated and returned correctly
  const { data: updatedActions } = await supabase
    .from('audit_actions')
    .select('*')
    .eq('audit_id', currentAuditId)
    .order('order_index', { ascending: true })

  return {
    auditId: currentAuditId,
    actions: updatedActions || [],
  }
}
