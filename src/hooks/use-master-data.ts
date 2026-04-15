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

    const query = (tableName: string) => {
      let q = supabase.from(tableName as any).select('*')
      if (profile.role === 'Master') {
        if (selectedMasterClient !== 'all') {
          q = q.eq('client_id', selectedMasterClient)
        }
      } else {
        q = q.eq('client_id', profile.client_id)
      }
      return q
    }

    const [pRes, fRes, eRes, gRes, empRes, cRes, lRes, tRes, frtRes, etrRes, compRes, ptRes] =
      await Promise.all([
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

    let plantsData = pRes.data || []
    if (!isAdmin) {
      plantsData = plantsData.filter((p: any) => authorizedPlants.includes(p.id))
    }
    const validPlantIds = plantsData.map((p: any) => p.id)

    const filterByPlant = (data: any[]) => {
      if (isAdmin) return data
      return data.filter((item: any) => !item.plant_id || validPlantIds.includes(item.plant_id))
    }

    setPlants(plantsData)
    setFunctions(fRes.data || [])

    const equipmentData = filterByPlant(eRes.data || [])
    setEquipment(equipmentData)
    setGoals(gRes.data || [])

    const employeesData = filterByPlant(empRes.data || [])
    setEmployees(employeesData)

    setContracted(filterByPlant(cRes.data || []))
    setLocations(filterByPlant(lRes.data || []))

    setTrainings(tRes.data || [])
    setFunctionRequiredTrainings(frtRes.data || [])

    const validEmployeeIds = employeesData.map((e: any) => e.id)
    const filteredTrainingRecords = isAdmin
      ? etrRes.data || []
      : (etrRes.data || []).filter((r: any) => validEmployeeIds.includes(r.employee_id))
    setEmployeeTrainingRecords(filteredTrainingRecords)

    setCompanies(compRes.data || [])
    setPackageTypes(ptRes.data || [])

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
