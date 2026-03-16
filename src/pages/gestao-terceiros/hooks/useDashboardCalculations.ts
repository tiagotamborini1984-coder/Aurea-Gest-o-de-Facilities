import { useMemo } from 'react'

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
  activeTab: 'colaboradores' | 'equipamentos' | 'metas',
  dateFrom: string,
  dateTo: string,
) {
  return useMemo(() => {
    const validPlants = selectedPlants
    const filteredLogs = logs.filter(
      (l) => validPlants.includes(l.plant_id) && l.date >= dateFrom && l.date <= dateTo,
    )
    const typeLog = activeTab === 'colaboradores' ? 'staff' : 'equipment'
    const typeCont = activeTab === 'colaboradores' ? 'colaborador' : 'equipamento'
    const activeLogs = filteredLogs.filter((l) => l.type === typeLog)

    const uniqueDates = new Set(activeLogs.map((l) => l.date))
    const totalPeriodDays = Math.max(1, uniqueDates.size)

    const avgLancado = activeLogs.length / totalPeriodDays
    const avgPresente = activeLogs.filter((l) => l.status).length / totalPeriodDays
    const avgAusente = activeLogs.filter((l) => !l.status).length / totalPeriodDays
    const contratado = contracted
      .filter((c) => c.type === typeCont && validPlants.includes(c.plant_id))
      .reduce((a, b) => a + b.quantity, 0)
    const absenteismo =
      contratado > 0 ? Math.max(0, ((contratado - avgPresente) / contratado) * 100) : 0

    const formatStr = (num: number) => (Number.isInteger(num) ? num.toString() : num.toFixed(1))

    const plantStats = plants
      .filter((p) => validPlants.includes(p.id))
      .map((plant) => {
        const pLogs = activeLogs.filter((l) => l.plant_id === plant.id)
        const pDays = Math.max(1, new Set(pLogs.map((l) => l.date)).size)
        const pPres = pLogs.filter((l) => l.status).length / pDays
        const pAbs = pLogs.filter((l) => !l.status).length / pDays
        const pCont = contracted
          .filter((c) => c.plant_id === plant.id && c.type === typeCont)
          .reduce((sum, c) => sum + c.quantity, 0)
        return {
          id: plant.id,
          name: plant.name,
          presentes: formatStr(pPres),
          ausentes: formatStr(pAbs),
          contratado: pCont,
          absenteismo: Math.max(0, pCont > 0 ? ((pCont - pPres) / pCont) * 100 : 0),
        }
      })

    const locationStats = locations
      .filter((loc) => validPlants.includes(loc.plant_id))
      .map((loc) => {
        const refIds =
          activeTab === 'colaboradores'
            ? employees.filter((e) => e.location_id === loc.id).map((e) => e.id)
            : []
        const lLogs = activeLogs.filter((l) => refIds.includes(l.reference_id))
        const lDays = Math.max(1, new Set(lLogs.map((l) => l.date)).size)
        const lPres = lLogs.filter((l) => l.status).length / lDays
        const lAbs = lLogs.filter((l) => !l.status).length / lDays
        const lCont = contracted
          .filter((c) => c.location_id === loc.id && c.type === typeCont)
          .reduce((sum, c) => sum + c.quantity, 0)
        return {
          id: loc.id,
          name: loc.name,
          plantName: plants.find((p) => p.id === loc.plant_id)?.name,
          presentes: formatStr(lPres),
          ausentes: formatStr(lAbs),
          contratado: lCont,
          absenteismo: Math.max(0, lCont > 0 ? ((lCont - lPres) / lCont) * 100 : 0),
        }
      })
      .filter((l) => l.contratado > 0 || parseFloat(l.presentes) > 0)

    const equipmentStats =
      activeTab !== 'equipamentos'
        ? []
        : equipment
            .filter((e) => validPlants.includes(e.plant_id))
            .map((eq) => {
              const eqCont =
                contracted
                  .filter((c) => c.equipment_id === eq.id && c.type === 'equipamento')
                  .reduce((sum, c) => sum + c.quantity, 0) || eq.quantity
              const eqLogs = logs
                .filter((l) => l.type === 'equipment' && l.reference_id === eq.id)
                .sort((a, b) => a.date.localeCompare(b.date))
              const eqDays = Math.max(1, new Set(eqLogs.map((l) => l.date)).size)
              const pres = eqLogs.filter((l) => l.status).length
              const abs = eqLogs.filter((l) => !l.status).length
              const mPres = (pres / eqDays) * eqCont
              return {
                id: eq.id,
                name: eq.name,
                contratado: eqCont,
                mediaPresenca: mPres,
                mediaFalta: (abs / eqDays) * eqCont,
                taxaDisp: eqCont > 0 ? (mPres / eqCont) * 100 : 0,
                history: eqLogs.map((log) => ({ date: log.date, status: log.status })),
              }
            })
            .filter((eq) => eq.history.length > 0 || eq.contratado > 0)

    const collaboratorStats =
      activeTab !== 'colaboradores'
        ? []
        : employees
            .filter((e) => validPlants.includes(e.plant_id))
            .map((emp) => {
              const empLogs = logs
                .filter((l) => l.type === 'staff' && l.reference_id === emp.id)
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

    const equipDisp = Math.max(0, 100 - absenteismo)
    const vPlants = selectedPlants.length > 0 ? selectedPlants : plants.map((p) => p.id)
    let sum = (absenteismo < 4 ? 100 : 0) + equipDisp
    let count = 2
    const manualGoals = goals
      .filter((g) => g.is_active)
      .map((g) => {
        const gData = monthlyGoals.filter((m) => m.goal_id === g.id && vPlants.includes(m.plant_id))
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
      },
      plantStats,
      locationStats,
      equipmentStats,
      collaboratorStats,
      goalsData: {
        absAchieved: absenteismo < 4 ? 100 : 0,
        equipDisp,
        manualGoals,
        notaGeral: count > 0 ? (sum / count).toFixed(1) : '0.0',
      },
    }
  }, [
    logs,
    monthlyGoals,
    contracted,
    selectedPlants,
    plants,
    activeTab,
    dateFrom,
    dateTo,
    employees,
    locations,
    equipment,
    goals,
  ])
}
