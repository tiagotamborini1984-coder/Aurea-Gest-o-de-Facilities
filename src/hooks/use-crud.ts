import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './use-auth'
import { useAppStore } from '@/store/AppContext'

export function useCrud<T>(tableName: string, defaultSelect = '*') {
  const { user } = useAuth()
  const { profile } = useAppStore()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!user || !profile?.client_id) return
    setLoading(true)
    const { data: result, error } = await supabase
      .from(tableName)
      .select(defaultSelect)
      .eq('client_id', profile.client_id)
      .order('created_at', { ascending: false })

    if (!error && result) setData(result as T[])
    setLoading(false)
  }, [tableName, user, profile, defaultSelect])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const add = async (record: Partial<T>) => {
    if (!profile?.client_id) return { success: false, error: 'No client' }
    const payload = { ...record, client_id: profile.client_id }
    const { data: result, error } = await supabase.from(tableName).insert(payload).select().single()
    if (!error && result) {
      setData((prev) => [result as T, ...prev])
      return { success: true, data: result as T }
    }
    return { success: false, error }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (!error) {
      setData((prev) => prev.filter((item: any) => item.id !== id))
      return { success: true }
    }
    return { success: false, error }
  }

  return { data, loading, add, remove, fetchAll }
}
