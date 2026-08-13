import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  analyzeBudgetData,
  type ForecastProposal,
  type StudyAnalysis,
  type ReallocationSuggestion,
} from '@/lib/forecast-analysis'

export type { ForecastProposal, StudyAnalysis, ReallocationSuggestion }

interface AccountRef {
  id: string
  name: string
  code: string | null
}

export function useForecastAgent() {
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [proposals, setProposals] = useState<ForecastProposal[]>([])
  const [studies, setStudies] = useState<StudyAnalysis[]>([])
  const [reallocations, setReallocations] = useState<ReallocationSuggestion[]>([])
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  const [upcomingMonths, setUpcomingMonths] = useState<string[]>([])

  const analyze = useCallback(
    async (
      clientId: string,
      costCenterIds: string[],
      accounts: AccountRef[],
      costCenters: AccountRef[],
      selectedMonths: string[],
    ) => {
      setLoading(true)
      setProposals([])
      setStudies([])
      setReallocations([])
      setAcceptedIds(new Set())

      let entries: any[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: pageEntries } = await supabase
          .from('budget_entries')
          .select('*')
          .eq('client_id', clientId)
          .in('cost_center_id', costCenterIds)
          // Ordenação determinística pela PK é obrigatória ao paginar com .range().
          .order('id')
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (!pageEntries || pageEntries.length === 0) {
          hasMore = false
        } else {
          entries = entries.concat(pageEntries)
          if (pageEntries.length < pageSize) {
            hasMore = false
          } else {
            page++
          }
        }
      }

      const entryAccountIds = new Set((entries || []).map((e) => e.account_id))
      const knownAccountIds = new Set(accounts.map((a) => a.id))
      const missingAccountIds = Array.from(entryAccountIds).filter((id) => !knownAccountIds.has(id))

      let mergedAccounts: AccountRef[] = accounts
      if (missingAccountIds.length > 0) {
        const { data: missingAccounts } = await supabase
          .from('budget_accounts')
          .select('id, name, code')
          .in('id', missingAccountIds)

        if (missingAccounts && missingAccounts.length > 0) {
          const fetchedIds = new Set(missingAccounts.map((a) => a.id))
          const stillMissing = missingAccountIds.filter((id) => !fetchedIds.has(id))
          const stillMissingRefs: AccountRef[] = stillMissing.map((id) => ({
            id,
            name: `Conta ${id.substring(0, 8)}`,
            code: null,
          }))
          mergedAccounts = [
            ...accounts,
            ...missingAccounts.map((a) => ({
              id: a.id,
              name: a.name,
              code: a.code,
            })),
            ...stillMissingRefs,
          ]
        }
      }

      const result = analyzeBudgetData(
        entries || [],
        costCenterIds,
        mergedAccounts,
        costCenters,
        selectedMonths,
      )
      setProposals(result.proposals)
      setStudies(result.studies)
      setReallocations(result.reallocations)
      setUpcomingMonths(result.upcomingMonths)
      setLoading(false)
    },
    [],
  )

  const toggleReallocation = useCallback((id: string) => {
    setAcceptedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const apply = useCallback(
    async (clientId: string) => {
      setApplying(true)
      const months =
        upcomingMonths.length > 0 ? upcomingMonths : proposals[0]?.upcoming_months || []
      if (months.length === 0) {
        setApplying(false)
        return { error: { message: 'Ano safra encerrado. Nenhum mês futuro disponível.' } }
      }

      const referenceDates = months.map((m) => `${m}-01`)

      // Paginação completa: busca todos os lançamentos existentes para os meses
      // futuros, sem o limite padrão de 1.000, para não perder registros na
      // montagem do existingMap (o que sobrescreveria valores com zero).
      let existing: any[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true
      while (hasMore) {
        const { data: existingPage } = await supabase
          .from('budget_entries')
          .select('*')
          .eq('client_id', clientId)
          .in('reference_month', referenceDates)
          // Ordenação determinística pela PK é obrigatória ao paginar com .range().
          .order('id')
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (!existingPage || existingPage.length === 0) {
          hasMore = false
        } else {
          existing = existing.concat(existingPage)
          if (existingPage.length < pageSize) hasMore = false
          else page++
        }
      }

      const existingMap: Record<string, any> = {}
      for (const e of existing) {
        existingMap[`${e.cost_center_id}__${e.account_id}__${e.reference_month}`] = e
      }

      const ccDelta: Record<string, number> = {}
      for (const r of reallocations) {
        if (!acceptedIds.has(r.id)) continue
        ccDelta[r.from_cost_center_id] = (ccDelta[r.from_cost_center_id] || 0) - r.amount
        ccDelta[r.to_cost_center_id] = (ccDelta[r.to_cost_center_id] || 0) + r.amount
      }

      const ccAccCount: Record<string, number> = {}
      for (const p of proposals) {
        ccAccCount[p.cost_center_id] = (ccAccCount[p.cost_center_id] || 0) + 1
      }

      // round2 mantém a precisão de centavos ao dividir o remanejamento entre
      // meses e contas, evitando drift acumulado que divergia do Lançamentos.
      const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100

      const payload = proposals.flatMap((p) => {
        const numAccs = ccAccCount[p.cost_center_id] || 1
        const ccAdjust = ccDelta[p.cost_center_id] || 0
        const rawAccDelta = ccAdjust / numAccs
        const accDelta = round2(Math.max(-p.remaining, rawAccDelta))
        const adjRemaining = round2(Math.max(0, p.remaining + accDelta))
        const adjForecast = months.length > 0 ? round2(adjRemaining / months.length) : 0
        const perMonthBudgetDelta = round2(accDelta / months.length)

        return months.map((month) => {
          const refDate = `${month}-01`
          const key = `${p.cost_center_id}__${p.account_id}__${refDate}`
          const ex = existingMap[key]
          const baseBudgeted = round2(Number(ex?.budgeted_amount ?? 0))
          const realized = round2(Number(ex?.realized_amount ?? 0))
          return {
            client_id: clientId,
            cost_center_id: p.cost_center_id,
            account_id: p.account_id,
            reference_month: refDate,
            budgeted_amount: round2(Math.max(0, baseBudgeted + perMonthBudgetDelta)),
            realized_amount: realized,
            forecast_amount: adjForecast,
          }
        })
      })

      const { error } = await supabase.from('budget_entries').upsert(payload, {
        onConflict: 'client_id, cost_center_id, account_id, reference_month',
      })

      setApplying(false)
      return { error }
    },
    [proposals, upcomingMonths, reallocations, acceptedIds],
  )

  return {
    loading,
    applying,
    proposals,
    studies,
    reallocations,
    acceptedReallocations: acceptedIds,
    upcomingMonths,
    analyze,
    apply,
    toggleReallocation,
  }
}
