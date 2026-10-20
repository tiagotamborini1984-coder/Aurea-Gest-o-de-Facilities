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

export const auditCategoryService = {
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

    const { error } = await supabase
      .from('audit_question_categories')
      .delete()
      .eq('id', categoryId)

    if (error) throw error
  },
}
