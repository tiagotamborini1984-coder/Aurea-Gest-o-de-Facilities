import { supabase } from '@/lib/supabase/client'

export interface AuditQuestionCategory {
  id: string
  client_id: string
  name: string
  color: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CategoryMetricSummary {
  total_executions: number
  overall_compliance_pct: number
  total_evaluated_questions: number
  total_points_lost: number
  best_category: {
    id: string
    name: string
    color: string
    compliance_percentage: number
  } | null
  worst_category: {
    id: string
    name: string
    color: string
    compliance_percentage: number
  } | null
}

export interface CategoryMetricItem {
  id: string
  name: string
  color: string
  evaluated_questions: number
  obtained_score: number
  max_possible_score: number
  points_lost: number
  compliance_percentage: number
}

export interface CategoryTrendMonthItem {
  category_id: string
  category_name: string
  category_color: string
  compliance_percentage: number
  evaluated_questions: number
  obtained_score: number
  max_possible_score: number
}

export interface CategoryTrendMonth {
  month: string
  categories: CategoryTrendMonthItem[]
}

export interface AuditCategoryMetricsResult {
  summary: CategoryMetricSummary
  categories: CategoryMetricItem[]
  trend: CategoryTrendMonth[]
}

export interface GetAuditCategoryMetricsParams {
  clientId?: string | null
  auditType?: string | null
  plantIds?: string[] | null
  startDate?: string | null // 'YYYY-MM-DD'
  endDate?: string | null // 'YYYY-MM-DD'
}

export const auditCategoryService = {
  async getCategoryMetrics(
    params: GetAuditCategoryMetricsParams,
  ): Promise<AuditCategoryMetricsResult> {
    const { data, error } = await (supabase.rpc as any)('get_audit_category_metrics', {
      p_client_id: params.clientId || null,
      p_audit_type: params.auditType && params.auditType !== 'all' ? params.auditType : null,
      p_plant_ids: params.plantIds && params.plantIds.length > 0 ? params.plantIds : null,
      p_start_date: params.startDate || null,
      p_end_date: params.endDate || null,
    })

    if (error) throw error
    return (data || {
      summary: {
        total_executions: 0,
        overall_compliance_pct: 0,
        total_evaluated_questions: 0,
        total_points_lost: 0,
        best_category: null,
        worst_category: null,
      },
      categories: [],
      trend: [],
    }) as AuditCategoryMetricsResult
  },

  async getAuditTypes(clientId: string): Promise<string[]> {
    const { data, error } = await supabase.from('audits').select('type').eq('client_id', clientId)

    if (error) throw error
    const types = Array.from(
      new Set(
        (data || [])
          .map((row: any) => row.type)
          .filter((t: any): t is string => Boolean(t && typeof t === 'string' && t.trim() !== '')),
      ),
    )
    types.sort((a, b) => a.localeCompare(b))
    return types
  },
  async listCategories(clientId: string, includeInactive = true): Promise<AuditQuestionCategory[]> {
    let query = supabase
      .from('audit_question_categories')
      .select('*')
      .eq('client_id', clientId)
      .order('name', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as AuditQuestionCategory[]
  },

  async createCategory(params: {
    client_id: string
    name: string
    color?: string | null
    is_active?: boolean
  }): Promise<AuditQuestionCategory> {
    const trimmed = params.name.trim()
    const { data, error } = await supabase
      .from('audit_question_categories')
      .insert({
        client_id: params.client_id,
        name: trimmed,
        color: params.color || '#3b82f6',
        is_active: params.is_active ?? true,
      })
      .select()
      .single()

    if (error) throw error
    return data as AuditQuestionCategory
  },

  async updateCategory(
    id: string,
    params: {
      name?: string
      color?: string | null
      is_active?: boolean
    },
  ): Promise<AuditQuestionCategory> {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (params.name !== undefined) updates.name = params.name.trim()
    if (params.color !== undefined) updates.color = params.color
    if (params.is_active !== undefined) updates.is_active = params.is_active

    const { data, error } = await supabase
      .from('audit_question_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as AuditQuestionCategory
  },

  async getLinkedQuestionsCount(categoryId: string): Promise<number> {
    const { count, error } = await supabase
      .from('audit_actions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId)

    if (error) throw error
    return count || 0
  },

  async deleteCategory(categoryId: string): Promise<void> {
    const count = await this.getLinkedQuestionsCount(categoryId)
    if (count > 0) {
      throw new Error(
        `Não é possível excluir esta categoria porque ela possui ${count} pergunta(s) vinculada(s). Desvincule as perguntas antes de excluir ou inative a categoria.`,
      )
    }

    const { error } = await supabase.from('audit_question_categories').delete().eq('id', categoryId)

    if (error) throw error
  },
}
