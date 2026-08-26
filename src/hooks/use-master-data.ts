import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'

export function useMasterData() {
  const { profile, selectedMasterClient } = useAppStore()
  const [plants, setPlants] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [functions, setFunctions] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [contracted, setContracted] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [packageTypes, setPackageTypes] = useState<any[]>([])

  // Training Management
  const [trainings, setTrainings] = useState<any[]>([])
  const [functionRequiredTrainings, setFunctionRequiredTrainings] = useState<any[]>([])
  const [employeeTrainingRecords, setEmployeeTrainingRecords] = useState<any[]>([])

  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!profile) return
    if (profile.role !== 'Master' && !profile.client_id) return

    setLoading(true)
    const isAdmin = profile.role === 'Administrador' || profile.role === 'Master'
    const authorizedPlants = profile.authorized_plants || []

    async function query(table: string) {
      const allRows: any[] = []
      const pageSize = 1000
      let page = 0
      let hasMore = true

      while (hasMore) {
        const start = page * pageSize
        const end = start + pageSize - 1
        const { data, error } = await supabase
          .from(table as any)
          .select('*')
          .range(start, end)
        if (error) {
          console.error(`Erro ao carregar dados da tabela ${table}: ${error.message}`)
          return []
        }
        if (data && data.length > 0) {
          allRows.push(...data)
          page++
        }
        if (!data || data.length < pageSize) {
          hasMore = false
        }
      }

      return allRows
    }

    const [
      pData,
      fData,
      eData,
      gData,
      empData,
      cData,
      lData,
      tData,
      frtData,
      etrData,
      compData,
      ptData,
    ] = await Promise.all([
      query('plants'),
      query('functions'),
      query('equipment'),
      query('goals_book'),
      query('employees'),
      query('contracted_headcount'),
      query('locations'),
      query('trainings'),
      query('function_required_trainings'),
      query('employee_training_records'),
      query('companies'),
      query('package_types'),
    ])

    let plantsData = pData || []
    if (!isAdmin) {
      plantsData = plantsData.filter((p: any) => authorizedPlants.includes(p.id))
    }
    const validPlantIds = plantsData.map((p: any) => p.id)

    const filterByPlant = (data: any[]) => {
      if (isAdmin) return data
      return data.filter((item: any) => !item.plant_id || validPlantIds.includes(item.plant_id))
    }

    setPlants(plantsData)
    setFunctions(fData || [])

    const equipmentData = filterByPlant(eData || [])
    setEquipment(equipmentData)
    setGoals(gData || [])

    const employeesData = filterByPlant(empData || [])
    setEmployees(employeesData.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '')))

    setContracted(filterByPlant(cData || []))
    setLocations(filterByPlant(lData || []))

    setTrainings(tData || [])
    setFunctionRequiredTrainings(frtData || [])

    const validEmployeeIds = employeesData.map((e: any) => e.id)
    const filteredTrainingRecords = isAdmin
      ? etrData || []
      : (etrData || []).filter((r: any) => validEmployeeIds.includes(r.employee_id))
    setEmployeeTrainingRecords(filteredTrainingRecords)

    setCompanies(compData || [])
    setPackageTypes(ptData || [])

    setLoading(false)
  }, [profile, selectedMasterClient])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    plants,
    locations,
    functions,
    equipment,
    employees,
    goals,
    contracted,
    trainings,
    functionRequiredTrainings,
    employeeTrainingRecords,
    companies,
    packageTypes,
    loading,
    refetch: fetchData,
  }
}
