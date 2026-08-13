import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { DateRange } from 'react-day-picker'
import { format, differenceInDays, addDays } from 'date-fns'

export type StrategicData = {
  plant: { id: string; name: string; city: string }
  metrics: {
    terceiros: {
      absenteismo: number
      headcount: number
      evolution: { date: string; value: number }[]
    }
    tarefas: { concluidas: number; pendentes: number; atrasadas: number }
    acidentes: { total: number; gravidade: { leve: number; moderado: number; grave: number } }
    budget: { orcado: number; realizado: number }
    limpeza: { concluidas: number; pendentes: number }
    imoveis: { ocupacao: number }
  }
  insights: {
    terceiros: string[]
    tarefas: string[]
    acidentes: string[]
    budget: string[]
    limpeza: string[]
    imoveis: string[]
    geral: string[]
  }
  rankings?: {
    absenteismo: { plantName: string; value: number }[]
    budget: { plantName: string; value: number }[]
    tarefas: { plantName: string; value: number }[]
  }
}

export function useDashboardEstrategico(dateRange: DateRange | undefined) {
  const [data, setData] = useState<StrategicData[]>([])
  const [loading, setLoading] = useState(true)
  const { activeClient } = useAppStore()

  useEffect(() => {
    if (!activeClient) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const startDate = dateRange?.from
          ? dateRange.from.toISOString()
          : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        const endDate = dateRange?.to
          ? new Date(dateRange.to.setHours(23, 59, 59, 999)).toISOString()
          : new Date().toISOString()

        const startDateStr = startDate.split('T')[0]
        const endDateStr = endDate.split('T')[0]

        // Busca paginada completa: o cliente Supabase limita cada resposta a
        // 1.000 registros, então quaisquer dados além disso seriam silenciosamente
        // ignorados, distorcendo contagens e somatórias. `fetchAll` pagina até o fim.
        const fetchAll = async (builder: any): Promise<any[]> => {
          let all: any[] = []
          let page = 0
          const pageSize = 1000
          let hasMore = true
          while (hasMore) {
            const { data: pageData, error } = await builder.range(
              page * pageSize,
              (page + 1) * pageSize - 1,
            )
            if (error) throw error
            if (!pageData || pageData.length === 0) {
              hasMore = false
            } else {
              all = all.concat(pageData)
              if (pageData.length < pageSize) hasMore = false
              else page++
            }
          }
          return all
        }

        // Fetching real data from Supabase across modules (paginação completa)
        const [
          plants,
          employees,
          dailyLogs,
          tasks,
          taskStatuses,
          accidents,
          cleaningSchedules,
          budgetEntries,
          propertyRooms,
          propertyReservations,
        ] = await Promise.all([
          fetchAll(
            supabase
              .from('plants')
              .select('id, name, city')
              .eq('client_id', activeClient.id)
              .order('name'),
          ),
          fetchAll(
            supabase.from('employees').select('id, plant_id').eq('client_id', activeClient.id),
          ),
          fetchAll(
            supabase
              .from('daily_logs')
              .select('date, plant_id, status')
              .eq('client_id', activeClient.id)
              .eq('type', 'staff')
              .gte('date', startDateStr)
              .lte('date', endDateStr),
          ),
          fetchAll(
            supabase
              .from('tasks')
              .select('id, plant_id, status_id, due_date')
              .eq('client_id', activeClient.id)
              .gte('created_at', startDate)
              .lte('created_at', endDate),
          ),
          fetchAll(
            supabase
              .from('task_statuses')
              .select('id, is_terminal')
              .eq('client_id', activeClient.id),
          ),
          fetchAll(
            supabase
              .from('accidents')
              .select('id, plant_id, severity')
              .eq('client_id', activeClient.id)
              .gte('event_date', startDate)
              .lte('event_date', endDate),
          ),
          fetchAll(
            supabase
              .from('cleaning_gardening_schedules')
              .select('id, plant_id, status')
              .eq('client_id', activeClient.id)
              .gte('activity_date', startDateStr)
              .lte('activity_date', endDateStr),
          ),
          fetchAll(
            supabase
              .from('budget_entries')
              .select('budgeted_amount, realized_amount')
              .eq('client_id', activeClient.id)
              .gte('reference_month', startDateStr)
              .lte('reference_month', endDateStr),
          ),
          fetchAll(
            supabase.from('property_rooms').select('id, capacity').eq('client_id', activeClient.id),
          ),
          fetchAll(
            supabase
              .from('property_reservations')
              .select('room_id, check_in_date, check_out_date, status')
              .eq('client_id', activeClient.id)
              .eq('status', 'Confirmada'),
          ),
        ])

        if (!plants || plants.length === 0) {
          setData([])
          return
        }

        const terminalStatusIds = new Set(
          taskStatuses?.filter((s) => s.is_terminal).map((s) => s.id) || [],
        )

        // Global Budget (round2 mantém a precisão de centavos nas somatórias)
        const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100
        let totalOrcado = 0
        let totalRealizado = 0
        budgetEntries?.forEach((b) => {
          totalOrcado = round2(totalOrcado + (Number(b.budgeted_amount) || 0))
          totalRealizado = round2(totalRealizado + (Number(b.realized_amount) || 0))
        })
        const orcadoPerPlant = plants.length > 0 ? round2(totalOrcado / plants.length) : 0
        const realizadoPerPlant = plants.length > 0 ? round2(totalRealizado / plants.length) : 0

        // Global Properties Occupation
        let totalCapacity = 0
        propertyRooms?.forEach((r) => (totalCapacity += Number(r.capacity || 1)))

        let globalOccupiedDays = 0
        const rangeStart =
          dateRange?.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        const rangeEnd = dateRange?.to || new Date()
        const totalDays = Math.max(1, differenceInDays(rangeEnd, rangeStart) + 1)
        const globalCapacityDays = totalCapacity * totalDays

        propertyReservations?.forEach((res) => {
          const checkIn = new Date(res.check_in_date)
          const checkOut = new Date(res.check_out_date)
          const overlapStart = checkIn > rangeStart ? checkIn : rangeStart
          const overlapEnd = checkOut < rangeEnd ? checkOut : rangeEnd

          if (overlapStart <= overlapEnd) {
            const room = propertyRooms?.find((r) => r.id === res.room_id)
            const roomCap = room ? Number(room.capacity || 1) : 1
            globalOccupiedDays += (differenceInDays(overlapEnd, overlapStart) + 1) * roomCap
          }
        })
        const globalOccupacao =
          globalCapacityDays > 0
            ? Math.min(100, (globalOccupiedDays / globalCapacityDays) * 100)
            : 0

        const results: StrategicData[] = plants.map((plant) => {
          const plantEmployees = employees?.filter((e) => e.plant_id === plant.id) || []
          const plantLogs = dailyLogs?.filter((l) => l.plant_id === plant.id) || []
          const plantTasks = tasks?.filter((t) => t.plant_id === plant.id) || []
          const plantAccidents = accidents?.filter((a) => a.plant_id === plant.id) || []
          const plantSchedules = cleaningSchedules?.filter((s) => s.plant_id === plant.id) || []

          let absenteismoRate = 0
          if (plantLogs.length > 0) {
            const absentCount = plantLogs.filter((l) => !l.status).length
            absenteismoRate = (absentCount / plantLogs.length) * 100
          }

          const evolution = []
          for (let i = 6; i >= 0; i--) {
            const d = addDays(rangeEnd, -i)
            const dStr = format(d, 'yyyy-MM-dd')
            const dayLogs = plantLogs.filter((l) => l.date === dStr)
            let rate = 0
            if (dayLogs.length > 0) {
              rate = (dayLogs.filter((l) => !l.status).length / dayLogs.length) * 100
            }
            evolution.push({ date: format(d, 'dd/MM'), value: rate })
          }

          let concluidas = 0,
            pendentes = 0,
            atrasadas = 0
          plantTasks.forEach((t) => {
            if (terminalStatusIds.has(t.status_id)) {
              concluidas++
            } else {
              pendentes++
              if (t.due_date && new Date(t.due_date) < new Date()) {
                atrasadas++
              }
            }
          })

          let leve = 0,
            moderado = 0,
            grave = 0
          plantAccidents.forEach((a) => {
            if (a.severity === 'Leve') leve++
            else if (a.severity === 'Moderado') moderado++
            else if (a.severity === 'Grave') grave++
          })

          let limpConcluidas = 0,
            limpPendentes = 0
          plantSchedules.forEach((s) => {
            if (s.status === 'Realizado') limpConcluidas++
            else limpPendentes++
          })

          const insights = {
            terceiros: [] as string[],
            tarefas: [] as string[],
            acidentes: [] as string[],
            budget: [] as string[],
            limpeza: [] as string[],
            imoveis: [] as string[],
            geral: [] as string[],
          }

          if (absenteismoRate > 5)
            insights.terceiros.push(
              `Taxa de absenteísmo (${absenteismoRate.toFixed(1)}%) está acima do limite recomendado.`,
            )
          else insights.terceiros.push(`Absenteísmo sob controle (${absenteismoRate.toFixed(1)}%).`)

          if (atrasadas > 0)
            insights.tarefas.push(`Existem ${atrasadas} tarefas em atraso que requerem atenção.`)
          else insights.tarefas.push('Todas as tarefas pendentes estão dentro do prazo.')

          if (grave > 0)
            insights.acidentes.push(`Alerta crítico: ${grave} acidente(s) grave(s) registrado(s).`)
          else if (plantAccidents.length > 0)
            insights.acidentes.push(`Registrados acidentes de menor gravidade.`)
          else insights.acidentes.push('Nenhum acidente registrado no período.')

          if (realizadoPerPlant > orcadoPerPlant && orcadoPerPlant > 0)
            insights.budget.push('Orçamento estourado na distribuição proporcional.')
          else insights.budget.push('Execução orçamentária dentro dos limites proporcionais.')

          if (limpPendentes > 0)
            insights.limpeza.push(`Existem ${limpPendentes} atividades de limpeza pendentes.`)
          else insights.limpeza.push('Rotinas de limpeza estão em dia.')

          insights.imoveis.push(
            `A taxa de ocupação global de imóveis está em ${globalOccupacao.toFixed(1)}%.`,
          )

          insights.geral.push(
            absenteismoRate > 5 || atrasadas > 5 || grave > 0
              ? 'Planta com indicativos de risco operacional. Necessita revisão.'
              : 'Operação ocorrendo dentro da normalidade esperada.',
          )

          return {
            plant: { id: plant.id, name: plant.name, city: plant.city },
            metrics: {
              terceiros: {
                absenteismo: absenteismoRate,
                headcount: plantEmployees.length,
                evolution,
              },
              tarefas: { concluidas, pendentes, atrasadas },
              acidentes: { total: plantAccidents.length, gravidade: { leve, moderado, grave } },
              budget: { orcado: orcadoPerPlant, realizado: realizadoPerPlant },
              limpeza: { concluidas: limpConcluidas, pendentes: limpPendentes },
              imoveis: { ocupacao: globalOccupacao },
            },
            insights,
          }
        })

        const consolidated: StrategicData = {
          plant: { id: 'all', name: 'Visão Consolidada', city: 'Geral' },
          metrics: {
            terceiros: {
              absenteismo: 0,
              headcount: employees?.length || 0,
              evolution: Array.from({ length: 7 }).map((_, i) => ({
                date: format(addDays(rangeEnd, -(6 - i)), 'dd/MM'),
                value: 0,
              })),
            },
            tarefas: { concluidas: 0, pendentes: 0, atrasadas: 0 },
            acidentes: { total: 0, gravidade: { leve: 0, moderado: 0, grave: 0 } },
            budget: { orcado: totalOrcado, realizado: totalRealizado },
            limpeza: { concluidas: 0, pendentes: 0 },
            imoveis: { ocupacao: globalOccupacao },
          },
          insights: {
            terceiros: ['Visão global do absenteísmo estabilizada.'],
            tarefas: ['Produtividade técnica refletida nas conclusões.'],
            acidentes: ['Acompanhamento de segurança em todas as áreas.'],
            budget: ['Visão macro dos centros de custo.'],
            limpeza: ['Rotinas essenciais de asseio corporativo.'],
            imoveis: ['Aproveitamento físico do patrimônio corporativo.'],
            geral: [],
          },
        }

        let totalAbsRate = 0
        const totalEvol = Array(7).fill(0)

        results.forEach((r) => {
          totalAbsRate += r.metrics.terceiros.absenteismo
          r.metrics.terceiros.evolution.forEach((ev, i) => {
            totalEvol[i] += ev.value
          })

          consolidated.metrics.tarefas.concluidas += r.metrics.tarefas.concluidas
          consolidated.metrics.tarefas.pendentes += r.metrics.tarefas.pendentes
          consolidated.metrics.tarefas.atrasadas += r.metrics.tarefas.atrasadas
          consolidated.metrics.acidentes.total += r.metrics.acidentes.total
          consolidated.metrics.acidentes.gravidade.leve += r.metrics.acidentes.gravidade.leve
          consolidated.metrics.acidentes.gravidade.moderado +=
            r.metrics.acidentes.gravidade.moderado
          consolidated.metrics.acidentes.gravidade.grave += r.metrics.acidentes.gravidade.grave
          consolidated.metrics.limpeza.concluidas += r.metrics.limpeza.concluidas
          consolidated.metrics.limpeza.pendentes += r.metrics.limpeza.pendentes
        })

        if (results.length > 0) {
          consolidated.metrics.terceiros.absenteismo = totalAbsRate / results.length
          consolidated.metrics.terceiros.evolution.forEach((ev, i) => {
            ev.value = totalEvol[i] / results.length
          })
        }

        consolidated.insights.geral.push(
          'A visão consolidada apresenta o resumo macro-operacional baseado em dados reais do período.',
        )
        if (consolidated.metrics.acidentes.gravidade.grave > 0)
          consolidated.insights.acidentes.push(
            'Alerta: Acidentes graves afetam o resultado consolidado.',
          )
        if (totalRealizado > totalOrcado && totalOrcado > 0)
          consolidated.insights.budget.push('O custo realizado global ultrapassa o teto orçado.')

        consolidated.rankings = {
          absenteismo: [...results]
            .map((r) => ({ plantName: r.plant.name, value: r.metrics.terceiros.absenteismo }))
            .sort((a, b) => a.value - b.value),
          budget: [...results]
            .map((r) => ({
              plantName: r.plant.name,
              value:
                r.metrics.budget.orcado > 0
                  ? (r.metrics.budget.realizado / r.metrics.budget.orcado) * 100
                  : 0,
            }))
            .sort((a, b) => b.value - a.value),
          tarefas: [...results]
            .map((r) => ({ plantName: r.plant.name, value: r.metrics.tarefas.concluidas }))
            .sort((a, b) => b.value - a.value),
        }

        setData([consolidated, ...results])
      } catch (error) {
        console.error('Error fetching strategic data', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeClient, dateRange])

  return { data, loading }
}
