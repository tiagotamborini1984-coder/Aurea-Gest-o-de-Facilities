import { supabase } from '@/lib/supabase/client'
import { AuditAiReportData, RawAuditExecutionRecord } from '@/types/audit-ai'
import { analyzeAuditExecutions } from '@/lib/audit-ai-engine'

export interface RunAuditScanParams {
  clientId: string
  auditType: string // ex: "Qualidade", "Geral" ou "all"
  plantId?: string // ex: uuid de uma planta ou "all"
  plantName?: string
  dateRange?: { from: Date; to?: Date }
  onProgress?: (step: string, percentage: number) => void
}

export const auditAiService = {
  /**
   * Executa a varredura das auditorias realizadas com estágios simulados de progresso
   */
  async runAuditScan(params: RunAuditScanParams): Promise<AuditAiReportData> {
    const { clientId, auditType, plantId, plantName, dateRange, onProgress } = params

    // Etapa 1: Varrendo execuções
    onProgress?.('Varrendo histórico de execuções finalizadas...', 20)
    await new Promise((resolve) => setTimeout(resolve, 350))

    let query = supabase
      .from('audit_executions')
      .select(`
        id,
        realization_date,
        created_at,
        status,
        final_score,
        max_score,
        plant_id,
        plants (
          id,
          name
        ),
        audits!inner (
          id,
          title,
          type,
          client_id,
          scoring_settings
        ),
        tasks (
          task_number,
          task_statuses (
            name,
            is_terminal
          )
        ),
        audit_execution_answers (
          id,
          action_id,
          score,
          observations,
          evidence_url,
          evidence_urls,
          audit_actions (
            id,
            title,
            weight,
            order_index
          )
        )
      `)
      .eq('audits.client_id', clientId)

    if (auditType && auditType !== 'all') {
      query = query.eq('audits.type', auditType)
    }

    if (plantId && plantId !== 'all') {
      query = query.eq('plant_id', plantId)
    }

    if (dateRange?.from) {
      const fromISO = dateRange.from.toISOString()
      if (dateRange.to) {
        const toISO = dateRange.to.toISOString()
        query = query.or(
          `and(realization_date.gte.${dateRange.from.toISOString().slice(0, 10)},realization_date.lte.${dateRange.to.toISOString().slice(0, 10)}),and(realization_date.is.null,created_at.gte.${fromISO},created_at.lte.${toISO})`,
        )
      } else {
        query = query.or(
          `realization_date.gte.${dateRange.from.toISOString().slice(0, 10)},and(realization_date.is.null,created_at.gte.${fromISO})`,
        )
      }
    }

    const { data: rawData, error } = await query.order('realization_date', {
      ascending: true,
      nullsFirst: false,
    })

    if (error) {
      console.error('Erro ao consultar execuções para o Agente de IA:', error)
      throw new Error('Falha na consulta ao banco de auditorias.')
    }

    // Etapa 2: Cruzando respostas e ações
    onProgress?.('Cruzando respostas, pesos e observações técnicas...', 50)
    await new Promise((resolve) => setTimeout(resolve, 350))

    // Formatar e filtrar apenas execuções concluídas/válidas
    const formatted: RawAuditExecutionRecord[] = (rawData || []).map((row: any) => ({
      id: row.id,
      realization_date: row.realization_date,
      created_at: row.created_at,
      status: row.status,
      final_score: row.final_score !== null ? Number(row.final_score) : null,
      max_score: row.max_score !== null ? Number(row.max_score) : null,
      plant_id: row.plant_id,
      plant: row.plants ? { id: row.plants.id, name: row.plants.name } : null,
      audit: row.audits
        ? {
            id: row.audits.id,
            title: row.audits.title,
            type: row.audits.type,
            scoring_settings: row.audits.scoring_settings,
          }
        : null,
      answers: (row.audit_execution_answers || []).map((ans: any) => ({
        id: ans.id,
        action_id: ans.action_id,
        score: ans.score !== null ? Number(ans.score) : null,
        observations: ans.observations,
        evidence_url: ans.evidence_url,
        evidence_urls: ans.evidence_urls,
        action: ans.audit_actions
          ? {
              id: ans.audit_actions.id,
              title: ans.audit_actions.title,
              weight: ans.audit_actions.weight,
            }
          : null,
      })),
    }))

    // Etapa 3: Priorizando não conformidades e calculando tendências
    onProgress?.('Priorizando não conformidades e mapeando padrões...', 75)
    await new Promise((resolve) => setTimeout(resolve, 350))

    let periodLabel = 'Todo o Histórico'
    if (dateRange?.from) {
      const fromStr = dateRange.from.toLocaleDateString('pt-BR')
      const toStr = dateRange.to ? dateRange.to.toLocaleDateString('pt-BR') : 'atual'
      periodLabel = `${fromStr} até ${toStr}`
    }

    const report = analyzeAuditExecutions(formatted, {
      clientId,
      auditType: auditType === 'all' ? 'Todos os Tipos' : auditType,
      plantId: plantId === 'all' ? undefined : plantId,
      plantName,
      periodLabel,
    })

    // Etapa 4: Gerando Laudo e Plano de Ação
    onProgress?.('Consolidando laudo técnico e gerando plano de ação...', 95)
    await new Promise((resolve) => setTimeout(resolve, 250))

    onProgress?.('Concluído!', 100)

    return report
  },

  /**
   * Salva o laudo gerado na tabela audit_ai_reports
   */
  async saveReport(report: AuditAiReportData, userId?: string): Promise<string> {
    const plantSuffix = report.plantName ? ` - ${report.plantName}` : ''
    const title = `Laudo IA - Auditorias de ${report.auditType}${plantSuffix} (${report.periodLabel})`

    const { data, error } = await supabase
      .from('audit_ai_reports')
      .insert({
        client_id: report.clientId,
        plant_id: report.plantId && report.plantId !== 'all' ? report.plantId : null,
        audit_type: report.auditType,
        title,
        summary: {
          plantId: report.plantId && report.plantId !== 'all' ? report.plantId : null,
          plantName: report.plantName || null,
          totalExecutions: report.totalExecutions,
          totalEvaluations: report.totalEvaluations,
          totalNonConformities: report.totalNonConformities,
          overallConformityScore: report.overallConformityScore,
          previousPeriodConformityScore: report.previousPeriodConformityScore,
          scoreDelta: report.scoreDelta,
          plantBreakdown: report.plantBreakdown,
        },
        ranking: report.ranking,
        insights: report.insights,
        actionPlan: report.actionPlan,
        period_label: report.periodLabel,
        total_executions: report.totalExecutions,
        conformity_score: report.overallConformityScore,
        created_by: userId || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Erro ao salvar laudo de IA:', error)
      throw error
    }

    return data.id
  },

  /**
   * Atualiza o estado de um plano de ação salvo
   */
  async updateActionPlan(reportId: string, actionPlan: any[]): Promise<void> {
    const { error } = await supabase
      .from('audit_ai_reports')
      .update({ action_plan: actionPlan, updated_at: new Date().toISOString() })
      .eq('id', reportId)

    if (error) {
      console.error('Erro ao atualizar plano de ação:', error)
      throw error
    }
  },

  /**
   * Lista o histórico de laudos gerados
   */
  async listSavedReports(clientId: string, auditType?: string, plantId?: string) {
    let query = supabase
      .from('audit_ai_reports')
      .select(`
        id,
        title,
        audit_type,
        plant_id,
        period_label,
        total_executions,
        conformity_score,
        created_at,
        created_by,
        plants ( name ),
        profiles ( name )
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (auditType && auditType !== 'all') {
      query = query.eq('audit_type', auditType)
    }

    if (plantId && plantId !== 'all') {
      query = query.eq('plant_id', plantId)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  /**
   * Carrega um laudo salvo completo
   */
  async getSavedReport(reportId: string): Promise<AuditAiReportData | null> {
    const { data, error } = await supabase
      .from('audit_ai_reports')
      .select('*, plants(id, name)')
      .eq('id', reportId)
      .single()

    if (error || !data) return null

    const summary = (data.summary as any) || {}
    const plantName = data.plants?.name || summary.plantName || undefined

    return {
      id: data.id,
      clientId: data.client_id,
      plantId: data.plant_id || summary.plantId || undefined,
      plantName,
      auditType: data.audit_type,
      title: data.title,
      periodLabel: data.period_label || 'Período Geral',
      generatedAt: data.created_at,
      totalExecutions: data.total_executions || 0,
      totalEvaluations: summary.totalEvaluations || 0,
      totalNonConformities: summary.totalNonConformities || 0,
      overallConformityScore: Number(data.conformity_score) || 0,
      previousPeriodConformityScore: summary.previousPeriodConformityScore,
      scoreDelta: summary.scoreDelta,
      ranking: data.ranking || [],
      insights: data.insights || [],
      actionPlan: data.actionPlan || [],
      plantBreakdown: summary.plantBreakdown || [],
    } as any
  },
}
