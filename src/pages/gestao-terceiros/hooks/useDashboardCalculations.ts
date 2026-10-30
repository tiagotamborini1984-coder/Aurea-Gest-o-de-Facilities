import { useMemo } from 'react'
import { parseISO, eachDayOfInterval, format, eachMonthOfInterval } from 'date-fns'

export function useDashboardCalculations(
  logs: any[],
  monthlyGoals: any[],
  contracted: any[],
  plants: any[],
  locations: any[],
  employees: any[],
  equipment: any[],
  goals: any[],
  selectedPlants: string[],
  selectedCompanies: string[],
  activeTab: 'colaboradores' | 'equipamentos' | 'metas',
  dateFrom: string,
  dateTo: string,
  absenteeismTarget: number = 4,
  schedules: any[] = [],
  areas: any[] = [],
  nonWorkingDays: any[] = [],
) {
  return useMemo(() => {
    // Normaliza datas para garantir que logs com timestamp sejam considerados corretamente e lidar com timezone offsets
    const normalizeDate = (d: string) => {
      if (!d) return ''
      if (d.includes('T')) {
        return format(parseISO(d), 'yyyy-MM-dd')
      }
      return d
    }

    // Mapeamento de datas não úteis por planta
    const nonWorkingDatesByPlant: Record<string, Set<string>> = {}
    if (nonWorkingDays && nonWorkingDays.length > 0) {
      nonWorkingDays.forEach((nwd: any) => {
        if (!nwd.plant_id || !nwd.date) return
        const nDate = normalizeDate(nwd.date)
        if (!nonWorkingDatesByPlant[nwd.plant_id]) {
          nonWorkingDatesByPlant[nwd.plant_id] = new Set<string>()
        }
        nonWorkingDatesByPlant[nwd.plant_id].add(nDate)
      })
    }

    const isPlantDateNonWorking = (plantId: string, date: string) => {
      // Para equipamentos, a operação de máquinas/veículos segue todos os dias com lançamento
      // ou cadastrados (não restrita à escala de dias úteis padrão de pessoal)
      if (activeTab === 'equipamentos') return false
      return nonWorkingDatesByPlant[plantId]?.has(date) ?? false
    }

    if (!Array.isArray(plants) || !Array.isArray(employees) || !Array.isArray(logs)) {
      return {
        metrics: {
          presente: '0',
          lancado: '0',
          contratado: '0',
          absenteismo: '0.0%',
          absenteismoPercent: 0,
          totalFuncionarios: 0,
          totalEquipamentos: 0,
        },
        plantStats: [],
        locationStats: [],
        dailyTrend: [],
        activeLogs: [],
        equipmentStats: [],
        collaboratorStats: [],
      } as any
    }

    const validPlants = selectedPlants.length > 0 ? selectedPlants : plants.map((p) => p.id)
    const companiesSet = new Set(selectedCompanies)

    const validEmpIds =
      selectedCompanies.length > 0
        ? new Set(employees.filter((e) => companiesSet.has(e.company_name)).map((e) => e.id))
        : new Set(employees.map((e) => e.id))

    const sortedLogsForDedup = [...logs].sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || ''),
    )
    const deduplicatedProcessedLogsMap = new Map<string, any>()
    sortedLogsForDedup.forEach((l) => {
      const lDate = normalizeDate(l.date)
      const key = `${lDate}_${l.type}_${l.reference_id}_${l.plant_id}`
      if (!deduplicatedProcessedLogsMap.has(key)) {
        deduplicatedProcessedLogsMap.set(key, { ...l, date: lDate })
      }
    })
    const processedLogs = Array.from(deduplicatedProcessedLogsMap.values())

    const filteredLogs = processedLogs.filter(
      (l) => validPlants.includes(l.plant_id) && l.date >= dateFrom && l.date <= dateTo,
    )

    const typeLog = activeTab === 'colaboradores' || activeTab === 'metas' ? 'staff' : 'equipment'
    const typeCont =
      activeTab === 'colaboradores' || activeTab === 'metas' ? 'colaborador' : 'equipamento'

    // Normalização robusta de texto (trim + lower + remoção de acentos e múltiplos espaços)
    const normalizePersonKey = (str: string | null | undefined): string => {
      if (!str) return ''
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    }

    const getPersonDedupeKey = (emp: {
      registration_number?: string | null
      name?: string | null
      id?: string
      plant_id?: string
    }) => {
      const reg = emp.registration_number?.trim().toUpperCase()
      const normName = normalizePersonKey(emp.name)
      const identifier = reg || normName || emp.id || ''
      return `${identifier}-${emp.plant_id || ''}`
    }

    // Agrupamento centralizado de colaboradores por pessoa+planta para determinar versão vigente.
    // Regra v0.0.1717 / v0.0.1718: versão mais recente vence (reference_month DESC, desempate por created_at DESC).
    // Se a versão mais recente tiver status 'Inativo' (ou não for 'ATIVO'), o colaborador é considerado inativo.
    const empGroups = new Map<string, any[]>()
    employees.forEach((e) => {
      if (!e) return
      const dedupKey = getPersonDedupeKey(e)
      if (!empGroups.has(dedupKey)) empGroups.set(dedupKey, [])
      empGroups.get(dedupKey)!.push(e)
    })

    // Mapeia se o colaborador na planta está com versão vigente Ativo
    // e também mapeia pelo ID de cada versão histórica para resolução direta no log
    const personActiveInPlantMap = new Map<string, boolean>()
    const personBestInPlantMap = new Map<string, any>()
    const empIdIsCurrentActiveMap = new Map<string, boolean>()
    const empIdCurrentBestMap = new Map<string, any>()

    empGroups.forEach((group, groupKey) => {
      group.sort((a, b) => {
        const timeDiff =
          new Date(b.reference_month || 0).getTime() - new Date(a.reference_month || 0).getTime()
        if (timeDiff !== 0) return timeDiff
        const createdDiff =
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        if (createdDiff !== 0) return createdDiff
        // Em caso de mesmo mês e mesmo timestamp, Ativo desempata
        const aActive = a.status?.trim().toUpperCase() === 'ATIVO' ? 0 : 1
        const bActive = b.status?.trim().toUpperCase() === 'ATIVO' ? 0 : 1
        return aActive - bActive
      })
      const best = group[0]
      const isActive = best.status?.trim().toUpperCase() === 'ATIVO'
      personActiveInPlantMap.set(groupKey, isActive)
      personBestInPlantMap.set(groupKey, best)

      // Associar cada versão do colaborador ao status vigente da pessoa
      group.forEach((member) => {
        empIdIsCurrentActiveMap.set(member.id, isActive)
        empIdCurrentBestMap.set(member.id, best)
      })
    })

    const fallbackCountByPlant = new Map<string, number>()
    if (typeCont === 'colaborador') {
      empGroups.forEach((group) => {
        const best = group[0]
        if (best.status?.trim().toUpperCase() !== 'ATIVO') return
        if (selectedCompanies.length > 0 && !companiesSet.has(best.company_name)) return
        fallbackCountByPlant.set(best.plant_id, (fallbackCountByPlant.get(best.plant_id) || 0) + 1)
      })
    } else {
      equipment.forEach((e) => {
        if (e.status?.trim().toLowerCase() !== 'ativo') return
        fallbackCountByPlant.set(e.plant_id, (fallbackCountByPlant.get(e.plant_id) || 0) + 1)
      })
    }

    const activeLogs = filteredLogs.filter((l) => {
      if (l.type !== typeLog) return false
      if (typeLog === 'staff') {
        if (selectedCompanies.length > 0) {
          return validEmpIds.has(l.reference_id)
        }
        return true
      } else if (typeLog === 'equipment') {
        return true
      }
      return true
    })

    const allDatesInPeriod = eachDayOfInterval({
      start: parseISO(dateFrom),
      end: parseISO(dateTo),
    }).map((d) => format(d, 'yyyy-MM-dd'))

    const plantDateHasLogs: Record<string, boolean> = {}
    activeLogs.forEach((l) => {
      plantDateHasLogs[`${l.plant_id}_${l.date}`] = true
    })

    const getValidDatesForPlant = (pid: string) => {
      const valid = new Set<string>()
      allDatesInPeriod.forEach((date) => {
        if (isPlantDateNonWorking(pid, date)) return
        const hasLogs = plantDateHasLogs[`${pid}_${date}`]
        if (hasLogs) {
          valid.add(date)
        }
      })
      return valid
    }

    const allValidDatesSet = new Set<string>()
    const plantValidDatesMap: Record<string, Set<string>> = {}

    validPlants.forEach((pid) => {
      const pDates = getValidDatesForPlant(pid)
      plantValidDatesMap[pid] = pDates
      pDates.forEach((d) => allValidDatesSet.add(d))
    })

    const excludedDaysCount = allDatesInPeriod.length - allValidDatesSet.size

    const getApplicableContracted = (
      plantId: string,
      type: string,
      date: string,
      filterFn: (c: any) => boolean = () => true,
    ) => {
      const targetMonth = date.substring(0, 7) + '-01'

      const plantContracted = contracted.filter((c) => c.plant_id === plantId && c.type === type)
      if (plantContracted.length === 0) return []

      const months = [
        ...new Set(plantContracted.map((c) => c.reference_month || '2000-01-01')),
      ].sort()
      let applicableMonth = months[0]
      for (const m of months) {
        if (m <= targetMonth) applicableMonth = m
      }

      if (!applicableMonth) return []

      return plantContracted.filter(
        (c) => (c.reference_month || '2000-01-01') === applicableMonth && filterFn(c),
      )
    }

    // Compute global metrics using a unified denominator (global valid days)
    // O divisor do cálculo será composto exclusivamente pelo número de dias em que houve lançamentos salvos
    const globalDays = allValidDatesSet.size

    // Conta total de logs ativos considerando apenas dias úteis por planta
    // (c) e (b): Garante que para equipamentos os logs pertençam à planta do equipamento e sem duplicidade por data
    const validActiveLogs = activeLogs.filter((l) => {
      if (isPlantDateNonWorking(l.plant_id, l.date)) return false
      if (typeLog === 'equipment') {
        const eq = equipment.find((e) => e.id === l.reference_id)
        if (eq && eq.plant_id !== l.plant_id) return false
      }
      return true
    })

    // Para equipamentos: soma ponderada pela quantidade contratada/ativa do equipamento
    // (ex: trator com quantidade=1 conta 1, se não tiver contrato individual eq.quantity é a base).
    const getEquipmentCapacity = (eqId: string, plantId: string, date: string) => {
      const eq = equipment.find((e) => e.id === eqId)
      const baseQty = eq?.quantity || 1
      const eqContracted = getApplicableContracted(
        plantId,
        'equipamento',
        date,
        (c) => c.equipment_id === eqId,
      )
      if (eqContracted.length > 0) {
        return eqContracted.reduce((s, c) => s + c.quantity, 0)
      }
      return baseQty
    }

    const totalPresentCount =
      typeLog === 'equipment'
        ? validActiveLogs
            .filter((l) => l.status)
            .reduce((sum, l) => sum + getEquipmentCapacity(l.reference_id, l.plant_id, l.date), 0)
        : validActiveLogs.filter((l) => l.status).length

    const totalLancadoCount =
      typeLog === 'equipment'
        ? validActiveLogs.reduce(
            (sum, l) => sum + getEquipmentCapacity(l.reference_id, l.plant_id, l.date),
            0,
          )
        : validActiveLogs.length

    let totalContractedSum = 0
    Array.from(allValidDatesSet).forEach((date) => {
      validPlants.forEach((pid) => {
        if (plantValidDatesMap[pid].has(date)) {
          const pCont = getApplicableContracted(pid, typeCont, date, (c) => {
            if (selectedCompanies.length > 0 && c.type === 'colaborador') {
              const validCompanyIds = new Set(
                employees
                  .filter((e) => companiesSet.has(e.company_name) && e.company_id)
                  .map((e) => e.company_id),
              )
              if (c.company_id && !validCompanyIds.has(c.company_id)) return false
            }
            return true
          }).reduce((sum, c) => sum + c.quantity, 0)
          totalContractedSum += pCont
        }
      })
    })

    let contratado = 0

    if (activeTab === 'equipamentos') {
      const monthsInPeriod = eachMonthOfInterval({
        start: parseISO(dateFrom),
        end: parseISO(dateTo),
      }).map((d) => format(d, 'yyyy-MM-01'))

      let totalEquipContractedForPeriod = 0

      monthsInPeriod.forEach((monthDate) => {
        validPlants.forEach((pid) => {
          const pCont = getApplicableContracted(pid, 'equipamento', monthDate).reduce(
            (sum, c) => sum + c.quantity,
            0,
          )
          totalEquipContractedForPeriod += pCont
        })
      })

      contratado =
        monthsInPeriod.length > 0 ? totalEquipContractedForPeriod / monthsInPeriod.length : 0
    } else {
      contratado = globalDays > 0 ? totalContractedSum / globalDays : 0
    }

    const avgPresente = globalDays > 0 ? totalPresentCount / globalDays : 0
    const avgLancado = globalDays > 0 ? totalLancadoCount / globalDays : 0

    const totalFallbackCount = validPlants.reduce(
      (sum, pid) => sum + (fallbackCountByPlant.get(pid) || 0),
      0,
    )
    const absenteismoDenominator = contratado > 0 ? contratado : totalFallbackCount

    const formatStr = (num: number) => (Number.isInteger(num) ? num.toString() : num.toFixed(1))

    const formatContratadoPrecision = (num: number) => {
      if (Number.isInteger(num)) return num.toString()
      const val = num.toFixed(2)
      return val.replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1')
    }

    // Identificação de "Hoje" no fuso horário seguro America/Cuiaba (para MT e operações da plataforma)
    const getTodayLocalDateStr = () => {
      try {
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Cuiaba',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(new Date())
        const y = parts.find((p) => p.type === 'year')?.value
        const m = parts.find((p) => p.type === 'month')?.value
        const d = parts.find((p) => p.type === 'day')?.value
        if (y && m && d) return `${y}-${m}-${d}`
      } catch {
        // Fallback para fuso local do navegador se Intl timeZone falhar
      }
      return format(new Date(), 'yyyy-MM-dd')
    }

    const todayDateStr = getTodayLocalDateStr()

    // Base ativa de colaboradores deduped por matrícula/nome para auditoria consistente:
    // A versão mais recente (reference_month DESC, created_at DESC) é a única considerada.
    // Se essa versão for Inativo, o colaborador NÃO é ativo e não é incluído.
    const validActiveEmployeesForAudit =
      typeCont === 'colaborador'
        ? (() => {
            const list: any[] = []
            empGroups.forEach((group) => {
              const best = group[0]
              if (best.status?.trim().toUpperCase() !== 'ATIVO') return
              if (selectedPlants.length > 0 && !validPlants.includes(best.plant_id)) return
              if (selectedCompanies.length > 0 && !companiesSet.has(best.company_name)) return
              list.push(best)
            })
            return list
          })()
        : []

    // Helper para verificar se um colaborador é considerado ativo vigente na planta.
    // Regra v0.0.1717 / v0.0.1718: Colaborador excluído/inativado na versão mais recente
    // da pessoa na planta NÃO aparece em ausentes, gráficos nem contagens de faltas do Dashboard.
    const isEmployeeCurrentActive = (empId: string, plantId?: string) => {
      // 1. Checagem direta pelo mapa de IDs conhecidos
      if (empIdIsCurrentActiveMap.has(empId)) {
        return empIdIsCurrentActiveMap.get(empId) === true
      }
      // 2. Fallback buscando nos employees por id e depois pela chave normalizada da pessoa na planta
      const emp = employees.find((e) => e.id === empId)
      if (!emp) return false
      const pid = plantId || emp.plant_id
      const dedupKey = getPersonDedupeKey({ ...emp, plant_id: pid })
      return personActiveInPlantMap.get(dedupKey) === true
    }

    const getEmployeeCurrentBest = (empId: string, plantId?: string) => {
      if (empIdCurrentBestMap.has(empId)) {
        return empIdCurrentBestMap.get(empId)
      }
      const emp = employees.find((e) => e.id === empId)
      if (!emp) return undefined
      const pid = plantId || emp.plant_id
      const dedupKey = getPersonDedupeKey({ ...emp, plant_id: pid })
      return personBestInPlantMap.get(dedupKey) || emp
    }

    // Otimização O(1): Indexação prévia de activeLogs por data e por (planta + data)
    // Permite lookup instantâneo sem filtrar 54.000 logs repetidamente para cada dia
    const logsByDateMap = new Map<string, any[]>()
    const logsByPlantAndDateMap = new Map<string, any[]>()
    activeLogs.forEach((l) => {
      const d = l.date
      const pd = `${l.plant_id}_${d}`
      let dateArr = logsByDateMap.get(d)
      if (!dateArr) {
        dateArr = []
        logsByDateMap.set(d, dateArr)
      }
      dateArr.push(l)

      let plantDateArr = logsByPlantAndDateMap.get(pd)
      if (!plantDateArr) {
        plantDateArr = []
        logsByPlantAndDateMap.set(pd, plantDateArr)
      }
      plantDateArr.push(l)
    })

    // Mapas O(1) para lookups de colaboradores e plantas
    const employeeByIdMap = new Map<string, any>()
    employees.forEach((e) => {
      if (e?.id) employeeByIdMap.set(e.id, e)
    })

    const plantByIdMap = new Map<string, any>()
    plants.forEach((p) => {
      if (p?.id) plantByIdMap.set(p.id, p)
    })

    const equipmentByIdMap = new Map<string, any>()
    equipment.forEach((eq) => {
      if (eq?.id) equipmentByIdMap.set(eq.id, eq)
    })

    // Cache memorizado por data para getStaffAbsentListForDate
    const staffAbsentCacheByDate = new Map<
      string,
      Array<{
        id: string
        date: string
        refName: string
        plantId: string
        plantName: string
        companyName?: string
        type: 'explicit' | 'implicit'
      }>
    >()

    // Helper para extrair a lista exata de ausentes (explícitos + sem presença) em uma data
    const getStaffAbsentListForDate = (date: string) => {
      const cached = staffAbsentCacheByDate.get(date)
      if (cached) return cached

      const dayLogs = logsByDateMap.get(date) || []
      const presentRefIds = new Set<string>()
      const explicitAbsentRefIds = new Set<string>()
      const registeredRefKeys = new Set<string>()

      dayLogs.forEach((l) => {
        if (l.status === true) {
          presentRefIds.add(l.reference_id)
        } else if (l.status === false) {
          explicitAbsentRefIds.add(l.reference_id)
        }
        const emp = employeeByIdMap.get(l.reference_id)
        if (emp) {
          registeredRefKeys.add(getPersonDedupeKey({ ...emp, plant_id: l.plant_id }))
        }
      })

      const result: Array<{
        id: string
        date: string
        refName: string
        plantId: string
        plantName: string
        companyName?: string
        type: 'explicit' | 'implicit'
      }> = []

      // 1. Ausentes explícitos com log:
      // Filtra qualquer colaborador cuja versão vigente mais recente na planta tenha status "Inativo"
      dayLogs.forEach((l) => {
        if (l.status !== false) return
        // Se o colaborador está inativo na versão vigente, NÃO entra nos ausentes
        if (!isEmployeeCurrentActive(l.reference_id, l.plant_id)) {
          return
        }
        const emp = getEmployeeCurrentBest(l.reference_id, l.plant_id)
        const plant = plantByIdMap.get(l.plant_id)
        result.push({
          id: `exp-${l.id || l.reference_id}-${date}`,
          date,
          refName: emp?.name || 'Desconhecido',
          plantId: l.plant_id,
          plantName: plant?.name || 'N/A',
          companyName: emp?.company_name,
          type: 'explicit',
        })
      })

      // 2. Colaboradores ativos sem presença e sem log explícito no dia
      validActiveEmployeesForAudit.forEach((emp) => {
        if (isPlantDateNonWorking(emp.plant_id, date)) return
        if (presentRefIds.has(emp.id) || explicitAbsentRefIds.has(emp.id)) return
        const empKey = getPersonDedupeKey(emp)
        if (registeredRefKeys.has(empKey)) return

        const plant = plantByIdMap.get(emp.plant_id)
        result.push({
          id: `imp-${emp.id}-${date}`,
          date,
          refName: emp.name,
          plantId: emp.plant_id,
          plantName: plant?.name || 'N/A',
          companyName: emp.company_name,
          type: 'implicit',
        })
      })

      staffAbsentCacheByDate.set(date, result)
      return result
    }

    // Novo cálculo de ausentes:
    // Para colaboradores: para cada data válida, somamos o total de pessoas ausentes reais
    // (explícitas com log status=false + ativas da planta sem presença lançada naquele dia).
    // Isso garante correspondência idêntica com o detalhamento de ausentes por data.
    let totalAbsentDailySum = 0
    Array.from(allValidDatesSet).forEach((date) => {
      if (activeTab === 'colaboradores' || activeTab === 'metas') {
        const absentsForDay = getStaffAbsentListForDate(date)
        // Considera apenas as plantas com logs/válidas nesta data
        const absentsInValidPlants = absentsForDay.filter((item) =>
          plantValidDatesMap[item.plantId]?.has(date),
        )
        totalAbsentDailySum += absentsInValidPlants.length
      } else {
        // Para equipamentos, indisponíveis calculados a partir dos logs de indisponibilidade vinculados à planta
        validPlants.forEach((pid) => {
          if (!plantValidDatesMap[pid]?.has(date)) return
          const dayLogs = logsByPlantAndDateMap.get(`${pid}_${date}`) || []
          const dExplicitAbs = dayLogs
            .filter((l) => {
              if (l.status) return false
              const eq = equipmentByIdMap.get(l.reference_id)
              if (eq && eq.plant_id !== pid) return false
              return true
            })
            .reduce((sum, l) => sum + getEquipmentCapacity(l.reference_id, pid, date), 0)
          totalAbsentDailySum += dExplicitAbs
        })
      }
    })

    const avgAusente = globalDays > 0 ? totalAbsentDailySum / globalDays : 0
    const absenteismo =
      absenteismoDenominator > 0
        ? Math.max(0, ((absenteismoDenominator - avgPresente) / absenteismoDenominator) * 100)
        : 0

    // Cálculo dos números específicos de "Hoje" para o card
    let todayPresentCount = 0
    let todayExplicitAbsentCount = 0
    let todayContractedSum = 0
    let todayFallbackSum = 0

    validPlants.forEach((pid) => {
      if (isPlantDateNonWorking(pid, todayDateStr)) return

      const pCont = getApplicableContracted(pid, typeCont, todayDateStr, (c) => {
        if (selectedCompanies.length > 0 && c.type === 'colaborador') {
          const validCompanyIds = new Set(
            employees
              .filter((e) => companiesSet.has(e.company_name) && e.company_id)
              .map((e) => e.company_id),
          )
          if (c.company_id && !validCompanyIds.has(c.company_id)) return false
        }
        return true
      }).reduce((sum, c) => sum + c.quantity, 0)

      todayContractedSum += pCont
      todayFallbackSum += fallbackCountByPlant.get(pid) || 0

      // Logs de hoje via logsByPlantAndDateMap O(1)
      const tLogs = logsByPlantAndDateMap.get(`${pid}_${todayDateStr}`) || []
      if (typeCont === 'equipamento') {
        todayPresentCount += tLogs
          .filter((l) => {
            if (!l.status) return false
            const eq = equipmentByIdMap.get(l.reference_id)
            return !eq || eq.plant_id === pid
          })
          .reduce((sum, l) => sum + getEquipmentCapacity(l.reference_id, pid, todayDateStr), 0)
        todayExplicitAbsentCount += tLogs
          .filter((l) => {
            if (l.status) return false
            const eq = equipmentByIdMap.get(l.reference_id)
            return !eq || eq.plant_id === pid
          })
          .reduce((sum, l) => sum + getEquipmentCapacity(l.reference_id, pid, todayDateStr), 0)
      } else {
        todayPresentCount += tLogs.filter((l) => l.status).length
        todayExplicitAbsentCount += tLogs.filter((l) => !l.status).length
      }
    })

    const todayBase = todayContractedSum > 0 ? todayContractedSum : todayFallbackSum
    const todayAbsentsList =
      activeTab === 'colaboradores' || activeTab === 'metas'
        ? getStaffAbsentListForDate(todayDateStr)
        : []
    const todayAusente =
      activeTab === 'colaboradores' || activeTab === 'metas'
        ? todayAbsentsList.length
        : todayExplicitAbsentCount

    // Indexação prévia de activeLogs por planta para plantStats
    const logsByPlantMap = new Map<string, any[]>()
    activeLogs.forEach((l) => {
      let arr = logsByPlantMap.get(l.plant_id)
      if (!arr) {
        arr = []
        logsByPlantMap.set(l.plant_id, arr)
      }
      arr.push(l)
    })

    const plantStats = plants
      .filter((p) => validPlants.includes(p.id))
      .map((plant) => {
        const pLogs = logsByPlantMap.get(plant.id) || []
        const pValidDates = plantValidDatesMap[plant.id]
        const pValidLogs = pLogs.filter((l) => pValidDates.has(l.date))

        const pDays = pValidDates.size
        const pPres =
          pDays > 0
            ? typeCont === 'equipamento'
              ? pValidLogs
                  .filter((l) => {
                    if (!l.status) return false
                    const eq = equipmentByIdMap.get(l.reference_id)
                    return !eq || eq.plant_id === plant.id
                  })
                  .reduce(
                    (sum, l) => sum + getEquipmentCapacity(l.reference_id, plant.id, l.date),
                    0,
                  ) / pDays
              : pValidLogs.filter((l) => l.status).length / pDays
            : 0

        let pCont = 0
        let hasContracted = false
        if (typeCont === 'equipamento') {
          const monthsInPeriod = eachMonthOfInterval({
            start: parseISO(dateFrom),
            end: parseISO(dateTo),
          }).map((d) => format(d, 'yyyy-MM-01'))

          let sumContratado = 0
          monthsInPeriod.forEach((monthDate) => {
            sumContratado += getApplicableContracted(plant.id, typeCont, monthDate).reduce(
              (sum, c) => sum + c.quantity,
              0,
            )
          })
          hasContracted = sumContratado > 0
          pCont = monthsInPeriod.length > 0 ? sumContratado / monthsInPeriod.length : 0
        } else {
          let sumContratado = 0
          pValidDates.forEach((date) => {
            sumContratado += getApplicableContracted(plant.id, typeCont, date, (c) => {
              if (selectedCompanies.length > 0 && c.type === 'colaborador') {
                const validCompanyIds = new Set(
                  employees
                    .filter((e) => companiesSet.has(e.company_name) && e.company_id)
                    .map((e) => e.company_id),
                )
                if (c.company_id && !validCompanyIds.has(c.company_id)) return false
              }
              return true
            }).reduce((sum, c) => sum + c.quantity, 0)
          })
          hasContracted = sumContratado > 0
          pCont = pDays > 0 ? sumContratado / pDays : 0
        }

        const plantDenominator = hasContracted ? pCont : fallbackCountByPlant.get(plant.id) || 0

        let pTotalAbsSum = 0
        const dailyTrend = Array.from(pValidDates)
          .filter((date) => !isPlantDateNonWorking(plant.id, date))
          .sort()
          .map((date) => {
            const dCont = getApplicableContracted(plant.id, typeCont, date, (c) => {
              if (selectedCompanies.length > 0 && c.type === 'colaborador') {
                const validCompanyIds = new Set(
                  employees
                    .filter((e) => companiesSet.has(e.company_name) && e.company_id)
                    .map((e) => e.company_id),
                )
                if (c.company_id && !validCompanyIds.has(c.company_id)) return false
              }
              return true
            }).reduce((sum, c) => sum + c.quantity, 0)
            const dDayLogs = logsByPlantAndDateMap.get(`${plant.id}_${date}`) || []
            const dPres =
              typeCont === 'equipamento'
                ? dDayLogs
                    .filter((l) => {
                      if (!l.status) return false
                      const eq = equipmentByIdMap.get(l.reference_id)
                      return !eq || eq.plant_id === plant.id
                    })
                    .reduce(
                      (sum, l) => sum + getEquipmentCapacity(l.reference_id, plant.id, date),
                      0,
                    )
                : dDayLogs.filter((l) => l.status).length
            const dExplicitAbs =
              typeCont === 'equipamento'
                ? dDayLogs
                    .filter((l) => {
                      if (l.status) return false
                      const eq = equipmentByIdMap.get(l.reference_id)
                      return !eq || eq.plant_id === plant.id
                    })
                    .reduce(
                      (sum, l) => sum + getEquipmentCapacity(l.reference_id, plant.id, date),
                      0,
                    )
                : dDayLogs.filter((l) => !l.status).length
            const dDenom = dCont > 0 ? dCont : fallbackCountByPlant.get(plant.id) || 0
            const abs = dDenom > 0 ? Math.max(0, ((dDenom - dPres) / dDenom) * 100) : 0

            const dPlantAbs =
              activeTab === 'colaboradores' || activeTab === 'metas'
                ? getStaffAbsentListForDate(date).filter((item) => item.plantId === plant.id).length
                : dExplicitAbs

            pTotalAbsSum += dPlantAbs

            return {
              date,
              absenteismo: Number(abs.toFixed(1)),
              presentes: dPres,
              ausentes: dPlantAbs,
              contratado: dDenom,
            }
          })

        const pAbs = pDays > 0 ? pTotalAbsSum / pDays : 0

        return {
          id: plant.id,
          name: plant.name,
          presentes: formatStr(pPres),
          ausentes: formatStr(pAbs),
          contratado: formatStr(pCont),
          absenteismo:
            pDays === 0
              ? 0
              : plantDenominator > 0
                ? Math.max(0, ((plantDenominator - pPres) / plantDenominator) * 100)
                : 0,
          dailyTrend,
        }
      })

    // Otimização: Indexar logs de colaboradores por (plant_id + date + reference_id) ou location_id
    // Para locationStats, pré-indexamos logs por plant_id para não varrer activeLogs inteiro em cada local
    const locationStats = locations
      .filter((loc) => validPlants.includes(loc.plant_id))
      .map((loc) => {
        const refIds =
          activeTab === 'colaboradores' || activeTab === 'metas'
            ? employees
                .filter(
                  (e) =>
                    e.location_id === loc.id &&
                    (selectedCompanies.length === 0 || companiesSet.has(e.company_name)),
                )
                .map((e) => e.id)
            : []
        const refIdsSet = new Set(refIds)
        const plantId = loc.plant_id
        const plantAllLogs = logsByPlantMap.get(plantId) || []
        const lLogsRaw = plantAllLogs.filter((l) => refIdsSet.has(l.reference_id))

        const pValidDates = plantValidDatesMap[plantId]

        const lLogs = lLogsRaw.filter((l) => pValidDates.has(l.date))
        const lDays = pValidDates.size

        const lPres = lDays > 0 ? lLogs.filter((l) => l.status).length / lDays : 0

        let lCont = 0
        let hasLocationContracted = false
        if (typeCont === 'equipamento') {
          const monthsInPeriod = eachMonthOfInterval({
            start: parseISO(dateFrom),
            end: parseISO(dateTo),
          }).map((d) => format(d, 'yyyy-MM-01'))

          let sumLocationContratado = 0
          monthsInPeriod.forEach((monthDate) => {
            sumLocationContratado += getApplicableContracted(
              plantId,
              typeCont,
              monthDate,
              (c) => c.location_id === loc.id,
            ).reduce((sum, c) => sum + c.quantity, 0)
          })
          hasLocationContracted = sumLocationContratado > 0
          lCont = monthsInPeriod.length > 0 ? sumLocationContratado / monthsInPeriod.length : 0
        } else {
          let sumLocationContratado = 0
          if (pValidDates) {
            pValidDates.forEach((date) => {
              sumLocationContratado += getApplicableContracted(
                plantId,
                typeCont,
                date,
                (c) => c.location_id === loc.id,
              ).reduce((sum, c) => sum + c.quantity, 0)
            })
          }
          hasLocationContracted = sumLocationContratado > 0
          lCont = lDays > 0 ? sumLocationContratado / lDays : 0
        }

        let lTotalAbsSum = 0
        const dailyTrend = Array.from(pValidDates || [])
          .filter((date) => !isPlantDateNonWorking(plantId, date))
          .sort()
          .map((date) => {
            const dCont = getApplicableContracted(
              plantId,
              typeCont,
              date,
              (c) => c.location_id === loc.id,
            ).reduce((sum, c) => sum + c.quantity, 0)
            const dDayLogs = lLogsRaw.filter((l) => l.date === date)
            const dPres =
              typeCont === 'equipamento'
                ? dDayLogs
                    .filter((l) => {
                      if (!l.status) return false
                      const eq = equipment.find((e) => e.id === l.reference_id)
                      return !eq || eq.plant_id === plantId
                    })
                    .reduce(
                      (sum, l) => sum + getEquipmentCapacity(l.reference_id, plantId, date),
                      0,
                    )
                : dDayLogs.filter((l) => l.status).length
            const dExplicitAbs =
              typeCont === 'equipamento'
                ? dDayLogs
                    .filter((l) => {
                      if (l.status) return false
                      const eq = equipment.find((e) => e.id === l.reference_id)
                      return !eq || eq.plant_id === plantId
                    })
                    .reduce(
                      (sum, l) => sum + getEquipmentCapacity(l.reference_id, plantId, date),
                      0,
                    )
                : dDayLogs.filter((l) => !l.status).length
            const abs = dCont > 0 ? Math.max(0, ((dCont - dPres) / dCont) * 100) : 0

            const locEmpSet = new Set(refIds)
            const dLocAbs =
              activeTab === 'colaboradores' || activeTab === 'metas'
                ? getStaffAbsentListForDate(date).filter(
                    (item) =>
                      item.plantId === plantId &&
                      locEmpSet.has(item.id.replace(/^(exp|imp)-/, '').split('-')[0]),
                  ).length
                : dExplicitAbs

            lTotalAbsSum += dLocAbs

            return {
              date,
              absenteismo: Number(abs.toFixed(1)),
              presentes: dPres,
              ausentes: dLocAbs,
              contratado: dCont,
            }
          })

        const lAbs = lDays > 0 ? lTotalAbsSum / lDays : 0

        return {
          id: loc.id,
          name: loc.name,
          plant_id: loc.plant_id,
          plantName: plants.find((p) => p.id === loc.plant_id)?.name,
          presentes: formatStr(lPres),
          ausentes: formatStr(lAbs),
          contratado: formatStr(lCont),
          absenteismo:
            lDays === 0
              ? 0
              : Math.max(
                  0,
                  hasLocationContracted && lCont > 0 ? ((lCont - lPres) / lCont) * 100 : 0,
                ),
          dailyTrend,
        }
      })
      .filter((l) => {
        const isNonWorking = nonWorkingDays.some(
          (n: any) =>
            n.plant_id === l.plant_id &&
            n.date.split('T')[0] >= dateFrom &&
            n.date.split('T')[0] <= dateTo,
        )
        return parseFloat(l.contratado) > 0 || parseFloat(l.presentes) > 0 || isNonWorking
      })

    const equipmentStats =
      activeTab !== 'equipamentos'
        ? []
        : equipment
            .filter((e) => validPlants.includes(e.plant_id))
            .map((eq) => {
              const plantId = eq.plant_id
              const pValidDates = plantValidDatesMap[plantId]

              const monthsInPeriod = eachMonthOfInterval({
                start: parseISO(dateFrom),
                end: parseISO(dateTo),
              }).map((d) => format(d, 'yyyy-MM-01'))

              let sumEqContratado = 0
              monthsInPeriod.forEach((monthDate) => {
                const eqRecords = getApplicableContracted(
                  plantId,
                  'equipamento',
                  monthDate,
                  (c) => c.equipment_id === eq.id,
                )
                sumEqContratado +=
                  eqRecords.length > 0
                    ? eqRecords.reduce((sum, c) => sum + c.quantity, 0)
                    : eq.quantity
              })

              const eqCont =
                monthsInPeriod.length > 0
                  ? Math.round(sumEqContratado / monthsInPeriod.length)
                  : eq.quantity

              // (c) Vincula o registro ao equipamento correto: exige também a planta do equipamento
              const eqLogsRaw = processedLogs.filter(
                (l) =>
                  l.type === 'equipment' &&
                  l.reference_id === eq.id &&
                  l.plant_id === plantId &&
                  pValidDates.has(l.date),
              )
              // (b) Deduplica registros do mesmo equipamento na mesma data (mantém o mais recente)
              const eqLogsMap = new Map<string, any>()
              ;[...eqLogsRaw]
                .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
                .forEach((l) => {
                  const d =
                    typeof l.date === 'string' && l.date.includes('T')
                      ? l.date.slice(0, 10)
                      : l.date
                  if (!eqLogsMap.has(d)) eqLogsMap.set(d, { ...l, date: d })
                })
              const eqLogs = Array.from(eqLogsMap.values()).sort((a, b) =>
                a.date.localeCompare(b.date),
              )

              const loggedDays = eqLogsMap.size
              const pres = eqLogs.filter((l) => l.status).length
              const abs = eqLogs.filter((l) => !l.status).length
              // (a) Dias sem nenhum lançamento não contam como ausência: a média considera
              // apenas os dias efetivamente lançados para o equipamento.
              const mPres = loggedDays > 0 ? (pres / loggedDays) * eqCont : 0
              return {
                id: eq.id,
                name: eq.name,
                contratado: eqCont,
                mediaPresenca: mPres,
                mediaFalta: loggedDays > 0 ? (abs / loggedDays) * eqCont : 0,
                taxaDisp: eqCont > 0 ? (mPres / eqCont) * 100 : 0,
                history: eqLogs.map((log) => ({ date: log.date, status: log.status })),
              }
            })
            .filter((eq) => eq.history.length > 0 || eq.contratado > 0)

    // Otimização: Indexar activeLogs por reference_id para lookup O(1) em collaboratorStats
    const logsByRefIdMap = new Map<string, any[]>()
    activeLogs.forEach((l) => {
      let arr = logsByRefIdMap.get(l.reference_id)
      if (!arr) {
        arr = []
        logsByRefIdMap.set(l.reference_id, arr)
      }
      arr.push(l)
    })

    const collaboratorStats =
      activeTab !== 'colaboradores'
        ? []
        : (() => {
            const empMap = new Map<string, any>()
            employees
              .filter((e) => selectedCompanies.length === 0 || companiesSet.has(e.company_name))
              .forEach((emp) => {
                // Se a versão vigente do colaborador na planta for Inativo, ele não aparece na tabela
                if (!isEmployeeCurrentActive(emp.id, emp.plant_id)) return

                const rawEmpLogs = logsByRefIdMap.get(emp.id) || []
                const empLogs = rawEmpLogs
                  .filter((l) => plantValidDatesMap[l.plant_id]?.has(l.date))
                  .sort((a, b) => a.date.localeCompare(b.date))
                if (empLogs.length === 0) return

                const gKey = getPersonDedupeKey(emp)
                const currentBest = getEmployeeCurrentBest(emp.id, emp.plant_id) || emp

                if (!empMap.has(gKey)) {
                  empMap.set(gKey, {
                    id: currentBest.id || emp.id,
                    name: currentBest.name || emp.name,
                    function_id: currentBest.function_id || emp.function_id,
                    location:
                      locations.find((l) => l.id === (currentBest.location_id || emp.location_id))
                        ?.name || 'N/A',
                    presencas: empLogs.filter((l) => l.status).length,
                    faltas: empLogs.filter((l) => !l.status).length,
                    history: empLogs.map((log) => ({ date: log.date, status: log.status })),
                  })
                } else {
                  const ex = empMap.get(gKey)
                  ex.presencas += empLogs.filter((l) => l.status).length
                  ex.faltas += empLogs.filter((l) => !l.status).length
                  ex.history = [
                    ...ex.history,
                    ...empLogs.map((log) => ({ date: log.date, status: log.status })),
                  ].sort((a: any, b: any) => a.date.localeCompare(b.date))
                }
              })
            return Array.from(empMap.values())
          })()

    const dailyTrend = Array.from(allValidDatesSet)
      .filter((date) => {
        // Se a data for não útil para todas as plantas válidas, pular essa data
        const allPlantsNonWorking = validPlants.every((pid) => isPlantDateNonWorking(pid, date))
        return !allPlantsNonWorking
      })
      .sort()
      .map((date) => {
        let dContracted = 0
        let dPresentes = 0
        let dAusentes = 0
        let dFallback = 0

        validPlants.forEach((pid) => {
          if (isPlantDateNonWorking(pid, date)) return

          const pCont = getApplicableContracted(pid, typeCont, date, (c) => {
            if (selectedCompanies.length > 0 && c.type === 'colaborador') {
              const validCompanyIds = new Set(
                employees
                  .filter((e) => companiesSet.has(e.company_name) && e.company_id)
                  .map((e) => e.company_id),
              )
              if (c.company_id && !validCompanyIds.has(c.company_id)) return false
            }
            return true
          }).reduce((sum, c) => sum + c.quantity, 0)

          dContracted += pCont
          dFallback += fallbackCountByPlant.get(pid) || 0

          if (plantValidDatesMap[pid].has(date)) {
            const dayLogs = logsByPlantAndDateMap.get(`${pid}_${date}`) || []
            if (typeCont === 'equipamento') {
              dPresentes += dayLogs
                .filter((l) => {
                  if (!l.status) return false
                  const eq = equipmentByIdMap.get(l.reference_id)
                  return !eq || eq.plant_id === pid
                })
                .reduce((sum, l) => sum + getEquipmentCapacity(l.reference_id, pid, date), 0)
              dAusentes += dayLogs
                .filter((l) => {
                  if (l.status) return false
                  const eq = equipmentByIdMap.get(l.reference_id)
                  return !eq || eq.plant_id === pid
                })
                .reduce((sum, l) => sum + getEquipmentCapacity(l.reference_id, pid, date), 0)
            } else {
              dPresentes += dayLogs.filter((l) => l.status).length
              dAusentes += dayLogs.filter((l) => !l.status).length
            }
          }
        })

        const dDenominator = dContracted > 0 ? dContracted : dFallback
        const abs =
          dDenominator > 0 ? Math.max(0, ((dDenominator - dPresentes) / dDenominator) * 100) : 0

        const dAbsentees =
          activeTab === 'colaboradores' || activeTab === 'metas'
            ? getStaffAbsentListForDate(date).filter((item) =>
                plantValidDatesMap[item.plantId]?.has(date),
              ).length
            : dAusentes

        return {
          date,
          absenteismo: Number(abs.toFixed(1)),
          presentes: dPresentes,
          ausentes: dAbsentees,
          contratado: dDenominator,
        }
      })

    // Independent equipment calculation for goals (com lookup O(1) via logsByPlantAndDateMap)
    let totalEquipContractedSum = 0
    let totalEquipPresentCount = 0

    Array.from(allValidDatesSet).forEach((date) => {
      validPlants.forEach((pid) => {
        if (plantValidDatesMap[pid]?.has(date)) {
          const eCont = getApplicableContracted(pid, 'equipamento', date).reduce(
            (sum, c) => sum + c.quantity,
            0,
          )
          totalEquipContractedSum += eCont

          const dayPlantLogs = logsByPlantAndDateMap.get(`${pid}_${date}`) || []
          const ePres = dayPlantLogs.filter((l) => {
            if (l.type !== 'equipment' || !l.status) return false
            const eq = equipmentByIdMap.get(l.reference_id)
            if (eq && eq.plant_id !== pid) return false
            return true
          }).length
          totalEquipPresentCount += ePres
        }
      })
    })

    const equipIndisp =
      totalEquipContractedSum > 0
        ? Math.max(
            0,
            ((totalEquipContractedSum - totalEquipPresentCount) / totalEquipContractedSum) * 100,
          )
        : 0

    const equipDisp = Math.max(0, 100 - equipIndisp)
    const absAchieved = absenteismo <= absenteeismTarget ? 100 : 0
    let sum = absAchieved + equipDisp
    let count = 2

    const today = format(new Date(), 'yyyy-MM-dd')
    const validSchedules = schedules.filter(
      (s) => validPlants.includes(s.plant_id) && s.activity_date <= today,
    )

    let cleaningTotal = 0
    let cleaningRealizado = 0
    let gardeningTotal = 0
    let gardeningRealizado = 0

    validSchedules.forEach((s) => {
      const area = areas.find((a) => a.id === s.area_id)
      if (area) {
        if (area.type === 'cleaning') {
          cleaningTotal++
          if (s.status === 'Realizado') cleaningRealizado++
        } else if (area.type === 'gardening') {
          gardeningTotal++
          if (s.status === 'Realizado') gardeningRealizado++
        }
      }
    })

    const cleaningAdherence = cleaningTotal > 0 ? (cleaningRealizado / cleaningTotal) * 100 : null
    const gardeningAdherence =
      gardeningTotal > 0 ? (gardeningRealizado / gardeningTotal) * 100 : null

    if (cleaningAdherence !== null) {
      sum += cleaningAdherence
      count++
    }
    if (gardeningAdherence !== null) {
      sum += gardeningAdherence
      count++
    }

    const manualGoals = goals
      .filter((g) => g.is_active)
      .map((g) => {
        const gData = monthlyGoals.filter(
          (m) => m.goal_id === g.id && validPlants.includes(m.plant_id),
        )
        const avg =
          gData.length > 0 ? gData.reduce((a, b) => a + Number(b.value), 0) / gData.length : null
        if (avg !== null) {
          sum += avg
          count++
        }
        return { ...g, avg }
      })

    // Monta a lista consolidada de ausentes em todas as datas válidas com logs para auditoria
    const periodAbsentsList =
      activeTab === 'colaboradores' || activeTab === 'metas'
        ? Array.from(allValidDatesSet)
            .sort((a, b) => b.localeCompare(a))
            .flatMap((d) =>
              getStaffAbsentListForDate(d).filter((item) =>
                plantValidDatesMap[item.plantId]?.has(d),
              ),
            )
        : []

    return {
      metrics: {
        lancado: formatStr(avgLancado),
        presente: formatStr(avgPresente),
        ausente: formatStr(avgAusente),
        todayDateStr,
        todayAusente: formatStr(todayAusente),
        todayPresente: formatStr(todayPresentCount),
        todayContratado: formatStr(todayBase),
        todayAbsentsList,
        periodAbsentsList,
        contratado:
          activeTab === 'equipamentos'
            ? formatContratadoPrecision(contratado)
            : formatStr(contratado),
        absenteismo,
        excludedDaysCount,
        validDatesCount: globalDays,
        locationStats,
        collaboratorStats,
      },
      plantStats,
      locationStats,
      equipmentStats,
      collaboratorStats,
      dailyTrend,
      goalsData: {
        absAchieved,
        equipDisp,
        cleaningAdherence,
        gardeningAdherence,
        manualGoals,
        notaGeral: count > 0 ? (sum / count).toFixed(1) : '0.0',
        absenteeismTarget,
      },
      activeLogs: validActiveLogs,
    }
  }, [
    logs,
    monthlyGoals,
    contracted,
    selectedPlants,
    selectedCompanies,
    plants,
    activeTab,
    dateFrom,
    dateTo,
    employees,
    locations,
    equipment,
    goals,
    absenteeismTarget,
    schedules,
    areas,
    nonWorkingDays,
  ])
}
