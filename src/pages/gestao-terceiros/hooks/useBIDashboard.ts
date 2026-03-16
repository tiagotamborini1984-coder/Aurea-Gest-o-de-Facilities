import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { format, subDays } from 'date-fns'

export function useBIDashboard(
  plants: any[],
  contracted: any[],
  employees: any[],
  equipment: any[],
) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null)

  useEffect(() => {
    const fetchLogs = async () => {
      if (plants.length === 0) {
        setLoading(false)
        return
      }
      setLoading(true)
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .gte('date', dateFrom)
        .lte('date', dateTo)

      setLogs(data || [])
      setLoading(false)
    }
    fetchLogs()
  }, [plants, dateFrom, dateTo])

  const dashboardData = useMemo(() => {
    if (!logs.length) return { pData: [], tData: [], rankPlants: [], rankEmp: [], rankEq: [] }

    const plantStats = plants.map((p) => {
      const pLogs = logs.filter((l) => l.plant_id === p.id && l.type === 'staff')
      const pDays = new Set(pLogs.map((l) => l.date)).size || 1
      const presencas = pLogs.filter((l) => l.status).length
      const presencaRate = pLogs.length > 0 ? (presencas / pLogs.length) * 100 : 0

      const contr = contracted
        .filter((c) => c.plant_id === p.id && c.type === 'colaborador')
        .reduce((a, b) => a + b.quantity, 0)

      const avgPres = presencas / pDays
      const absRate = contr > 0 ? Math.max(0, ((contr - avgPres) / contr) * 100) : 0

      return {
        id: p.id,
        name: p.name.substring(0, 15),
        fullName: p.name,
        presenca: Number(presencaRate.toFixed(1)),
        absenteismo: Number(absRate.toFixed(1)),
      }
    })

    const pData = plantStats
    const rankPlants = [...plantStats]
      .sort((a, b) => b.absenteismo - a.absenteismo)
      .map((p) => ({ ...p, value: p.absenteismo }))

    const validPlantFilter = selectedPlantId || undefined

    const eqLogsAll = logs.filter(
      (l) => l.type === 'equipment' && (!validPlantFilter || l.plant_id === validPlantFilter),
    )
    const dates = Array.from(new Set(eqLogsAll.map((l) => l.date))).sort()
    const tData = dates
      .map((d) => {
        const dLogs = eqLogsAll.filter((l) => l.date === d)
        const dPres = dLogs.filter((l) => l.status).length
        const disp = dLogs.length > 0 ? (dPres / dLogs.length) * 100 : 0
        return {
          name: format(new Date(d), 'dd/MM'),
          disp: Number(disp.toFixed(1)),
        }
      })
      .slice(-14)

    const empLogs = logs.filter(
      (l) =>
        l.type === 'staff' && !l.status && (!validPlantFilter || l.plant_id === validPlantFilter),
    )
    const empCount: Record<string, number> = {}
    empLogs.forEach((l) => {
      empCount[l.reference_id] = (empCount[l.reference_id] || 0) + 1
    })
    const rankEmp = Object.entries(empCount)
      .map(([id, count]) => {
        const emp = employees.find((e) => e.id === id)
        return { id, name: emp?.name || 'Desconhecido', value: count }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    const eqLogs = logs.filter(
      (l) =>
        l.type === 'equipment' &&
        !l.status &&
        (!validPlantFilter || l.plant_id === validPlantFilter),
    )
    const eqCount: Record<string, number> = {}
    eqLogs.forEach((l) => {
      eqCount[l.reference_id] = (eqCount[l.reference_id] || 0) + 1
    })
    const rankEq = Object.entries(eqCount)
      .map(([id, count]) => {
        const eq = equipment.find((e) => e.id === id)
        return { id, name: eq?.name || 'Desconhecido', value: count }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    return { pData, tData, rankPlants, rankEmp, rankEq }
  }, [logs, plants, contracted, employees, equipment, selectedPlantId])

  return {
    ...dashboardData,
    loading,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    selectedPlantId,
    setSelectedPlantId,
  }
}
