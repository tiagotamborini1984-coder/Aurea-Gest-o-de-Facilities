import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'

export function useMasterData() {
  const { profile } = useAppStore()
  const [plants, setPlants] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [functions, setFunctions] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [contracted, setContracted] = useState<any[]>([])

  // Training Management
  const [trainings, setTrainings] = useState<any[]>([])
  const [functionRequiredTrainings, setFunctionRequiredTrainings] = useState<any[]>([])
  const [employeeTrainingRecords, setEmployeeTrainingRecords] = useState<any[]>([])

  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!profile?.client_id) return
    setLoading(true)
    const cid = profile.client_id

    const [pRes, fRes, eRes, gRes, empRes, cRes, lRes, tRes, frtRes, etrRes] = await Promise.all([
      supabase.from('plants').select('*').eq('client_id', cid),
      supabase.from('functions').select('*').eq('client_id', cid),
      supabase.from('equipment').select('*').eq('client_id', cid),
      supabase.from('goals_book').select('*').eq('client_id', cid),
      supabase.from('employees').select('*').eq('client_id', cid),
      supabase.from('contracted_headcount').select('*').eq('client_id', cid),
      supabase.from('locations').select('*').eq('client_id', cid),
      supabase
        .from('trainings' as any)
        .select('*')
        .eq('client_id', cid),
      supabase
        .from('function_required_trainings' as any)
        .select('*')
        .eq('client_id', cid),
      supabase
        .from('employee_training_records' as any)
        .select('*')
        .eq('client_id', cid),
    ])

    setPlants(pRes.data || [])
    setFunctions(fRes.data || [])
    setEquipment(eRes.data || [])
    setGoals(gRes.data || [])
    setEmployees(empRes.data || [])
    setContracted(cRes.data || [])
    setLocations(lRes.data || [])
    setTrainings(tRes.data || [])
    setFunctionRequiredTrainings(frtRes.data || [])
    setEmployeeTrainingRecords(etrRes.data || [])

    setLoading(false)
  }, [profile?.client_id])

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
    loading,
    refetch: fetchData,
  }
}
