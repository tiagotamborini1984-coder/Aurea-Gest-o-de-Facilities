export function getAgriculturalYearStart(referenceMonth: string): string {
  const [year, month] = referenceMonth.split('-').map(Number)
  if (month >= 4) return `${year}-04`
  return `${year - 1}-04`
}

export function getAgriculturalYearEnd(referenceMonth: string): string {
  const [year, month] = referenceMonth.split('-').map(Number)
  if (month >= 4) return `${year + 1}-03`
  return `${year}-03`
}

export function generateUpcomingMonthsSafra(referenceMonth: string): string[] {
  const [year, month] = referenceMonth.split('-').map(Number)
  const endYear = month >= 4 ? year + 1 : year
  const months: string[] = []
  let cy = year
  let cm = month + 1
  while (cy < endYear || (cy === endYear && cm <= 3)) {
    months.push(`${cy}-${String(cm).padStart(2, '0')}`)
    cm++
    if (cm > 12) {
      cm = 1
      cy++
    }
  }
  return months
}

export function getAgriculturalYearMonths(referenceMonth: string): string[] {
  const start = getAgriculturalYearStart(referenceMonth)
  const end = getAgriculturalYearEnd(referenceMonth)
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  const months: string[] = []
  let cy = sy
  let cm = sm
  while (cy < ey || (cy === ey && cm <= em)) {
    months.push(`${cy}-${String(cm).padStart(2, '0')}`)
    cm++
    if (cm > 12) {
      cm = 1
      cy++
    }
  }
  return months
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-')
  return `${m}/${y}`
}
