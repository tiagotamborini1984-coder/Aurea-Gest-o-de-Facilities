import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useDashboardSchedules(dateFrom: string, dateTo: string, plants: any[]) {
  const [schedules, setSchedules] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const plantIdsStr = plants
    .map((p) => p.id)
    .sort()
    .join(',')

  useEffect(() => {
    async function fetchData() {
      if (!plants || plants.length === 0) {
        setSchedules([])
        setAreas([])
        return
      }

      setLoading(true)
      const plantIds = plants.map((p) => p.id)

      try {
        const [{ data: areasData }, { data: schedulesData }] = await Promise.all([
          supabase.from('cleaning_gardening_areas').select('*').in('plant_id', plantIds),
          supabase
            .from('cleaning_gardening_schedules')
            .select('*')
            .in('plant_id', plantIds)
            .gte('activity_date', dateFrom)
            .lte('activity_date', dateTo),
        ])

        setAreas(areasData || [])
        setSchedules(schedulesData || [])
      } catch (err) {
        console.error('Error fetching schedules data', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [dateFrom, dateTo, plantIdsStr])

  return { schedules, areas, loading }
}
