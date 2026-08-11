import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface ForecastProposal {
  cost_center_id: string
  cost_center_name: string
  account_id: string
  account_name: string
  account_code: string | null
  total_budgeted: number
  total_realized: number
  remaining: number
  monthly_forecast: number
  upcoming_months: string[]
}

function generateUpcomingMonths(baseMonth: string, count: number): string[] {
  const [year, month] = baseMonth.split('-').map(Number)
  const months: string[] = []
  for (let i = 1; i <= count; i++) {
    const d = new Date(year, month - 1 + i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

export function useForecastAgent() {
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [proposals, setProposals] = useState<ForecastProposal[]>([])

  const analyze = useCallback(
    async (
      clientId: string,
      costCenterIds: string[],
      accounts: { id: string; name: string; code: string | null }[],
      costCenters: { id: string; name: string; code: string | null }[],
      selectedMonths: string[],
    ) => {
      setLoading(true)
      setProposals([])

      const { data: entries } = await supabase
        .from('budget_entries')
        .select('*')
        .eq('client_id', clientId)
        .in('cost_center_id', costCenterIds)

      const latestMonth =
        [...selectedMonths].sort().pop() || new Date().toISOString().substring(0, 7)
      const upcomingMonths = generateUpcomingMonths(latestMonth, 3)

      const groupMap: Record<string, { budgeted: number; realized: number; forecast: number }> = {}
      for (const entry of entries || []) {
        const key = `${entry.cost_center_id}__${entry.account_id}`
        if (!groupMap[key]) groupMap[key] = { budgeted: 0, realized: 0, forecast: 0 }
        groupMap[key].budgeted += Number(entry.budgeted_amount) || 0
        groupMap[key].realized += Number(entry.realized_amount) || 0
        groupMap[key].forecast += Number(entry.forecast_amount) || 0
      }

      const result: ForecastProposal[] = []
      for (const ccId of costCenterIds) {
        const cc = costCenters.find((c) => c.id === ccId)
        for (const acc of accounts) {
          const key = `${ccId}__${acc.id}`
          const group = groupMap[key] || { budgeted: 0, realized: 0, forecast: 0 }
          const remaining = Math.max(0, group.budgeted - group.realized)
          const monthlyForecast = upcomingMonths.length > 0 ? remaining / upcomingMonths.length : 0
          result.push({
            cost_center_id: ccId,
            cost_center_name: cc ? `${cc.code ? cc.code + ' - ' : ''}${cc.name}` : ccId,
            account_id: acc.id,
            account_name: acc.name,
            account_code: acc.code,
            total_budgeted: group.budgeted,
            total_realized: group.realized,
            remaining,
            monthly_forecast: monthlyForecast,
            upcoming_months: upcomingMonths,
          })
        }
      }

      setProposals(result)
      setLoading(false)
    },
    [],
  )

  const apply = useCallback(
    async (clientId: string) => {
      setApplying(true)
      const upcomingMonths = proposals[0]?.upcoming_months || []
      const referenceDates = upcomingMonths.map((m) => `${m}-01`)

      const { data: existing } = await supabase
        .from('budget_entries')
        .select('*')
        .eq('client_id', clientId)
        .in('reference_month', referenceDates)

      const existingMap: Record<string, any> = {}
      for (const e of existing || []) {
        existingMap[`${e.cost_center_id}__${e.account_id}__${e.reference_month}`] = e
      }

      const payload = proposals.flatMap((p) =>
        p.upcoming_months.map((month) => {
          const refDate = `${month}-01`
          const key = `${p.cost_center_id}__${p.account_id}__${refDate}`
          const ex = existingMap[key]
          return {
            client_id: clientId,
            cost_center_id: p.cost_center_id,
            account_id: p.account_id,
            reference_month: refDate,
            budgeted_amount: ex?.budgeted_amount ?? 0,
            realized_amount: ex?.realized_amount ?? 0,
            forecast_amount: p.monthly_forecast,
          }
        }),
      )

      const { error } = await supabase.from('budget_entries').upsert(payload, {
        onConflict: 'client_id, cost_center_id, account_id, reference_month',
      })

      setApplying(false)
      return { error }
    },
    [proposals],
  )

  return { loading, applying, proposals, analyze, apply }
}
