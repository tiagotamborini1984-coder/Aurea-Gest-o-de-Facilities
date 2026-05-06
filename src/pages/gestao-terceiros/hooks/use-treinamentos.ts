import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useToast } from '@/components/ui/use-toast'
import { format, addMonths, isBefore, parseISO } from 'date-fns'

export type EmployeeWithTrainings = {
  id: string
  name: string
  company_name: string
  function_name: string
  status: 'valid' | 'pending' | 'expired'
  trainings: {
    id: string
    name: string
    status: 'valid' | 'pending' | 'expired'
    completion_date?: string
    document_url?: string
    expiration_date?: string
    is_required: boolean
  }[]
}

export function useTreinamentos(plantId: string, referenceMonth: string) {
  const [data, setData] = useState<EmployeeWithTrainings[]>([])
  const [loading, setLoading] = useState(false)
  const { activeClient } = useAppStore()
  const { toast } = useToast()

  useEffect(() => {
    if (!activeClient || !referenceMonth) {
      setData([])
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        const refDate = `${referenceMonth}-01`

        let query = supabase
          .from('employees')
          .select('id, name, company_name, function_id')
          .eq('client_id', activeClient.id)
          .eq('reference_month', refDate)

        if (plantId) {
          query = query.eq('plant_id', plantId)
        }

        const [
          { data: employees },
          { data: functions },
          { data: allTrainings },
          { data: required },
          { data: records },
        ] = await Promise.all([
          query,
          supabase.from('functions').select('id, name').eq('client_id', activeClient.id),
          supabase
            .from('trainings')
            .select('id, name, validity_months')
            .eq('client_id', activeClient.id),
          supabase
            .from('function_required_trainings')
            .select('function_id, training_id')
            .eq('client_id', activeClient.id),
          supabase
            .from('employee_training_records')
            .select('id, employee_id, training_id, completion_date, document_url')
            .eq('client_id', activeClient.id),
        ])

        if (!employees || !functions || !allTrainings || !required || !records) {
          throw new Error('Erro ao buscar dados')
        }

        const employeeList: EmployeeWithTrainings[] = employees.map((emp) => {
          const func = functions.find((f) => f.id === emp.function_id)
          const funcRequired = required
            .filter((r) => r.function_id === emp.function_id)
            .map((r) => r.training_id)
          const empRecords = records.filter((r) => r.employee_id === emp.id)

          const trainings = allTrainings
            .map((t) => {
              const isRequired = funcRequired.includes(t.id)
              const record = empRecords.find((r) => r.training_id === t.id)

              let status: 'valid' | 'pending' | 'expired' = 'pending'
              let expirationDate: string | undefined

              if (record) {
                if (t.validity_months && t.validity_months > 0) {
                  const expDate = addMonths(parseISO(record.completion_date), t.validity_months)
                  expirationDate = format(expDate, 'yyyy-MM-dd')
                  if (isBefore(expDate, new Date())) {
                    status = 'expired'
                  } else {
                    status = 'valid'
                  }
                } else {
                  status = 'valid'
                }
              } else {
                status = 'pending'
              }

              return {
                id: t.id,
                name: t.name,
                status,
                completion_date: record?.completion_date,
                document_url: record?.document_url,
                expiration_date: expirationDate,
                is_required: isRequired,
              }
            })
            .filter((t) => t.is_required || t.completion_date) // Show only required or completed trainings

          const hasExpired = trainings.some((t) => t.is_required && t.status === 'expired')
          const hasPending = trainings.some((t) => t.is_required && t.status === 'pending')

          const overallStatus = hasExpired ? 'expired' : hasPending ? 'pending' : 'valid'

          return {
            id: emp.id,
            name: emp.name,
            company_name: emp.company_name,
            function_name: func?.name || 'Sem função',
            status: overallStatus,
            trainings,
          }
        })

        // Sort by company name, then employee name
        employeeList.sort((a, b) => {
          if (a.company_name < b.company_name) return -1
          if (a.company_name > b.company_name) return 1
          return a.name.localeCompare(b.name)
        })

        setData(employeeList)
      } catch (err: any) {
        toast({ title: 'Erro', description: err.message, variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [plantId, referenceMonth, activeClient])

  return { data, loading }
}
