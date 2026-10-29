export interface ConsolidatedColaboradorReportRow {
  id: string
  Entidade: string
  companyName?: string
  plantId: string
  plantName?: string
  'Média Presenças': number
  'Média Faltas': number
  'Total Faltas': number
  Contratado: number
  'Taxa Presença': number
  Absenteísmo: number
  loggedDays: number
  presencasCount: number
  absenceDates: string[]
}

export const normalizeDate = (d: string | null | undefined): string => {
  if (!d) return ''
  if (d.includes('T')) return d.slice(0, 10)
  return d
}

export const normalizePersonKey = (str: string | null | undefined): string => {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export const getPersonDedupeKey = (emp: {
  registration_number?: string | null
  name?: string | null
  id?: string
  plant_id?: string | null
}): string => {
  const reg = emp.registration_number?.trim().toUpperCase()
  const normName = normalizePersonKey(emp.name)
  const identifier = reg || normName || emp.id || ''
  return `${identifier}-${emp.plant_id || ''}`
}

export interface CalculateColaboradorReportParams {
  employees: any[]
  logs: any[]
  plants: any[]
  effectiveSelectedPlants: string[]
  matchesCompany: (companyId?: string | null, companyName?: string | null) => boolean
  dateFrom: string
  dateTo: string
}

export function calculateColaboradorReport({
  employees,
  logs,
  plants,
  effectiveSelectedPlants,
  matchesCompany,
  dateFrom,
  dateTo,
}: CalculateColaboradorReportParams): ConsolidatedColaboradorReportRow[] {
  // 1. Agrupamento de colaboradores por pessoa física + planta
  const empGroups = new Map<string, any[]>()
  employees.forEach((e) => {
    if (!e) return
    const dedupKey = getPersonDedupeKey(e)
    if (!empGroups.has(dedupKey)) empGroups.set(dedupKey, [])
    empGroups.get(dedupKey)!.push(e)
  })

  // 2. Determinação da versão vigente da pessoa (regras v0.0.1717/v0.0.1718/v0.0.1799)
  const personBestMap = new Map<string, any>()
  const personActiveMap = new Map<string, boolean>()
  const empIdToGroupKey = new Map<string, string>()

  empGroups.forEach((group, groupKey) => {
    group.sort((a, b) => {
      const timeDiff =
        new Date(b.reference_month || 0).getTime() - new Date(a.reference_month || 0).getTime()
      if (timeDiff !== 0) return timeDiff
      const createdDiff =
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      if (createdDiff !== 0) return createdDiff
      const aActive = a.status?.trim().toUpperCase() === 'ATIVO' ? 0 : 1
      const bActive = b.status?.trim().toUpperCase() === 'ATIVO' ? 0 : 1
      return aActive - bActive
    })
    const best = group[0]
    const isActive = best.status?.trim().toUpperCase() === 'ATIVO'
    personBestMap.set(groupKey, best)
    personActiveMap.set(groupKey, isActive)

    group.forEach((member) => {
      empIdToGroupKey.set(member.id, groupKey)
    })
  })

  // 3. Filtrar logs válidos de staff no período e plantas selecionadas
  const staffLogs = logs.filter((l) => {
    if (l.type !== 'staff') return false
    if (!effectiveSelectedPlants.includes(l.plant_id)) return false
    const lDate = normalizeDate(l.date)
    return lDate >= dateFrom && lDate <= dateTo
  })

  // Agrupar logs por groupKey da pessoa
  const logsByGroupKey = new Map<string, any[]>()
  staffLogs.forEach((l) => {
    const groupKey = empIdToGroupKey.get(l.reference_id)
    if (!groupKey) return
    if (!logsByGroupKey.has(groupKey)) logsByGroupKey.set(groupKey, [])
    logsByGroupKey.get(groupKey)!.push(l)
  })

  const plantNameMap = new Map<string, string>()
  plants.forEach((p) => {
    if (p.id) plantNameMap.set(p.id, p.name)
  })

  const results: ConsolidatedColaboradorReportRow[] = []

  // 4. Iterar sobre os colaboradores consolidados
  empGroups.forEach((_group, groupKey) => {
    const best = personBestMap.get(groupKey)
    if (!best) return

    // Respeitar restrição de planta
    if (!effectiveSelectedPlants.includes(best.plant_id)) return

    // Respeitar filtro de empresa
    if (!matchesCompany(best.company_id, best.company_name)) return

    const isActive = personActiveMap.get(groupKey) === true
    const pLogsRaw = logsByGroupKey.get(groupKey) || []

    // Regra v0.0.1799: cada registro é estritamente vinculado à planta do colaborador
    const plantLogs = pLogsRaw.filter((l) => l.plant_id === best.plant_id)

    // Se o colaborador não estiver ativo e não possuir lançamentos no período, não exibe
    if (!isActive && plantLogs.length === 0) return

    // Deduplicação de registros no mesmo dia: ordenação por created_at DESC para o mais recente vencer
    const sortedLogs = [...plantLogs].sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || ''),
    )
    const dateLogsMap = new Map<string, any>()
    sortedLogs.forEach((l) => {
      const d = normalizeDate(l.date)
      if (!dateLogsMap.has(d)) {
        dateLogsMap.set(d, { ...l, date: d })
      }
    })

    const dedupedLogs = Array.from(dateLogsMap.values())

    // Regra v0.0.1799: Dias sem lançamento NÃO contam como ausência (a média usa apenas os dias efetivamente registrados)
    const loggedDays = dedupedLogs.length
    const pres = dedupedLogs.filter((l) => l.status === true).length
    const faltas = dedupedLogs.filter((l) => l.status === false).length
    const mPres = loggedDays > 0 ? pres / loggedDays : 0
    const mFaltas = loggedDays > 0 ? faltas / loggedDays : 0
    const cont = 1
    const taxaPresenca = loggedDays > 0 ? (pres / loggedDays) * 100 : 0
    const absenteismo = loggedDays > 0 ? (faltas / loggedDays) * 100 : 0

    const absenceDates = dedupedLogs
      .filter((l) => l.status === false)
      .map((l) => l.date)
      .sort()

    results.push({
      id: best.id || groupKey,
      Entidade: best.name || 'Colaborador sem nome',
      companyName: best.company_name || undefined,
      plantId: best.plant_id,
      plantName: plantNameMap.get(best.plant_id),
      'Média Presenças': mPres,
      'Média Faltas': mFaltas,
      'Total Faltas': faltas,
      Contratado: cont,
      'Taxa Presença': taxaPresenca,
      Absenteísmo: absenteismo,
      loggedDays,
      presencasCount: pres,
      absenceDates,
    })
  })

  return results.sort((a, b) =>
    a.Entidade.localeCompare(b.Entidade, 'pt-BR', { sensitivity: 'base' }),
  )
}
