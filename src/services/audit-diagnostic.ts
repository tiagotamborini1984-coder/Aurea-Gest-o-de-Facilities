import { supabase } from '@/lib/supabase/client'

export interface DiagnosticResult {
  auditId: string
  auditTitle: string
  auditStatus: string
  isActive: boolean
  hasTaskType: boolean
  taskTypeName: string | null
  hasNonTerminalStatus: boolean
  taskStatusName: string | null
  hasAssignments: boolean
  assignmentsCount: number
  pendingExecutionsWithoutTask: Array<{
    id: string
    status: string
    plant_id: string
    assignee_id: string
    created_at: string
  }>
  recentLogs: Array<{
    id: string
    action_type: string
    details: string | null
    created_at: string
  }>
  allPrerequisitesMet: boolean
}

export async function getAuditDiagnostic(auditId: string): Promise<DiagnosticResult> {
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('id, title, status, client_id')
    .eq('id', auditId)
    .single()

  if (auditError || !audit) {
    throw new Error('Auditoria não encontrada')
  }

  const clientId = audit.client_id

  const { data: taskType } = await supabase
    .from('task_types')
    .select('id, name')
    .eq('client_id', clientId)
    .ilike('name', '%Auditoria%')
    .limit(1)
    .maybeSingle()

  const { data: nonTerminalStatus } = await supabase
    .from('task_statuses')
    .select('id, name')
    .eq('client_id', clientId)
    .eq('is_terminal', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { count: assignmentsCount } = await supabase
    .from('audit_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('audit_id', auditId)

  const { data: pendingExecutions } = await supabase
    .from('audit_executions')
    .select('id, status, plant_id, assignee_id, created_at')
    .eq('audit_id', auditId)
    .in('status', ['Pendente', 'Rascunho'])
    .is('task_id', null)
    .order('created_at', { ascending: false })

  const { data: recentLogs } = await supabase
    .from('audit_logs')
    .select('id, action_type, details, created_at')
    .or(`details.ilike.%${audit.title}%,details.ilike.%${auditId}%`)
    .order('created_at', { ascending: false })
    .limit(10)

  const hasTaskType = !!taskType
  const hasNonTerminalStatus = !!nonTerminalStatus
  const hasAssignments = (assignmentsCount || 0) > 0
  const isActive = audit.status === 'Ativo'
  const allPrerequisitesMet = isActive && hasTaskType && hasNonTerminalStatus && hasAssignments

  return {
    auditId: audit.id,
    auditTitle: audit.title,
    auditStatus: audit.status,
    isActive,
    hasTaskType,
    taskTypeName: taskType?.name || null,
    hasNonTerminalStatus,
    taskStatusName: nonTerminalStatus?.name || null,
    hasAssignments,
    assignmentsCount: assignmentsCount || 0,
    pendingExecutionsWithoutTask: pendingExecutions || [],
    recentLogs: recentLogs || [],
    allPrerequisitesMet,
  }
}

export async function triggerRecurringAudits(): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke('process-recurring-audits', {
    method: 'POST',
  })

  if (error) {
    return { success: false, message: error.message }
  }

  return {
    success: true,
    message: `Processado: ${data?.generatedCount || 0} gerados, ${data?.backfillCount || 0} backfill, ${data?.skippedCount || 0} ignorados, ${data?.errorCount || 0} erros`,
  }
}
