import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'

export function useDashboardBudget(selectedMonths: string[], selectedCostCenters: string[]) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { activeClient } = useAppStore()
  const [costCenters, setCostCenters] = useState<any[]>([])
  const [availableMonths, setAvailableMonths] = useState<string[]>([])

  useEffect(() => {
    if (!activeClient) return

    const fetchFilters = async () => {
      const [{ data: ccData }, { data: mData }] = await Promise.all([
        supabase
          .from('budget_cost_centers')
          .select('id, name')
          .eq('client_id', activeClient.id)
          .order('name'),
        supabase.from('budget_entries').select('reference_month').eq('client_id', activeClient.id),
      ])

      setCostCenters(ccData || [])

      if (mData) {
        const uniqueMonths = Array.from(new Set(mData.map((m) => m.reference_month))).sort()
        setAvailableMonths(uniqueMonths)
      }
    }
    fetchFilters()
  }, [activeClient])

  useEffect(() => {
    if (!activeClient) return

    const fetchData = async () => {
      setLoading(true)
      try {
        let query = supabase
          .from('budget_entries')
          .select('*, budget_cost_centers(name), budget_accounts(name, type)')
          .eq('client_id', activeClient.id)

        if (selectedMonths.length > 0) {
          query = query.in('reference_month', selectedMonths)
        }

        if (selectedCostCenters.length > 0) {
          query = query.in('cost_center_id', selectedCostCenters)
        }

        const { data: entries } = await query

        if (!entries) {
          setData(null)
          return
        }

        let totalBudgeted = 0
        let totalRealized = 0

        const monthlyDataMap: Record<
          string,
          { month: string; budgeted: number; realized: number }
        > = {}
        const accountDataMap: Record<string, { name: string; budgeted: number; realized: number }> =
          {}
        const costCenterDataMap: Record<
          string,
          { name: string; budgeted: number; realized: number }
        > = {}

        entries.forEach((entry) => {
          const budgeted = Number(entry.budgeted_amount) || 0
          const realized = Number(entry.realized_amount) || 0

          totalBudgeted += budgeted
          totalRealized += realized

          const month = entry.reference_month
          if (!monthlyDataMap[month]) monthlyDataMap[month] = { month, budgeted: 0, realized: 0 }
          monthlyDataMap[month].budgeted += budgeted
          monthlyDataMap[month].realized += realized

          const accountName = (entry.budget_accounts as any)?.name || 'Desconhecida'
          if (!accountDataMap[accountName])
            accountDataMap[accountName] = { name: accountName, budgeted: 0, realized: 0 }
          accountDataMap[accountName].budgeted += budgeted
          accountDataMap[accountName].realized += realized

          const ccName = (entry.budget_cost_centers as any)?.name || 'Desconhecido'
          if (!costCenterDataMap[ccName])
            costCenterDataMap[ccName] = { name: ccName, budgeted: 0, realized: 0 }
          costCenterDataMap[ccName].budgeted += budgeted
          costCenterDataMap[ccName].realized += realized
        })

        const monthlyData = Object.values(monthlyDataMap).sort((a, b) =>
          a.month.localeCompare(b.month),
        )
        const accountData = Object.values(accountDataMap).sort((a, b) => b.budgeted - a.budgeted)
        const costCenterData = Object.values(costCenterDataMap).sort(
          (a, b) => b.budgeted - a.budgeted,
        )

        setData({
          totalBudgeted,
          totalRealized,
          monthlyData,
          accountData,
          costCenterData,
        })
      } catch (error) {
        console.error('Error fetching budget data', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeClient, selectedMonths, selectedCostCenters])

  return { data, costCenters, availableMonths, loading }
}
