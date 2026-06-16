import { useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useTrainingStatus() {
  const getTrainingStatuses = useCallback(async (employees: any[], includeDetails = false) => {
    if (!employees || employees.length === 0) return {}

    // Extract unique registration numbers safely
    const regNumbers = Array.from(
      new Set(employees?.map((e) => e?.registration_number).filter(Boolean)),
    )

    // Fetch all required trainings, and employees matching registration numbers if available
    const promises: Promise<any>[] = [
      supabase.from('function_required_trainings').select('*, trainings(*)'),
    ]

    if (regNumbers.length > 0) {
      promises.push(
        supabase
          .from('employees')
          .select('id, registration_number')
          .in('registration_number', regNumbers as string[]),
      )
    }

    const results = await Promise.all(promises)
    const reqTrainings = results[0]?.data || []
    const allEmps = results[1]?.data || []

    const allEmpIds = allEmps?.map((e: any) => e?.id).filter(Boolean) || []
    let allRecords: any[] = []

    if (allEmpIds.length > 0) {
      // Chunking to avoid URL length limits for the `.in` query
      const chunkSize = 100
      for (let i = 0; i < allEmpIds.length; i += chunkSize) {
        const chunk = allEmpIds.slice(i, i + chunkSize)
        const { data } = await supabase
          .from('employee_training_records')
          .select('*, trainings(*)')
          .in('employee_id', chunk)
        if (data) {
          allRecords = allRecords.concat(data)
        }
      }
    }

    // Map records by registration number
    const recordsByReg: Record<string, any[]> = {}
    allRecords.forEach((r) => {
      if (!r) return
      const emp = allEmps?.find((e: any) => e?.id === r.employee_id)
      if (emp && emp.registration_number) {
        if (!recordsByReg[emp.registration_number]) recordsByReg[emp.registration_number] = []
        recordsByReg[emp.registration_number].push(r)
      }
    })

    // Calculate status for each currently viewed employee
    const statusMap: Record<string, 'Apto' | 'Inapto' | 'Isento' | 'Função não definida'> = {}
    const detailsMap: Record<string, any[]> = {}

    employees?.forEach((emp) => {
      if (!emp || !emp.id) return

      if (!emp.function_id) {
        statusMap[emp.id] = 'Função não definida'
        detailsMap[emp.id] = []
        return
      }

      const reqs = reqTrainings?.filter((rt: any) => rt?.function_id === emp.function_id) || []
      if (reqs.length === 0) {
        statusMap[emp.id] = 'Isento'
        detailsMap[emp.id] = []
        return
      }

      const myRecords = emp.registration_number ? recordsByReg[emp.registration_number] || [] : []
      let status: 'Apto' | 'Inapto' = 'Apto'
      const details: any[] = []

      for (const req of reqs) {
        if (!req) continue
        const recordsForReq = myRecords.filter((r) => r?.training_id === req.training_id)

        let reqStatus = 'Concluído'
        let latest = null

        if (recordsForReq.length === 0) {
          reqStatus = 'Pendente'
          status = 'Inapto'
        } else {
          latest = recordsForReq.sort(
            (a, b) =>
              new Date(b?.completion_date || 0).getTime() -
              new Date(a?.completion_date || 0).getTime(),
          )[0]

          const validity = latest?.trainings?.validity_months || 0
          if (validity > 0 && latest?.completion_date) {
            const expDate = new Date(latest.completion_date)
            expDate.setMonth(expDate.getMonth() + validity)
            if (expDate < new Date()) {
              reqStatus = 'Vencido'
              status = 'Inapto'
            }
          }
        }

        details.push({
          training_id: req.training_id,
          training_name: req.trainings?.name || 'Treinamento Desconhecido',
          status: reqStatus,
          completion_date: latest?.completion_date,
          document_url: latest?.document_url,
          validity_months: req.trainings?.validity_months,
        })
      }
      statusMap[emp.id] = status
      detailsMap[emp.id] = details
    })

    if (includeDetails) return { statusMap, detailsMap }
    return statusMap
  }, [])

  return { getTrainingStatuses }
}
