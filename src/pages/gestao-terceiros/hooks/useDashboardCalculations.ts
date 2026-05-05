import { useMemo } from 'react'
import { parseISO, eachDayOfInterval, format } from 'date-fns'

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
) {
  return useMemo(() => {
    // Normaliza datas para garantir que logs com timestamp sejam considerados corretamente
    const normalizeDate = (d: string) => d.split('T')[0]

    const validPlants = selectedPlants.length > 0 ? selectedPlants : plants.map((p) => p.id)
    const companiesSet = new Set(selectedCompanies)

    const validEmpIds =
      selectedCompanies.length > 0
        ? new Set(employees.filter((e) => companiesSet.has(e.company_name)).map((e) => e.id))
        : new Set(employees.map((e) => e.id))

    const processedLogs = logs.map((l) => ({ ...l, date: normalizeDate(l.date) }))

    const filteredLogs = processedLogs.filter(
      (l) => validPlants.includes(l.plant_id) && l.date >= dateFrom && l.date <= dateTo,
    )

    const typeLog = activeTab === 'colaboradores' || activeTab === 'metas' ? 'staff' : 'equipment'
    const typeCont =
      activeTab === 'colaboradores' || activeTab === 'metas' ? 'colaborador' : 'equipamento'

    const activeLogs = filteredLogs.filter((l) => {
      if (l.type !== typeLog) return false
      if (typeLog === 'staff') {
        if (selectedCompanies.length > 0) {
          return validEmpIds.has(l.reference_id)
        }
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

    // Conta total bruto de logs ativos (sem perder registros em loops de intersecção)
    const totalPresentCount = activeLogs.filter((l) => l.status).length
    const totalAbsentCount = activeLogs.filter((l) => !l.status).length
    const totalLancadoCount = activeLogs.length

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

    const contratado = globalDays > 0 ? totalContractedSum / globalDays : 0
    const avgPresente = globalDays > 0 ? totalPresentCount / globalDays : 0
    const avgAusente = globalDays > 0 ? totalAbsentCount / globalDays : 0
    const avgLancado = globalDays > 0 ? totalLancadoCount / globalDays : 0

    const absenteismo =
      contratado > 0 ? Math.max(0, ((contratado - avgPresente) / contratado) * 100) : 0

    const formatStr = (num: number) => (Number.isInteger(num) ? num.toString() : num.toFixed(1))

    const plantStats = plants
      .filter((p) => validPlants.includes(p.id))
      .map((plant) => {
        const pLogs = activeLogs.filter((l) => l.plant_id === plant.id)
        const pValidDates = plantValidDatesMap[plant.id]
        const pValidLogs = pLogs.filter((l) => pValidDates.has(l.date))

        const pDays = pValidDates.size
        const pPres = pDays > 0 ? pValidLogs.filter((l) => l.status).length / pDays : 0
        const pAbs = pDays > 0 ? pValidLogs.filter((l) => !l.status).length / pDays : 0

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
        const pCont = pDays > 0 ? Math.round(sumContratado / pDays) : 0

        const dailyTrend = Array.from(pValidDates)
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
            const dPres = pLogs.filter((l) => l.date === date && l.status).length
            const abs = dCont > 0 ? Math.max(0, ((dCont - dPres) / dCont) * 100) : 0
            return {
              date,
              absenteismo: Number(abs.toFixed(1)),
              presentes: dPres,
              contratado: dCont,
            }
          })

        return {
          id: plant.id,
          name: plant.name,
          presentes: formatStr(pPres),
          ausentes: formatStr(pAbs),
          contratado: pCont,
          absenteismo:
            pDays === 0 ? 0 : Math.max(0, pCont > 0 ? ((pCont - pPres) / pCont) * 100 : 0),
          dailyTrend,
        }
      })

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
        const plantId = loc.plant_id
        const lLogsRaw = activeLogs.filter(
          (l) => l.plant_id === plantId && refIds.includes(l.reference_id),
        )

        const pValidDates = plantValidDatesMap[plantId]

        const lLogs = lLogsRaw.filter((l) => pValidDates.has(l.date))
        const lDays = pValidDates.size

        const lPres = lDays > 0 ? lLogs.filter((l) => l.status).length / lDays : 0
        const lAbs = lDays > 0 ? lLogs.filter((l) => !l.status).length / lDays : 0

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
        const lCont = lDays > 0 ? Math.round(sumLocationContratado / lDays) : 0

        const dailyTrend = Array.from(pValidDates || [])
          .sort()
          .map((date) => {
            const dCont = getApplicableContracted(
              plantId,
              typeCont,
              date,
              (c) => c.location_id === loc.id,
            ).reduce((sum, c) => sum + c.quantity, 0)
            const dPres = lLogsRaw.filter((l) => l.date === date && l.status).length
            const abs = dCont > 0 ? Math.max(0, ((dCont - dPres) / dCont) * 100) : 0
            return {
              date,
              absenteismo: Number(abs.toFixed(1)),
              presentes: dPres,
              contratado: dCont,
            }
          })

        return {
          id: loc.id,
          name: loc.name,
          plantName: plants.find((p) => p.id === loc.plant_id)?.name,
          presentes: formatStr(lPres),
          ausentes: formatStr(lAbs),
          contratado: lCont,
          absenteismo:
            lDays === 0 ? 0 : Math.max(0, lCont > 0 ? ((lCont - lPres) / lCont) * 100 : 0),
          dailyTrend,
        }
      })
      .filter((l) => l.contratado > 0 || parseFloat(l.presentes) > 0)

    const equipmentStats =
      activeTab !== 'equipamentos'
        ? []
        : equipment
            .filter((e) => validPlants.includes(e.plant_id))
            .map((eq) => {
              const plantId = eq.plant_id
              const pValidDates = plantValidDatesMap[plantId]

              let sumEqContratado = 0
              if (pValidDates) {
                pValidDates.forEach((date) => {
                  const eqRecords = getApplicableContracted(
                    plantId,
                    'equipamento',
                    date,
                    (c) => c.equipment_id === eq.id,
                  )
                  sumEqContratado +=
                    eqRecords.length > 0
                      ? eqRecords.reduce((sum, c) => sum + c.quantity, 0)
                      : eq.quantity
                })
              }
              const eqCont =
                pValidDates && pValidDates.size > 0
                  ? Math.round(sumEqContratado / pValidDates.size)
                  : eq.quantity

              const eqLogs = processedLogs
                .filter(
                  (l) =>
                    l.type === 'equipment' && l.reference_id === eq.id && pValidDates.has(l.date),
                )
                .sort((a, b) => a.date.localeCompare(b.date))

              const eqDays = pValidDates.size
              const pres = eqLogs.filter((l) => l.status).length
              const abs = eqLogs.filter((l) => !l.status).length
              const mPres = eqDays > 0 ? (pres / eqDays) * eqCont : 0
              return {
                id: eq.id,
                name: eq.name,
                contratado: eqCont,
                mediaPresenca: mPres,
                mediaFalta: eqDays > 0 ? (abs / eqDays) * eqCont : 0,
                taxaDisp: eqDays === 0 ? 0 : eqCont > 0 ? (mPres / eqCont) * 100 : 0,
                history: eqLogs.map((log) => ({ date: log.date, status: log.status })),
              }
            })
            .filter((eq) => eq.history.length > 0 || eq.contratado > 0)

    const collaboratorStats =
      activeTab !== 'colaboradores'
        ? []
        : employees
            .filter((e) => selectedCompanies.length === 0 || companiesSet.has(e.company_name))
            .map((emp) => {
              const empLogs = activeLogs
                .filter(
                  (l) => l.reference_id === emp.id && plantValidDatesMap[l.plant_id]?.has(l.date),
                )
                .sort((a, b) => a.date.localeCompare(b.date))
              return {
                id: emp.id,
                name: emp.name,
                function_id: emp.function_id,
                location: locations.find((l) => l.id === emp.location_id)?.name || 'N/A',
                presencas: empLogs.filter((l) => l.status).length,
                faltas: empLogs.filter((l) => !l.status).length,
                history: empLogs.map((log) => ({ date: log.date, status: log.status })),
              }
            })
            .filter((c) => c.history.length > 0)

    const dailyTrend = Array.from(allValidDatesSet)
      .sort()
      .map((date) => {
        let dContracted = 0
        let dPresentes = 0

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

            dContracted += pCont

            const pPres = activeLogs.filter(
              (l) => l.plant_id === pid && l.date === date && l.status,
            ).length
            dPresentes += pPres
          }
        })

        const abs =
          dContracted > 0 ? Math.max(0, ((dContracted - dPresentes) / dContracted) * 100) : 0

        return {
          date,
          absenteismo: Number(abs.toFixed(1)),
          presentes: dPresentes,
          contratado: dContracted,
        }
      })

    // Independent equipment calculation for goals
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

          const ePres = processedLogs.filter(
            (l) => l.type === 'equipment' && l.plant_id === pid && l.date === date && l.status,
          ).length
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

    return {
      metrics: {
        lancado: formatStr(avgLancado),
        presente: formatStr(avgPresente),
        ausente: formatStr(avgAusente),
        contratado: formatStr(contratado),
        absenteismo,
        excludedDaysCount,
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
  ])
}
