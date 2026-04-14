import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useDashboardLogs(
  dateFrom: string,
  dateTo: string,
  referenceMonth: string,
  plants: any[],
) {
  const [logs, setLogs] = useState<any[]>([])
  const [monthlyGoals, setMonthlyGoals] = useState<any[]>([])

  useEffect(() => {
    const fetchLogs = async () => {
      if (plants.length === 0) {
        setLogs([])
        return
      }
      const plantIds = plants.map((p: any) => p.id)

      const { data: nwdData } = await supabase
        .from('plant_non_working_days')
        .select('plant_id, date')
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .in('plant_id', plantIds)

      const nonWorkingMap: Record<string, boolean> = {}
      if (nwdData) {
        nwdData.forEach((nwd) => {
          const dateKey = nwd.date.split('T')[0]
          nonWorkingMap[`${nwd.plant_id}_${dateKey}`] = true
        })
      }

      let allData: any[] = []
      let from = 0
      const step = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('daily_logs')
          .select('*')
          .gte('date', dateFrom)
          .lte('date', dateTo)
          .in('plant_id', plantIds)
          .range(from, from + step - 1)

        if (data && data.length > 0) {
          allData = [...allData, ...data]
          if (data.length < step) {
            hasMore = false
          } else {
            from += step
          }
        } else {
          hasMore = false
        }
      }

      const validLogs = allData.filter((log) => {
        const logDateKey = log.date.split('T')[0]
        return !nonWorkingMap[`${log.plant_id}_${logDateKey}`]
      })

      setLogs(validLogs)
    }
    fetchLogs()
  }, [dateFrom, dateTo, plants])

  useEffect(() => {
    const fetchGoals = async () => {
      if (plants.length === 0) {
        setMonthlyGoals([])
        return
      }
      const plantIds = plants.map((p: any) => p.id)
      const mFrom = `${referenceMonth}-01`
      const y = parseInt(referenceMonth.split('-')[0])
      const m = parseInt(referenceMonth.split('-')[1])
      const lastDay = new Date(y, m, 0).getDate()
      const mTo = `${referenceMonth}-${lastDay}`

      let allData: any[] = []
      let from = 0
      const step = 1000
      let hasMore = true

      while (hasMore) {
        const { data: mg } = await supabase
          .from('monthly_goals_data')
          .select('*')
          .gte('reference_month', mFrom)
          .lte('reference_month', mTo)
          .in('plant_id', plantIds)
          .range(from, from + step - 1)

        if (mg && mg.length > 0) {
          allData = [...allData, ...mg]
          if (mg.length < step) {
            hasMore = false
          } else {
            from += step
          }
        } else {
          hasMore = false
        }
      }
      setMonthlyGoals(allData)
    }
    fetchGoals()
  }, [referenceMonth, plants])

  return { logs, monthlyGoals }
}
