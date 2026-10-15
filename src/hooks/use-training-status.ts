import { useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getPersonKey } from '@/lib/employee-vigencia'

export function useTrainingStatus() {
  const getTrainingStatuses = useCallback(
    async (employees: any[], includeDetails = false, evaluationDate: Date = new Date()) => {
      if (!employees || employees.length === 0) {
        return includeDetails ? { statusMap: {}, detailsMap: {} } : {}
      }

      // Agrupar IDs dos colaboradores fornecidos por chave de vigência de pessoa
      const personKeyToCurrentEmpIds = new Map<string, string[]>()
      employees.forEach((emp) => {
        if (!emp?.id) return
        const key = getPersonKey(emp)
        const current = personKeyToCurrentEmpIds.get(key) || []
        current.push(emp.id)
        personKeyToCurrentEmpIds.set(key, current)
      })

      // Buscar todos os IDs históricos correspondentes a esses colaboradores
      // para carregar o histórico completo de registros de treinamento de cada um
      const clientIds = Array.from(new Set(employees.map((e) => e?.client_id).filter(Boolean)))
      let allRelatedEmpIds = new Set<string>()

      if (clientIds.length > 0) {
        // Buscar colaboradores do mesmo cliente
        let histEmps: any[] = []
        for (const cId of clientIds) {
          let from = 0
          const limit = 1000
          let hasMore = true
          while (hasMore) {
            const { data, error } = await supabase
              .from('employees')
              .select('id, name, registration_number, plant_id, client_id')
              .eq('client_id', cId)
              .range(from, from + limit - 1)

            if (error || !data || data.length === 0) break
            histEmps = histEmps.concat(data)
            from += limit
            if (data.length < limit) hasMore = false
          }
        }

        // Mapear cada registro histórico para a pessoa correspondente
        histEmps.forEach((hEmp) => {
          const key = getPersonKey(hEmp)
          if (personKeyToCurrentEmpIds.has(key)) {
            allRelatedEmpIds.add(hEmp.id)
          }
        })
      }

      // Garantir que todos os IDs dos colaboradores atuais estão incluídos
      employees.forEach((e) => {
        if (e?.id) allRelatedEmpIds.add(e.id)
      })

      const employeeIds = Array.from(allRelatedEmpIds)

      // Fetch required trainings with pagination to avoid 1000 row limits
      let reqTrainings: any[] = []
      let hasMoreReqs = true
      let reqsFrom = 0
      const reqsLimit = 1000

      while (hasMoreReqs) {
        const { data, error } = await supabase
          .from('function_required_trainings')
          .select('*, trainings(*)')
          .range(reqsFrom, reqsFrom + reqsLimit - 1)

        if (error) {
          console.error('Error fetching required trainings:', error)
          break
        }

        if (data && data.length > 0) {
          reqTrainings = reqTrainings.concat(data)
          reqsFrom += reqsLimit
          if (data.length < reqsLimit) {
            hasMoreReqs = false
          }
        } else {
          hasMoreReqs = false
        }
      }

      let allRecords: any[] = []
      if (employeeIds.length > 0) {
        const chunkSize = 25 // Reduced chunk size to help with performance and limit issues
        for (let i = 0; i < employeeIds.length; i += chunkSize) {
          const chunk = employeeIds.slice(i, i + chunkSize)

          let hasMore = true
          let from = 0
          const limit = 1000

          while (hasMore) {
            const { data, error } = await supabase
              .from('employee_training_records')
              .select('*, trainings(*)')
              .in('employee_id', chunk)
              .order('completion_date', { ascending: false, nullsFirst: false })
              .range(from, from + limit - 1)

            if (error) {
              console.error('Error fetching training records:', error)
              break
            }

            if (data && data.length > 0) {
              allRecords = allRecords.concat(data)
              from += limit
              if (data.length < limit) {
                hasMore = false
              }
            } else {
              hasMore = false
            }
          }
        }
      }

      // Mapear registros de treinamento para o ID do colaborador E também associar por pessoa
      const recordsByPersonKey: Record<string, any[]> = {}
      // Mapear id do colaborador -> personKey
      const empIdToPersonKey = new Map<string, string>()
      employees.forEach((emp) => {
        if (emp?.id) empIdToPersonKey.set(emp.id, getPersonKey(emp))
      })
      allRecords.forEach((r) => {
        if (!r || !r.employee_id) return
        // Tentar obter personKey do colaborador histórico
        let pKey = empIdToPersonKey.get(r.employee_id)
        if (!pKey) {
          // Se não encontrou diretamente, procurar no map personKeyToCurrentEmpIds
          for (const [key, ids] of personKeyToCurrentEmpIds.entries()) {
            if (ids.includes(r.employee_id)) {
              pKey = key
              break
            }
          }
        }
        if (pKey) {
          if (!recordsByPersonKey[pKey]) recordsByPersonKey[pKey] = []
          recordsByPersonKey[pKey].push(r)
        }
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

        const pKey = getPersonKey(emp)
        const myRecords = recordsByPersonKey[pKey] || []
        let employeeStatus: 'Apto' | 'Inapto' = 'Apto'
        const details: any[] = []

        for (const req of reqs) {
          if (!req || !req.training_id) continue
          const recordsForReq = myRecords.filter((r) => r?.training_id === req.training_id)

          let reqStatus = 'Pendente'
          let latest = null
          let hasValid = false

          if (recordsForReq.length > 0) {
            // Sort records newest first by completion_date
            recordsForReq.sort((a, b) => {
              const dateA = a?.completion_date ? new Date(a.completion_date).getTime() : 0
              const dateB = b?.completion_date ? new Date(b.completion_date).getTime() : 0
              if (dateB !== dateA) return dateB - dateA

              const createdA = a?.created_at ? new Date(a.created_at).getTime() : 0
              const createdB = b?.created_at ? new Date(b.created_at).getTime() : 0
              return createdB - createdA
            })

            // Filter out explicitly rejected/inactive
            const validRecords = recordsForReq.filter(
              (r) => r.status !== 'Rejeitado' && r.status !== 'Reprovado' && r.status !== 'Inativo',
            )

            latest = recordsForReq[0] // default to newest record even if rejected for display fallback
            const mostRecentValid = validRecords[0]

            if (mostRecentValid && mostRecentValid.completion_date) {
              const validity = Number(
                mostRecentValid?.trainings?.validity_months || req?.trainings?.validity_months || 0,
              )

              const dateStr = mostRecentValid.completion_date.split('T')[0]
              const [year, month, day] = dateStr.split('-').map(Number)
              const expDate = new Date(year, month - 1, day)

              if (validity > 0) {
                expDate.setMonth(expDate.getMonth() + validity)
              } else {
                // Vitalício (doesn't expire)
                expDate.setFullYear(2099)
              }
              expDate.setHours(23, 59, 59, 999)

              const evalDate = new Date(evaluationDate)
              evalDate.setHours(0, 0, 0, 0)

              if (expDate >= evalDate) {
                hasValid = true
                latest = mostRecentValid // Use the valid record for display
                reqStatus = 'Concluído'
              } else {
                hasValid = false
                latest = mostRecentValid // Show as expired
                reqStatus = 'Vencido'
              }
            }

            if (!hasValid) {
              if (!reqStatus || reqStatus === 'Concluído') {
                reqStatus = latest?.completion_date ? 'Vencido' : 'Pendente'
              }
              employeeStatus = 'Inapto'
            }
          } else {
            reqStatus = 'Pendente'
            employeeStatus = 'Inapto'
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
        statusMap[emp.id] = employeeStatus
        detailsMap[emp.id] = details
      })

      if (includeDetails) return { statusMap, detailsMap }
      return statusMap
    },
    [],
  )

  return { getTrainingStatuses }
}
