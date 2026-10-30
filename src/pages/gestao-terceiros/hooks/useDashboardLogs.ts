import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { parseISO, format } from 'date-fns'

import { useCallback } from 'react'

export interface DashboardLogItem {
  id: string
  date: string
  plant_id: string
  type: string
  reference_id: string
  status: boolean
  created_at?: string
  location_id?: string
}

export function useDashboardLogs(
  dateFrom: string,
  dateTo: string,
  referenceMonth: string,
  plants: any[],
) {
  const [logs, setLogs] = useState<DashboardLogItem[]>([])
  const [rawLogs, setRawLogs] = useState<DashboardLogItem[]>([])
  const [monthlyGoals, setMonthlyGoals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadTrigger, setReloadTrigger] = useState(0)

  const reload = useCallback(() => {
    setReloadTrigger((prev) => prev + 1)
  }, [])

  useEffect(() => {
    let isCancelled = false

    const fetchLogs = async () => {
      if (!plants || plants.length === 0) {
        setLogs([])
        setRawLogs([])
        setIsLoading(false)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const plantIds = plants.map((p: any) => p.id)

        // 1. Busca os dias não úteis das plantas no período (com paginação defensiva)
        let nwdAll: Array<{ plant_id: string; date: string }> = []
        let nwdFrom = 0
        const nwdStep = 1000
        let nwdHasMore = true

        while (nwdHasMore) {
          const { data: nwdData, error: nwdError } = await supabase
            .from('plant_non_working_days')
            .select('plant_id, date')
            .gte('date', dateFrom)
            .lte('date', dateTo)
            .in('plant_id', plantIds)
            .range(nwdFrom, nwdFrom + nwdStep - 1)

          if (nwdError) {
            console.error('Erro ao buscar plant_non_working_days:', nwdError)
            throw new Error(`Falha ao carregar dias não úteis: ${nwdError.message}`)
          }

          if (nwdData && nwdData.length > 0) {
            nwdAll = [...nwdAll, ...nwdData]
            if (nwdData.length < nwdStep) {
              nwdHasMore = false
            } else {
              nwdFrom += nwdStep
            }
          } else {
            nwdHasMore = false
          }
        }

        const nonWorkingMap: Record<string, boolean> = {}
        nwdAll.forEach((nwd) => {
          const dateKey = nwd.date.includes('T')
            ? format(parseISO(nwd.date), 'yyyy-MM-dd')
            : nwd.date
          nonWorkingMap[`${nwd.plant_id}_${dateKey}`] = true
        })

        // 2. Busca paginada completa dos daily_logs trazendo apenas colunas necessárias
        // Otimização v0.0.1819: Paginação determinística por keyset (cursor id > lastId, limit 5000)
        // Evita OFFSET profundo que disparava statement timeout do Postgres ao varrer 55k+ registros
        let allData: DashboardLogItem[] = []
        const pageSize = 5000
        let lastId: string | null = null
        let hasMore = true

        while (hasMore) {
          if (isCancelled) return

          let query = supabase
            .from('daily_logs')
            .select('id, date, plant_id, type, reference_id, status, created_at, location_id')
            .gte('date', dateFrom)
            .lte('date', dateTo)
            .in('plant_id', plantIds)
            .order('id', { ascending: true })
            .limit(pageSize)

          if (lastId) {
            query = query.gt('id', lastId)
          }

          const { data, error: logsError } = await query

          if (logsError) {
            console.error('Erro ao carregar daily_logs:', logsError)
            throw new Error(`Falha ao carregar lançamentos diários: ${logsError.message}`)
          }

          if (data && data.length > 0) {
            allData = [...allData, ...data]
            lastId = data[data.length - 1].id
            if (data.length < pageSize) {
              hasMore = false
            }
          } else {
            hasMore = false
          }
        }

        if (isCancelled) return

        const validLogs = allData.filter((log) => {
          const logDateKey = log.date.includes('T')
            ? format(parseISO(log.date), 'yyyy-MM-dd')
            : log.date
          return !nonWorkingMap[`${log.plant_id}_${logDateKey}`]
        })

        setRawLogs(allData)
        setLogs(validLogs)
      } catch (err: any) {
        if (!isCancelled) {
          console.error('useDashboardLogs fetchLogs error:', err)
          setError(err?.message || 'Erro ao carregar os lançamentos do período.')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchLogs()

    return () => {
      isCancelled = true
    }
  }, [dateFrom, dateTo, plants, reloadTrigger])

  useEffect(() => {
    let isCancelled = false

    const fetchGoals = async () => {
      if (!plants || plants.length === 0) {
        setMonthlyGoals([])
        return
      }

      try {
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
          if (isCancelled) return

          const { data: mg, error: mgError } = await supabase
            .from('monthly_goals_data')
            .select('id, plant_id, goal_id, reference_month, value')
            .gte('reference_month', mFrom)
            .lte('reference_month', mTo)
            .in('plant_id', plantIds)
            .range(from, from + step - 1)

          if (mgError) {
            console.error('Erro ao carregar monthly_goals_data:', mgError)
            throw new Error(`Falha ao carregar metas mensais: ${mgError.message}`)
          }

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

        if (!isCancelled) {
          setMonthlyGoals(allData)
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('useDashboardLogs fetchGoals error:', err)
          // Se o erro principal ainda não foi setado, reporta
          setError((prev) => prev || err?.message || 'Erro ao carregar metas mensais.')
        }
      }
    }

    fetchGoals()

    return () => {
      isCancelled = true
    }
  }, [referenceMonth, plants, reloadTrigger])

  return { logs, rawLogs, monthlyGoals, isLoading, error, reload }
}
