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
  const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100

  const latestMonth = [...selectedMonths].sort().pop() || new Date().toISOString().substring(0, 7)
  const upcomingMonths = generateUpcomingMonthsSafra(latestMonth)
  const safraMonths = new Set(getAgriculturalYearMonths(latestMonth))

  const safraEntries = (entries || []).filter((e) =>
    safraMonths.has((e.reference_month || '').substring(0, 7)),
  )

  const entryAccountIds = new Set((entries || []).map((e) => e.account_id))
  const accountMap = new Map<string, NameRef>()
  for (const acc of accounts) {
    accountMap.set(acc.id, acc)
  }
  for (const id of entryAccountIds) {
    if (!accountMap.has(id)) {
      accountMap.set(id, { id, name: `Conta ${id.substring(0, 8)}`, code: null })
    }
  }
  const allAccounts = Array.from(accountMap.values())

  const groupMap: Record<string, { budgeted: number; realized: number; forecast: number }> = {}
  for (const e of safraEntries) {
    const key = `${e.cost_center_id}__${e.account_id}`
    if (!groupMap[key]) groupMap[key] = { budgeted: 0, realized: 0, forecast: 0 }
    groupMap[key].budgeted = round2(groupMap[key].budgeted + (Number(e.budgeted_amount) || 0))
    groupMap[key].realized = round2(groupMap[key].realized + (Number(e.realized_amount) || 0))
    groupMap[key].forecast = round2(groupMap[key].forecast + (Number(e.forecast_amount) || 0))
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

    const ccProposals: ForecastProposal[] = []

    for (const acc of allAccounts) {
      const key = `${ccId}__${acc.id}`
      const g = groupMap[key] || { budgeted: 0, realized: 0, forecast: 0 }
      const accountRemaining = round2(Math.max(0, g.budgeted - g.realized))
      const utilRate = g.budgeted > 0 ? g.realized / g.budgeted : 0
      let monthlyForecast = 0
      let surplusAmt = 0
      let warning: string | null = null
      let hasSurplus = false

      if (g.budgeted > 0 && utilRate >= 1) {
        warning = 'Redução drástica necessária: 100% do orçado já realizado. Previsão zerada.'
      } else if (g.budgeted > 0 && utilRate > 0.8) {
        warning = `Atenção: ${(utilRate * 100).toFixed(0)}% do orçado já realizado. Redução necessária.`
        monthlyForecast =
          upcomingMonths.length > 0 ? round2(accountRemaining / upcomingMonths.length) : 0
      } else if (g.budgeted > 0 && utilRate < 0.5) {
        hasSurplus = true
        surplusAmt = round2(accountRemaining * (1 - utilRate))
        monthlyForecast =
          upcomingMonths.length > 0
            ? round2((accountRemaining - surplusAmt) / upcomingMonths.length)
            : 0
        warning = `Excedente de ${surplusAmt.toFixed(2)}: apenas ${(utilRate * 100).toFixed(0)}% utilizado. Possível remanejamento.`
      } else {
        monthlyForecast =
          upcomingMonths.length > 0 ? round2(accountRemaining / upcomingMonths.length) : 0
      }

      const proposal: ForecastProposal = {
        cost_center_id: ccId,
        cost_center_name: ccName,
        account_id: acc.id,
        account_name: acc.name,
        account_code: acc.code,
        total_budgeted: g.budgeted,
        total_realized: g.realized,
        remaining: accountRemaining,
        monthly_forecast: round2(monthlyForecast),
        upcoming_months: upcomingMonths,
        warning,
        has_surplus: hasSurplus,
      }

      proposals.push(proposal)
      ccProposals.push(proposal)

      const s = ccMap[ccId]
      s.total_budgeted = round2(s.total_budgeted + g.budgeted)
      s.total_realized = round2(s.total_realized + g.realized)
      s.total_forecast = round2(s.total_forecast + monthlyForecast * upcomingMonths.length)
      s.total_surplus = round2(s.total_surplus + surplusAmt)
      s.accounts.push({
        account_id: acc.id,
        account_name: acc.name,
        account_code: acc.code,
        budgeted: g.budgeted,
        realized: g.realized,
        remaining: accountRemaining,
        forecast: monthlyForecast,
        warning,
        has_surplus: hasSurplus,
        surplus_amount: surplusAmt,
      })
      if (warning) s.warnings.push(`${acc.name}: ${warning}`)
    }

    const s = ccMap[ccId]
    s.total_remaining = round2(Math.max(0, s.total_budgeted - s.total_realized))

    const ccUtil = s.total_budgeted > 0 ? s.total_realized / s.total_budgeted : 0
    if (s.total_realized >= s.total_budgeted && s.total_budgeted > 0) {
      s.situation = 'critical'
      const overspentAmount = s.total_realized - s.total_budgeted
      for (const p of ccProposals) {
        p.remaining = 0
        p.monthly_forecast = 0
        p.warning = `Centro de custo sem saldo: realizado ≥ orçado. Déficit de R$ ${overspentAmount.toFixed(2)}.`
      }
      for (const acc of s.accounts) {
        acc.remaining = 0
        acc.forecast = 0
      }
      s.total_forecast = 0
      s.warnings.push(
        `Centro de custo ${s.cost_center_name}: orçamento totalmente consumido (déficit de R$ ${overspentAmount.toFixed(2)}). Recomenda-se análise de todos os centros de custo para identificar excedentes que possam ser remanejados para cobrir o déficit.`,
      )
    } else if (ccUtil > 0.8) {
      s.situation = 'deficit'
    } else if (ccUtil < 0.5 && s.total_surplus > 0) {
      s.situation = 'surplus'
    } else {
      s.situation = 'healthy'
    }
  }

  const reallocations: ReallocationSuggestion[] = []
  const surplusCCs = Object.values(ccMap).filter(
    (s) => s.total_surplus > 0 && s.situation !== 'critical',
  )
  const deficitCCs = Object.values(ccMap).filter(
    (s) => s.situation === 'critical' || s.situation === 'deficit',
  )

  for (const src of surplusCCs) {
    for (const dst of deficitCCs) {
      if (src.cost_center_id === dst.cost_center_id) continue
      let dstDeficit: number
      if (dst.situation === 'critical') {
        dstDeficit = Math.max(0, dst.total_realized - dst.total_budgeted)
      } else {
        dstDeficit = Math.max(0, dst.total_realized - dst.total_budgeted * 0.8)
      }
      const amount = Math.min(src.total_surplus, dstDeficit)
      if (amount > 0) {
        reallocations.push({
          id: `${src.cost_center_id}__${dst.cost_center_id}`,
          from_cost_center_id: src.cost_center_id,
          from_cost_center_name: src.cost_center_name,
          to_cost_center_id: dst.cost_center_id,
          to_cost_center_name: dst.cost_center_name,
          amount,
          reason:
            dst.situation === 'critical'
              ? `${src.cost_center_name} possui excedente de R$ ${src.total_surplus.toFixed(2)} e ${dst.cost_center_name} está com déficit de R$ ${dstDeficit.toFixed(2)} (realizado superior ao orçado).`
              : `${src.cost_center_name} possui excedente de R$ ${src.total_surplus.toFixed(2)} e ${dst.cost_center_name} precisa de cobertura de R$ ${dstDeficit.toFixed(2)}.`,
        })
      }
    }
  }

  return { proposals, studies: Object.values(ccMap), upcomingMonths, reallocations }
}
