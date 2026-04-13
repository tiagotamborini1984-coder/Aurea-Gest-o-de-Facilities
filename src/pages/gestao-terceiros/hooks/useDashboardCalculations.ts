import { useMemo, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { isWeekend, parseISO, eachDayOfInterval, format } from 'date-fns'

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
) {
  const [nonWorkingDays, setNonWorkingDays] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchNWD = async () => {
      const { data } = await supabase
        .from('plant_non_working_days')
        .select('plant_id, date')
        .gte('date', dateFrom)
        .lte('date', dateTo)

      if (data) {
        const map: Record<string, boolean> = {}
        data.forEach((d) => {
          map[`${d.plant_id}_${d.date}`] = true
        })
        setNonWorkingDays(map)
      }
    }
    fetchNWD()
  }, [dateFrom, dateTo])

  return useMemo(() => {
    const validPlants = selectedPlants.length > 0 ? selectedPlants : plants.map((p) => p.id)
    const companiesSet = new Set(selectedCompanies)

    const validEmpIds =
      selectedCompanies.length > 0
        ? new Set(employees.filter((e) => companiesSet.has(e.company_name)).map((e) => e.id))
        : new Set(employees.map((e) => e.id))

    const filteredLogs = logs.filter(
      (l) => validPlants.includes(l.plant_id) && l.date >= dateFrom && l.date <= dateTo,
    )

    const typeLog = activeTab === 'colaboradores' || activeTab === 'metas' ? 'staff' : 'equipment'
    const typeCont =
      activeTab === 'colaboradores' || activeTab === 'metas' ? 'colaborador' : 'equipamento'

    const activeLogs = filteredLogs.filter((l) => {
      if (l.type !== typeLog) return false
      if (typeLog === 'staff') return validEmpIds.has(l.reference_id)
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

    const validContracted = contracted.filter((c) => {
      if (!validPlants.includes(c.plant_id)) return false
      if (c.type !== typeCont) return false

      if (selectedCompanies.length > 0 && c.type === 'colaborador') {
        const validCompanyIds = new Set(
          employees
            .filter((e) => companiesSet.has(e.company_name) && e.company_id)
            .map((e) => e.company_id),
        )
        if (c.company_id) {
          return validCompanyIds.has(c.company_id)
        }
      }
      return true
    })

    // Compute averages per plant
    let totalAvgContracted = 0
    let totalAvgPresent = 0
    let totalAvgAbsent = 0
    let totalAvgLancado = 0

    validPlants.forEach((pid) => {
      const pValidDates = plantValidDatesMap[pid]
      const pDays = pValidDates.size

      const pContracted = validContracted
        .filter((c) => c.plant_id === pid)
        .reduce((sum, c) => sum + c.quantity, 0)

      const pLogs = activeLogs.filter((l) => l.plant_id === pid && pValidDates.has(l.date))

      if (pDays > 0) {
        totalAvgContracted += pContracted
        const pPresent = pLogs.filter((l) => l.status).length
        const pAbsent = pLogs.filter((l) => !l.status).length

        totalAvgPresent += pPresent / pDays
        totalAvgAbsent += pAbsent / pDays
        totalAvgLancado += pLogs.length / pDays
      }
    })

    const contratado = totalAvgContracted
    const avgPresente = totalAvgPresent
    const avgAusente = totalAvgAbsent
    const avgLancado = totalAvgLancado

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
        const pCont = validContracted
          .filter((c) => c.plant_id === plant.id)
          .reduce((sum, c) => sum + c.quantity, 0)
        return {
          id: plant.id,
          name: plant.name,
          presentes: formatStr(pPres),
          ausentes: formatStr(pAbs),
          contratado: pCont,
          absenteismo:
            pDays === 0 ? 0 : Math.max(0, pCont > 0 ? ((pCont - pPres) / pCont) * 100 : 0),
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
        const lCont = validContracted
          .filter((c) => c.location_id === loc.id)
          .reduce((sum, c) => sum + c.quantity, 0)
        return {
          id: loc.id,
          name: loc.name,
          plantName: plants.find((p) => p.id === loc.plant_id)?.name,
          presentes: formatStr(lPres),
          ausentes: formatStr(lAbs),
          contratado: lCont,
          absenteismo:
            lDays === 0 ? 0 : Math.max(0, lCont > 0 ? ((lCont - lPres) / lCont) * 100 : 0),
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

              const eqCont =
                validContracted
                  .filter((c) => c.equipment_id === eq.id)
                  .reduce((sum, c) => sum + c.quantity, 0) || eq.quantity

              const eqLogs = logs
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
            const pCont = validContracted
              .filter((c) => c.plant_id === pid)
              .reduce((sum, c) => sum + c.quantity, 0)
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

    const equipDisp = Math.max(0, 100 - absenteismo)
    const absAchieved = absenteismo <= absenteeismTarget ? 100 : 0
    let sum = absAchieved + equipDisp
    let count = 2
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
        contratado,
        absenteismo,
        excludedDaysCount,
      },
      plantStats,
      locationStats,
      equipmentStats,
      collaboratorStats,
      dailyTrend,
      goalsData: {
        absAchieved,
        equipDisp,
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
    nonWorkingDays,
    absenteeismTarget,
  ])
}
