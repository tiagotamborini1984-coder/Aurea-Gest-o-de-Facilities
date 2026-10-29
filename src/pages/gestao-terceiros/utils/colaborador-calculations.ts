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

export const normalizeDate = (d: string | null | undefined | any): string => {
  if (!d) return ''
  if (d instanceof Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const str = String(d).trim()
  if (str.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10)
  }
  return str
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

export const getPersonDedupeKey = (
  emp: {
    registration_number?: string | null
    name?: string | null
    id?: string
    plant_id?: string | null
  },
  knownRegByPlantAndName?: Map<string, string>,
): string => {
  const normName = normalizePersonKey(emp.name)
  const pid = emp.plant_id || ''
  const directReg = emp.registration_number?.trim().toUpperCase()
  const fallbackReg =
    !directReg && knownRegByPlantAndName && normName
      ? knownRegByPlantAndName.get(`${normName}::${pid}`)
      : undefined
  const reg = directReg || fallbackReg
  const identifier = reg || normName || emp.id || ''
  return `${identifier}-${pid}`
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
  // Mapa de matrículas conhecidas por (nome_normalizado, planta) para unificar
  // versões antigas que não tinham matrícula preenchida
  const knownRegByPlantAndName = new Map<string, string>()
  employees.forEach((e) => {
    if (!e) return
    const reg = e.registration_number?.trim().toUpperCase()
    const norm = normalizePersonKey(e.name)
    const pid = e.plant_id || ''
    if (reg && norm) {
      knownRegByPlantAndName.set(`${norm}::${pid}`, reg)
    }
  })

  // 1. Agrupamento de colaboradores por pessoa física + planta
  const empGroups = new Map<string, any[]>()
  employees.forEach((e) => {
    if (!e) return
    const dedupKey = getPersonDedupeKey(e, knownRegByPlantAndName)
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

  // Helper para avaliar status de presença do log de forma robusta
  const isPresentLog = (l: any): boolean => {
    return l.status === true || l.status === 'true' || l.status === 1 || l.status === '1'
  }

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

    // Deduplicação de registros no mesmo dia: ordenação por created_at DESC (timestamp real)
    // para que o lançamento mais recente prevaleça em caso de retificação
    const sortedLogs = [...plantLogs].sort((a, b) => {
      const timeB = b.created_at ? new Date(b.created_at).getTime() : NaN
      const timeA = a.created_at ? new Date(a.created_at).getTime() : NaN
      const validB = !Number.isNaN(timeB)
      const validA = !Number.isNaN(timeA)

      if (validB && validA && timeB !== timeA) {
        return timeB - timeA
      }
      if (validB && !validA) return -1
      if (!validB && validA) return 1

      return (b.id || '').localeCompare(a.id || '')
    })

    // Mapa por data normalizada (YYYY-MM-DD): exatamente um registro por dia distinto
    const dateLogsMap = new Map<string, any>()
    sortedLogs.forEach((l) => {
      const d = normalizeDate(l.date)
      if (!d) return
      if (!dateLogsMap.has(d)) {
        dateLogsMap.set(d, { ...l, date: d })
      }
    })

    const dedupedLogs = Array.from(dateLogsMap.values())

    // Regra v0.0.1799–0.0.1803:
    // "Dias Lançados" = somatória de dias distintos no período selecionado em que o colaborador teve registro de PRESENÇA.
    // "Total Faltas" = somatória de dias distintos no período selecionado em que o colaborador teve registro de FALTA.
    // Cada coluna conta os dias da sua própria natureza após a deduplicação diária (preservando o log mais recente por timestamp).
    // Dias sem nenhum lançamento não contam como falta nem presença.
    const distinctLoggedDays = dedupedLogs.length
    const presencas = dedupedLogs.filter((l) => isPresentLog(l)).length
    const faltas = dedupedLogs.filter((l) => !isPresentLog(l)).length
    // "Dias Lançados" agora reflete a somatória de presenças no período selecionado
    const loggedDays = presencas

    const mPres = distinctLoggedDays > 0 ? presencas / distinctLoggedDays : 0
    const mFaltas = distinctLoggedDays > 0 ? faltas / distinctLoggedDays : 0
    const cont = 1
    const taxaPresenca = distinctLoggedDays > 0 ? (presencas / distinctLoggedDays) * 100 : 0
    const absenteismo = distinctLoggedDays > 0 ? (faltas / distinctLoggedDays) * 100 : 0

    const absenceDates = dedupedLogs
      .filter((l) => !isPresentLog(l))
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
      presencasCount: presencas,
      absenceDates,
    })
  })

  return results.sort((a, b) =>
    a.Entidade.localeCompare(b.Entidade, 'pt-BR', { sensitivity: 'base' }),
  )
}
