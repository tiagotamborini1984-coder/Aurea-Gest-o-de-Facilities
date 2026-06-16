import { useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useTrainingStatus() {
  const getTrainingStatuses = useCallback(async (employees: any[], includeDetails = false) => {
    if (!employees || employees.length === 0) {
      return includeDetails ? { statusMap: {}, detailsMap: {} } : {}
    }

    const employeeIds = Array.from(new Set(employees.map((e) => e?.id).filter(Boolean)))

    // Fetch required trainings
    const { data: reqTrainings } = await supabase
      .from('function_required_trainings')
      .select('*, trainings(*)')

    let allRecords: any[] = []
    if (employeeIds.length > 0) {
      const chunkSize = 100
      for (let i = 0; i < employeeIds.length; i += chunkSize) {
        const chunk = employeeIds.slice(i, i + chunkSize)
        const { data } = await supabase
          .from('employee_training_records')
          .select('*, trainings(*)')
          .in('employee_id', chunk)
        if (data) {
          allRecords = allRecords.concat(data)
        }
      }
    }

    const recordsById: Record<string, any[]> = {}
    allRecords.forEach((r) => {
      if (!r || !r.employee_id) return
      if (!recordsById[r.employee_id]) recordsById[r.employee_id] = []
      recordsById[r.employee_id].push(r)
    })

    const statusMap: Record<string, 'Apto' | 'Inapto' | 'Isento' | 'Função não definida'> = {}
    const detailsMap: Record<string, any[]> = {}

    employees.forEach((emp) => {
      if (!emp || !emp.id) return

      if (!emp.function_id) {
        statusMap[emp.id] = 'Função não definida'
        detailsMap[emp.id] = []
        return
      }

      const reqs = reqTrainings?.filter((rt: any) => rt?.function_id === emp.function_id) || []
      if (reqs.length === 0) {
        // Automatically Apto if there are no specific requirements
        statusMap[emp.id] = 'Apto'
        detailsMap[emp.id] = []
        return
      }

      const myRecords = recordsById[emp.id] || []
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
            expDate.setHours(23, 59, 59, 999)
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
