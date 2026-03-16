import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { useAppStore } from '@/store/AppContext'
import { DateRange } from 'react-day-picker'

export function useBIDashboard(
  plants: any[],
  contracted: any[],
  employees: any[],
  equipment: any[],
  locations: any[],
  goals: any[],
) {
  const { profile } = useAppStore()
  const [logs, setLogs] = useState<any[]>([])
  const [monthlyGoals, setMonthlyGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [selectedPlantId, setSelectedPlantId] = useState<string>('all')
  const [compSelectedLocs, setCompSelectedLocs] = useState<string[]>([])
  const [colors, setColors] = useState({
    primary: '#3b82f6',
    secondary: '#ef4444',
    tertiary: '#10b981',
  })

  const authPlants = useMemo(() => {
    const ids = profile?.authorized_plants as string[] | undefined
    if (!ids || !Array.isArray(ids) || ids.length === 0) return plants || []
    return (plants || []).filter((p) => p?.id && ids.includes(p.id))
  }, [plants, profile])

  useEffect(() => {
    const fetchLogsAndGoals = async () => {
      if (!dateRange?.from || !dateRange?.to || !authPlants || authPlants.length === 0)
        return setLoading(false)
      setLoading(true)
      const fStr = format(dateRange.from, 'yyyy-MM-dd')
      const tStr = format(dateRange.to, 'yyyy-MM-dd')

      const { data: logData } = await supabase
        .from('daily_logs')
        .select('*')
        .gte('date', fStr)
        .lte('date', tStr)
      setLogs(logData || [])

      const mFrom = format(startOfMonth(dateRange.from), 'yyyy-MM-dd')
      const mTo = format(endOfMonth(dateRange.to), 'yyyy-MM-dd')
      const { data: mData } = await supabase
        .from('monthly_goals_data')
        .select('*')
        .gte('reference_month', mFrom)
        .lte('reference_month', mTo)
      setMonthlyGoals(mData || [])
      setLoading(false)
    }
    fetchLogsAndGoals()
  }, [dateRange, authPlants])

  useEffect(() => {
    if (compSelectedLocs.length === 0 && locations && locations.length > 0) {
      setCompSelectedLocs(
        locations
          .slice(0, 3)
          .map((l) => l.id)
          .filter(Boolean),
      )
    }
  }, [locations])

  const activePlantIds = useMemo(() => {
    if (selectedPlantId === 'all') return (authPlants || []).map((p) => p.id).filter(Boolean)
    return [selectedPlantId].filter(Boolean)
  }, [selectedPlantId, authPlants])

  const dashboardData = useMemo(() => {
    if (!logs || logs.length === 0)
      return {
        pData: [],
        lData: [],
        eData: [],
        cData: [],
        gData: [],
        rankPlants: [],
        rankEmp: [],
        rankEq: [],
      }

    const validLogs = logs.filter((l) => l?.plant_id && activePlantIds.includes(l.plant_id))

    // 1. Plant Data
    const pData = (authPlants || [])
      .filter((p) => p?.id && activePlantIds.includes(p.id))
      .map((p) => {
        const pLogs = validLogs.filter((l) => l.plant_id === p.id && l.type === 'staff')
        const pDays = new Set(pLogs.map((l) => l.date)).size || 1
        const pres = pLogs.filter((l) => l.status).length
        const contr = (contracted || [])
          .filter((c) => c?.plant_id === p.id && c?.type === 'colaborador')
          .reduce((a, b) => a + (b.quantity || 0), 0)
        const presRate = pLogs.length > 0 ? (pres / pLogs.length) * 100 : 0
        const avgPres = pres / pDays
        const absRate = contr > 0 ? Math.max(0, ((contr - avgPres) / contr) * 100) : 0
        return {
          id: p.id,
          name: p.name ? p.name.substring(0, 15) : 'Sem Nome',
          presenca: Number(presRate.toFixed(1)),
          absenteismo: Number(absRate.toFixed(1)),
        }
      })

    // 2. Local Absenteismo
    const lData = (locations || [])
      .filter((l) => l?.plant_id && activePlantIds.includes(l.plant_id))
      .map((loc) => {
        const locEmps = (employees || []).filter((e) => e?.location_id === loc.id).map((e) => e.id)
        const lLogs = validLogs.filter(
          (l) => l.type === 'staff' && l.reference_id && locEmps.includes(l.reference_id),
        )
        const lCont = (contracted || [])
          .filter((c) => c?.type === 'colaborador' && c?.location_id === loc.id)
          .reduce((a, b) => a + (b.quantity || 0), 0)
        const lDays = new Set(lLogs.map((l) => l.date)).size || 1
        const pres = lLogs.filter((l) => l.status).length
        const abs = lCont > 0 ? Math.max(0, ((lCont - pres / lDays) / lCont) * 100) : 0
        return { id: loc.id, name: loc.name || 'Sem nome', absenteismo: Number(abs.toFixed(1)) }
      })
      .filter((d) => d.absenteismo > 0 || (contracted || []).some((c) => c?.location_id === d.id))

    // 3. Equip Disp
    const eData = (equipment || [])
      .filter((e) => e?.plant_id && activePlantIds.includes(e.plant_id))
      .map((eq) => {
        const eLogs = validLogs.filter((l) => l.type === 'equipment' && l.reference_id === eq.id)
        const eDays = new Set(eLogs.map((l) => l.date)).size || 1
        const pres = eLogs.filter((l) => l.status).length
        const eCont =
          (contracted || [])
            .filter((c) => c?.type === 'equipamento' && c?.equipment_id === eq.id)
            .reduce((a, b) => a + (b.quantity || 0), 0) ||
          eq.quantity ||
          1
        const disp = eCont > 0 ? Math.min(100, (pres / eDays / eCont) * 100) : 0
        return { id: eq.id, name: eq.name || 'Sem nome', disp: Number(disp.toFixed(1)) }
      })

    // 4. Comparative Abs
    const dates = Array.from(new Set(validLogs.map((l) => l.date)))
      .filter(Boolean)
      .sort()
    const cData = dates.map((d) => {
      const row: any = { date: d ? format(new Date(String(d)), 'dd/MM') : '' }
      ;(compSelectedLocs || []).forEach((locId) => {
        if (!locId) return
        const loc = (locations || []).find((l) => l?.id === locId)
        if (!loc) return
        const lCont = (contracted || [])
          .filter((c) => c?.type === 'colaborador' && c?.location_id === locId)
          .reduce((a, b) => a + (b.quantity || 0), 0)
        const dLogs = validLogs.filter(
          (l) =>
            l.date === d &&
            l.type === 'staff' &&
            l.reference_id &&
            (employees || []).find((e) => e?.id === l.reference_id)?.location_id === locId,
        )
        const pres = dLogs.filter((l) => l.status).length
        const abs = lCont > 0 ? Math.max(0, ((lCont - pres) / lCont) * 100) : 0
        row[loc.name || 'Sem nome'] = Number(abs.toFixed(1))
      })
      return row
    })

    // 5. Goals Data
    const gData = []
    const totalCont = (contracted || [])
      .filter(
        (c) => c?.type === 'colaborador' && c?.plant_id && activePlantIds.includes(c.plant_id),
      )
      .reduce((a, b) => a + (b.quantity || 0), 0)
    const staffLogs = validLogs.filter((l) => l.type === 'staff')
    const tDays = new Set(staffLogs.map((l) => l.date)).size || 1
    const absG =
      totalCont > 0
        ? Math.max(
            0,
            ((totalCont - staffLogs.filter((l) => l.status).length / tDays) / totalCont) * 100,
          )
        : 0
    gData.push({ name: 'Absenteísmo', value: absG < 4 ? 100 : 0 })

    const eqCont = (contracted || [])
      .filter(
        (c) => c?.type === 'equipamento' && c?.plant_id && activePlantIds.includes(c.plant_id),
      )
      .reduce((a, b) => a + (b.quantity || 0), 0)
    const eqLogs = validLogs.filter((l) => l.type === 'equipment')
    const eqDays = new Set(eqLogs.map((l) => l.date)).size || 1
    const dispG =
      eqCont > 0
        ? Math.min(100, (eqLogs.filter((l) => l.status).length / eqDays / eqCont) * 100)
        : 0
    gData.push({ name: 'Disp. Equip.', value: Number(dispG.toFixed(1)) })

    ;(goals || [])
      .filter((g) => g?.is_active)
      .forEach((g) => {
        const mData = (monthlyGoals || []).filter(
          (m) => m?.goal_id === g.id && m?.plant_id && activePlantIds.includes(m.plant_id),
        )
        if (mData.length > 0)
          gData.push({
            name: g.name || 'Meta',
            value: Number(
              (mData.reduce((a, b) => a + Number(b.value || 0), 0) / mData.length).toFixed(1),
            ),
          })
      })

    // Rankings
    const rankPlants = [...pData]
      .sort((a, b) => b.absenteismo - a.absenteismo)
      .map((p) => ({ ...p, value: p.absenteismo }))

    const empCount: Record<string, number> = {}
    validLogs
      .filter((l) => l.type === 'staff' && !l.status && l.reference_id)
      .forEach((l) => (empCount[l.reference_id] = (empCount[l.reference_id] || 0) + 1))
    const rankEmp = Object.entries(empCount)
      .map(([id, c]) => ({
        id,
        name: (employees || []).find((e) => e?.id === id)?.name || 'Desconhecido',
        value: c,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    const eqCount: Record<string, number> = {}
    validLogs
      .filter((l) => l.type === 'equipment' && !l.status && l.reference_id)
      .forEach((l) => (eqCount[l.reference_id] = (eqCount[l.reference_id] || 0) + 1))
    const rankEq = Object.entries(eqCount)
      .map(([id, c]) => ({
        id,
        name: (equipment || []).find((e) => e?.id === id)?.name || 'Desconhecido',
        value: c,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    return { pData, lData, eData, cData, gData, rankPlants, rankEmp, rankEq }
  }, [
    logs,
    activePlantIds,
    authPlants,
    contracted,
    employees,
    equipment,
    locations,
    compSelectedLocs,
    goals,
    monthlyGoals,
  ])

  return {
    ...dashboardData,
    loading,
    dateRange,
    setDateRange,
    selectedPlantId,
    setSelectedPlantId,
    authPlants,
    activePlantIds,
    compSelectedLocs,
    setCompSelectedLocs,
    colors,
    setColors,
  }
}
