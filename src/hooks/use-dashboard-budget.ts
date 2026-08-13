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
      const [{ data: ccData }, mData] = await Promise.all([
        supabase
          .from('budget_cost_centers')
          .select('id, name')
          .eq('client_id', activeClient.id)
          .order('name'),
        (async () => {
          // Paginação completa: busca todos os registros de reference_month,
          // sem o limite padrão de 1.000, para que nenhum mês suma do filtro.
          let all: any[] = []
          let page = 0
          const pageSize = 1000
          let hasMore = true
          while (hasMore) {
            const { data: pageData } = await supabase
              .from('budget_entries')
              .select('reference_month')
              .eq('client_id', activeClient.id)
              // Ordenação determinística (pela PK) é OBRIGATÓRIA ao paginar com
              // .range(): sem ORDER BY o Postgres pode devolver linhas em ordem
              // distinta a cada requisição, duplicando/omitindo registros entre
              // páginas e distorcendo as somatórias dos KPIs.
              .order('id')
              .range(page * pageSize, (page + 1) * pageSize - 1)

            if (!pageData || pageData.length === 0) {
              hasMore = false
            } else {
              all = all.concat(pageData)
              if (pageData.length < pageSize) hasMore = false
              else page++
            }
          }
          return all
        })(),
      ])

      setCostCenters(ccData || [])

      if (mData) {
        const uniqueMonths = Array.from(new Set(mData.map((m) => m.reference_month))).sort()
        setAvailableMonths(uniqueMonths)
      }
    }
    fetchFilters()
  }, [activeClient])

  const selectedMonthsKey = selectedMonths.join(',')
  const selectedCostCentersKey = selectedCostCenters.join(',')

  useEffect(() => {
    if (!activeClient) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        let allEntries: any[] = []
        let page = 0
        const pageSize = 1000
        let hasMore = true

        while (hasMore) {
          let query = supabase
            .from('budget_entries')
            .select('*, budget_cost_centers(name), budget_accounts(name, type)')
            .eq('client_id', activeClient.id)
            // Ordenação determinística (pela PK) é OBRIGATÓRIA ao paginar com
            // .range(): sem ORDER BY o Postgres pode devolver linhas em ordem
            // distinta a cada requisição, duplicando/omitindo registros entre
            // páginas e distorcendo as somatórias dos KPIs.
            .order('id')

          if (selectedMonths.length > 0) {
            query = query.in('reference_month', selectedMonths)
          }

          if (selectedCostCenters.length > 0) {
            query = query.in('cost_center_id', selectedCostCenters)
          }

          const { data: pageEntries, error } = await query.range(
            page * pageSize,
            (page + 1) * pageSize - 1,
          )

          if (error) throw error

          if (!pageEntries || pageEntries.length === 0) {
            hasMore = false
          } else {
            allEntries = allEntries.concat(pageEntries)
            if (pageEntries.length < pageSize) {
              hasMore = false
            } else {
              page++
            }
          }
        }

        if (allEntries.length === 0) {
          setData(null)
          return
        }

        // Defensivo: caso a paginação ainda traga algum registro duplicado,
        // eliminamos pela PK antes de somar. Cada lançamento deve ser contado
        // exatamente uma vez, independentemente de quantos centros de custo e
        // meses estejam selecionados.
        const seenIds = new Set<string>()
        const uniqueEntries = allEntries.filter((entry) => {
          if (entry.id && seenIds.has(entry.id)) return false
          if (entry.id) seenIds.add(entry.id)
          return true
        })

        const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100

        let totalBudgeted = 0
        let totalRealized = 0
        let totalForecast = 0

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
        const ccAccountMap: Record<string, Record<string, number>> = {}

        uniqueEntries.forEach((entry) => {
          const budgeted = Number(entry.budgeted_amount) || 0
          const realized = Number(entry.realized_amount) || 0

          const forecast = Number(entry.forecast_amount) || 0
          totalBudgeted = round2(totalBudgeted + budgeted)
          totalRealized = round2(totalRealized + realized)
          totalForecast = round2(totalForecast + forecast)

          const month = entry.reference_month
          if (!monthlyDataMap[month]) monthlyDataMap[month] = { month, budgeted: 0, realized: 0 }
          monthlyDataMap[month].budgeted = round2(monthlyDataMap[month].budgeted + budgeted)
          monthlyDataMap[month].realized = round2(monthlyDataMap[month].realized + realized)

          const accountName = (entry.budget_accounts as any)?.name || 'Desconhecida'
          if (!accountDataMap[accountName])
            accountDataMap[accountName] = { name: accountName, budgeted: 0, realized: 0 }
          accountDataMap[accountName].budgeted = round2(
            accountDataMap[accountName].budgeted + budgeted,
          )
          accountDataMap[accountName].realized = round2(
            accountDataMap[accountName].realized + realized,
          )

          const ccName = (entry.budget_cost_centers as any)?.name || 'Desconhecido'
          if (!costCenterDataMap[ccName])
            costCenterDataMap[ccName] = { name: ccName, budgeted: 0, realized: 0 }
          costCenterDataMap[ccName].budgeted = round2(costCenterDataMap[ccName].budgeted + budgeted)
          costCenterDataMap[ccName].realized = round2(costCenterDataMap[ccName].realized + realized)

          if (!ccAccountMap[ccName]) ccAccountMap[ccName] = {}
          ccAccountMap[ccName][accountName] = round2(
            (ccAccountMap[ccName][accountName] || 0) + realized,
          )
        })

        let criticalCC = ''
        let maxOver = 0
        let criticalAcc = ''
        let warningCC = ''
        let warnPct = 0

        Object.values(costCenterDataMap).forEach((cc) => {
          if (cc.budgeted > 0) {
            const pct = (cc.realized / cc.budgeted) * 100
            if (pct > 100 && pct > maxOver) {
              maxOver = pct
              criticalCC = cc.name
              let maxAccVal = 0
              Object.entries(ccAccountMap[cc.name] || {}).forEach(([acc, val]) => {
                if (val > maxAccVal) {
                  maxAccVal = val
                  criticalAcc = acc
                }
              })
            } else if (pct >= 90 && pct <= 100 && pct > warnPct) {
              warnPct = pct
              warningCC = cc.name
            }
          }
        })

        const insights = {
          critical: criticalCC
            ? { cc: criticalCC, pct: (maxOver - 100).toFixed(1), account: criticalAcc }
            : null,
          warning: warningCC ? { cc: warningCC, pct: warnPct.toFixed(1) } : null,
          forecast: totalForecast,
        }

        setData({
          totalBudgeted,
          totalRealized,
          totalForecast,
          monthlyData: Object.values(monthlyDataMap).sort((a, b) => a.month.localeCompare(b.month)),
          accountData: Object.values(accountDataMap).sort((a, b) => b.budgeted - a.budgeted),
          costCenterData: Object.values(costCenterDataMap).sort((a, b) => b.budgeted - a.budgeted),
          entryCount: uniqueEntries.length,
          insights,
        })
      } catch (error) {
        console.error('Error fetching budget data', error)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeClient, selectedMonthsKey, selectedCostCentersKey])

  return { data, costCenters, availableMonths, loading }
}
