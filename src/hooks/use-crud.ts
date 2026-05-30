import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './use-auth'
import { useAppStore } from '@/store/AppContext'

export function useCrud<T>(tableName: string, defaultSelect = '*') {
  const { user } = useAuth()
  const { profile, selectedMasterClient } = useAppStore()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!user || !profile) return
    if (profile.role !== 'Master' && !profile.client_id) return

    setLoading(true)
    let q = supabase.from(tableName).select(defaultSelect)

    if (tableName === 'profiles') {
      q = q
        .order('name', { ascending: true, nullsFirst: false })
        .order('email', { ascending: true })
    } else {
      q = q.order('created_at', { ascending: false })
    }

    if (tableName === 'employees' || tableName === 'equipment') {
      q = q.eq('status', 'Ativo')
    }

    if (profile.role === 'Master') {
      if (selectedMasterClient !== 'all') {
        q = q.eq('client_id', selectedMasterClient)
      }
    } else {
      q = q.eq('client_id', profile.client_id)
    }

    const { data: result, error } = await q

    if (!error && result) {
      let finalData = result as T[]

      if (tableName === 'profiles') {
        finalData = [...finalData].sort((a: any, b: any) => {
          const nameA = (a.name || '').trim()
          const nameB = (b.name || '').trim()

          if (!nameA && !nameB) {
            return (a.email || '').localeCompare(b.email || '')
          }
          if (!nameA) return 1
          if (!nameB) return -1

          return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' })
        })
      }

      setData(finalData)
    }
    setLoading(false)
  }, [tableName, user, profile, selectedMasterClient, defaultSelect])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const add = async (record: Partial<T>) => {
    if (!profile) return { success: false, error: 'No profile' }

    let targetClientId = profile.client_id
    if (profile.role === 'Master' && selectedMasterClient !== 'all') {
      targetClientId = selectedMasterClient
    }

    if (!targetClientId && profile.role !== 'Master' && !(record as any).client_id) {
      return { success: false, error: 'No client' }
    }

    const payload = { ...record, client_id: (record as any).client_id || targetClientId }
    const { data: result, error } = await supabase.from(tableName).insert(payload).select().single()

    if (!error && result) {
      setData((prev) => [result as T, ...prev])
      return { success: true, data: result as T }
    }
    return { success: false, error }
  }

  const update = async (id: string, record: Partial<T>) => {
    const { data: result, error } = await supabase
      .from(tableName)
      .update(record)
      .eq('id', id)
      .select()
      .single()

    if (!error && result) {
      setData((prev) => prev.map((item: any) => (item.id === id ? (result as T) : item)))
      return { success: true, data: result as T }
    }
    return { success: false, error }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)

    if (
      error &&
      (error.message?.includes('lançamentos') || error.code === 'P0001' || error.code === '23503')
    ) {
      if (tableName === 'employees' || tableName === 'equipment') {
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ status: 'Inativo' })
          .eq('id', id)
        if (!updateError) {
          setData((prev) => prev.filter((item: any) => item.id !== id))
          return {
            success: true,
            softDeleted: true,
            message:
              'Não é possível excluir este registro pois ele possui histórico de uso. O registro foi inativado automaticamente.',
          }
        }
      }
    }

    if (!error) {
      setData((prev) => prev.filter((item: any) => item.id !== id))
      return { success: true }
    }
    return { success: false, error }
  }

  return { data, loading, add, update, remove, fetchAll }
}
