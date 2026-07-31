import { supabase } from '@/lib/supabase/client'

export type VacationStatus = 'scheduled' | 'approved' | 'completed' | 'rejected'

export interface Vacation {
  id: string
  client_id: string
  plant_id: string
  collaborator_id: string
  start_date: string
  end_date: string
  status: VacationStatus
  approved_by: string | null
  created_at: string
  updated_at: string
  org_collaborators?: { id: string; name: string; photo_url: string | null } | null
}

export async function getVacations(clientId: string, plantId?: string, collaboratorId?: string) {
  let query = supabase
    .from('vacations')
    .select('*, org_collaborators(id, name, photo_url)')
    .eq('client_id', clientId)
    .order('start_date', { ascending: true })

  if (plantId && plantId !== 'all') {
    query = query.eq('plant_id', plantId)
  }

  if (collaboratorId && collaboratorId !== 'all') {
    query = query.eq('collaborator_id', collaboratorId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as Vacation[]
}

export async function createVacation(payload: {
  client_id: string
  plant_id: string
  collaborator_id: string
  start_date: string
  end_date: string
}) {
  const { data, error } = await supabase
    .from('vacations')
    .insert({ ...payload, status: 'scheduled' })
    .select('*, org_collaborators(id, name, photo_url)')
    .single()
  if (error) throw error
  return data as Vacation
}

export async function approveVacation(id: string, approverId: string) {
  const { data, error } = await supabase
    .from('vacations')
    .update({ status: 'approved', approved_by: approverId })
    .eq('id', id)
    .select('*, org_collaborators(id, name, photo_url)')
    .single()
  if (error) throw error
  return data as Vacation
}

export async function rejectVacation(id: string) {
  const { data, error } = await supabase
    .from('vacations')
    .update({ status: 'rejected' })
    .eq('id', id)
    .select('*, org_collaborators(id, name, photo_url)')
    .single()
  if (error) throw error
  return data as Vacation
}

export async function deleteVacation(id: string) {
  const { error } = await supabase.from('vacations').delete().eq('id', id)
  if (error) throw error
}

export async function getMonthlyVacationCounts(clientId: string, year: number, plantId?: string) {
  let query = supabase
    .from('vacations')
    .select('start_date, end_date, status')
    .eq('client_id', clientId)
    .in('status', ['scheduled', 'approved', 'completed'])

  if (plantId && plantId !== 'all') {
    query = query.eq('plant_id', plantId)
  }

  const { data, error } = await query
  if (error) throw error

  const monthlyCounts: {
    month: string
    count: number
    scheduled: number
    approved: number
    completed: number
  }[] = []
  const monthNames = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]

  for (let i = 0; i < 12; i++) {
    monthlyCounts.push({ month: monthNames[i], count: 0, scheduled: 0, approved: 0, completed: 0 })
  }

  for (const v of data || []) {
    const start = new Date(v.start_date + 'T00:00:00')
    const end = new Date(v.end_date + 'T00:00:00')

    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(year, m, 1)
      const monthEnd = new Date(year, m + 1, 0)

      if (start <= monthEnd && end >= monthStart) {
        monthlyCounts[m].count++
        if (v.status === 'scheduled') monthlyCounts[m].scheduled++
        else if (v.status === 'approved') monthlyCounts[m].approved++
        else if (v.status === 'completed') monthlyCounts[m].completed++
      }
    }
  }

  return monthlyCounts
}
