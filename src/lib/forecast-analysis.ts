import { generateUpcomingMonthsSafra, getAgriculturalYearMonths } from './agricultural-year'

export interface AccountAnalysis {
  account_id: string
  account_name: string
  account_code: string | null
  budgeted: number
  realized: number
  remaining: number
  forecast: number
  warning: string | null
  has_surplus: boolean
  surplus_amount: number
}

export interface StudyAnalysis {
  cost_center_id: string
  cost_center_name: string
  total_budgeted: number
  total_realized: number
  total_remaining: number
  total_forecast: number
  total_surplus: number
  situation: 'healthy' | 'surplus' | 'deficit' | 'critical'
  warnings: string[]
  accounts: AccountAnalysis[]
}

export interface ReallocationSuggestion {
  id: string
  from_cost_center_id: string
  from_cost_center_name: string
  to_cost_center_id: string
  to_cost_center_name: string
  amount: number
  reason: string
}

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
  warning: string | null
  has_surplus: boolean
}

interface EntryRow {
  cost_center_id: string
  account_id: string
  budgeted_amount: number | string
  realized_amount: number | string
  forecast_amount: number | string
  reference_month: string
}

interface NameRef {
  id: string
  name: string
  code: string | null
}

export function analyzeBudgetData(
  entries: EntryRow[],
  costCenterIds: string[],
  accounts: NameRef[],
  costCenters: NameRef[],
  selectedMonths: string[],
): {
  proposals: ForecastProposal[]
  studies: StudyAnalysis[]
  upcomingMonths: string[]
  reallocations: ReallocationSuggestion[]
} {
  const latestMonth = [...selectedMonths].sort().pop() || new Date().toISOString().substring(0, 7)
  const upcomingMonths = generateUpcomingMonthsSafra(latestMonth)
  const safraMonths = new Set(getAgriculturalYearMonths(latestMonth))

  const safraEntries = (entries || []).filter((e) =>
    safraMonths.has((e.reference_month || '').substring(0, 7)),
  )

  const groupMap: Record<string, { budgeted: number; realized: number; forecast: number }> = {}
  for (const e of safraEntries) {
    const key = `${e.cost_center_id}__${e.account_id}`
    if (!groupMap[key]) groupMap[key] = { budgeted: 0, realized: 0, forecast: 0 }
    groupMap[key].budgeted += Number(e.budgeted_amount) || 0
    groupMap[key].realized += Number(e.realized_amount) || 0
    groupMap[key].forecast += Number(e.forecast_amount) || 0
  }

  const proposals: ForecastProposal[] = []
  const ccMap: Record<string, StudyAnalysis> = {}

  for (const ccId of costCenterIds) {
    const cc = costCenters.find((c) => c.id === ccId)
    const ccName = cc ? `${cc.code ? cc.code + ' - ' : ''}${cc.name}` : ccId
    ccMap[ccId] = {
      cost_center_id: ccId,
      cost_center_name: ccName,
      total_budgeted: 0,
      total_realized: 0,
      total_remaining: 0,
      total_forecast: 0,
      total_surplus: 0,
      situation: 'healthy',
      warnings: [],
      accounts: [],
    }

    for (const acc of accounts) {
      const key = `${ccId}__${acc.id}`
      const g = groupMap[key] || { budgeted: 0, realized: 0, forecast: 0 }
      const remaining = Math.max(0, g.budgeted - g.realized)
      const utilRate = g.budgeted > 0 ? g.realized / g.budgeted : 0
      let monthlyForecast = 0
      let surplusAmt = 0
      let warning: string | null = null
      let hasSurplus = false

      if (g.budgeted > 0 && utilRate >= 1) {
        warning = 'Redução drástica necessária: 100% do orçado já realizado. Previsão zerada.'
      } else if (g.budgeted > 0 && utilRate > 0.8) {
        warning = `Atenção: ${(utilRate * 100).toFixed(0)}% do orçado já realizado. Redução necessária.`
        monthlyForecast = upcomingMonths.length > 0 ? remaining / upcomingMonths.length : 0
      } else if (g.budgeted > 0 && utilRate < 0.5) {
        hasSurplus = true
        surplusAmt = remaining * (1 - utilRate)
        monthlyForecast =
          upcomingMonths.length > 0 ? (remaining - surplusAmt) / upcomingMonths.length : 0
        warning = `Excedente de ${surplusAmt.toFixed(2)}: apenas ${(utilRate * 100).toFixed(0)}% utilizado. Possível remanejamento.`
      } else {
        monthlyForecast = upcomingMonths.length > 0 ? remaining / upcomingMonths.length : 0
      }

      proposals.push({
        cost_center_id: ccId,
        cost_center_name: ccName,
        account_id: acc.id,
        account_name: acc.name,
        account_code: acc.code,
        total_budgeted: g.budgeted,
        total_realized: g.realized,
        remaining,
        monthly_forecast: monthlyForecast,
        upcoming_months: upcomingMonths,
        warning,
        has_surplus: hasSurplus,
      })

      const s = ccMap[ccId]
      s.total_budgeted += g.budgeted
      s.total_realized += g.realized
      s.total_remaining += remaining
      s.total_forecast += monthlyForecast * upcomingMonths.length
      s.total_surplus += surplusAmt
      s.accounts.push({
        account_id: acc.id,
        account_name: acc.name,
        account_code: acc.code,
        budgeted: g.budgeted,
        realized: g.realized,
        remaining,
        forecast: monthlyForecast,
        warning,
        has_surplus: hasSurplus,
        surplus_amount: surplusAmt,
      })
      if (warning) s.warnings.push(`${acc.name}: ${warning}`)
    }

    const s = ccMap[ccId]
    const ccUtil = s.total_budgeted > 0 ? s.total_realized / s.total_budgeted : 0
    if (s.total_realized > s.total_budgeted && s.total_budgeted > 0) s.situation = 'critical'
    else if (ccUtil > 0.8) s.situation = 'deficit'
    else if (ccUtil < 0.5 && s.total_surplus > 0) s.situation = 'surplus'
    else s.situation = 'healthy'
  }

  const reallocations: ReallocationSuggestion[] = []
  const surplusCCs = Object.values(ccMap).filter((s) => s.total_surplus > 0)
  const deficitCCs = Object.values(ccMap).filter(
    (s) => s.situation === 'critical' || s.situation === 'deficit',
  )

  for (const src of surplusCCs) {
    for (const dst of deficitCCs) {
      if (src.cost_center_id === dst.cost_center_id) continue
      const dstDeficit = Math.max(0, dst.total_realized - dst.total_budgeted * 0.8)
      const amount = Math.min(src.total_surplus, dstDeficit)
      if (amount > 0) {
        reallocations.push({
          id: `${src.cost_center_id}__${dst.cost_center_id}`,
          from_cost_center_id: src.cost_center_id,
          from_cost_center_name: src.cost_center_name,
          to_cost_center_id: dst.cost_center_id,
          to_cost_center_name: dst.cost_center_name,
          amount,
          reason: `${src.cost_center_name} possui excedente de ${src.total_surplus.toFixed(2)} e ${dst.cost_center_name} precisa de cobertura de ${dstDeficit.toFixed(2)}.`,
        })
      }
    }
  }

  return { proposals, studies: Object.values(ccMap), upcomingMonths, reallocations }
}
