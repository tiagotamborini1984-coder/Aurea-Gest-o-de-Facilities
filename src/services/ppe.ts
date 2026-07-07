import { supabase } from '@/lib/supabase/client'

export const ppeService = {
  async getItems(clientId: string) {
    const { data, error } = await (supabase as any)
      .from('ppe_items')
      .select('*, plants(name)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async saveItem(item: any) {
    if (item.id) {
      const { id, created_at, current_stock, plants, ...updateData } = item
      const { data, error } = await (supabase as any)
        .from('ppe_items')
        .update({ ...updateData, total_quantity: Number(updateData.total_quantity) || 0 })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    } else {
      const { id, created_at, current_stock, plants, ...insertData } = item
      const totalQty = Number(insertData.total_quantity) || 0
      const { data, error } = await (supabase as any)
        .from('ppe_items')
        .insert([{ ...insertData, total_quantity: totalQty, current_stock: totalQty }])
        .select()
        .single()
      if (error) throw error
      return data
    }
  },

  async deleteItem(id: string) {
    const { error } = await (supabase as any).from('ppe_items').delete().eq('id', id)
    if (error) throw error
  },

  async getLoans(clientId: string, startDate?: string, endDate?: string) {
    let query = (supabase as any)
      .from('ppe_loans')
      .select('*, ppe:ppe_items(name, ca_number), collaborator:org_collaborators(name)')
      .eq('client_id', clientId)

    if (startDate) {
      query = query.gte('loan_date', startDate + 'T00:00:00.000Z')
    }
    if (endDate) {
      query = query.lte('loan_date', endDate + 'T23:59:59.999Z')
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async createLoan(loan: any) {
    const { data, error } = await (supabase as any)
      .from('ppe_loans')
      .insert([loan])
      .select()
      .single()
    if (error) throw error
    return data
  },

  async returnLoan(loanId: string) {
    const { data, error } = await (supabase as any)
      .from('ppe_loans')
      .update({ status: 'Devolvido', return_date: new Date().toISOString() })
      .eq('id', loanId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteLoan(loanId: string) {
    const { error } = await (supabase as any).from('ppe_loans').delete().eq('id', loanId)
    if (error) throw error
  },

  async getLoanTrends(clientId: string, startDate?: string, endDate?: string) {
    let query = (supabase as any)
      .from('ppe_loans')
      .select('loan_date, quantity, status')
      .eq('client_id', clientId)

    if (startDate) {
      query = query.gte('loan_date', startDate + 'T00:00:00.000Z')
    }
    if (endDate) {
      query = query.lte('loan_date', endDate + 'T23:59:59.999Z')
    }

    const { data, error } = await query.order('loan_date', { ascending: true })
    if (error) throw error
    return data || []
  },

  async getCollaborators(clientId: string) {
    const { data, error } = await supabase
      .from('org_collaborators')
      .select('id, name')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return data || []
  },
}
