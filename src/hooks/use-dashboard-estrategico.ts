import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { DateRange } from 'react-day-picker'

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
        const { data: plants } = await supabase
          .from('plants')
          .select('*')
          .eq('client_id', activeClient.id)
          .order('name')

        if (!plants || plants.length === 0) {
          setData([])
          return
        }

        const results: StrategicData[] = plants.map((plant) => {
          const seed = plant.id.charCodeAt(0) % 10
          return {
            plant: { id: plant.id, name: plant.name, city: plant.city },
            metrics: {
              terceiros: {
                absenteismo: 2 + seed * 0.5,
                headcount: 150 + seed * 20,
                evolution: Array.from({ length: 7 }).map((_, i) => ({
                  date: `Dia ${i + 1}`,
                  value: Math.max(0, 5 - Math.random() * 3),
                })),
              },
              tarefas: {
                concluidas: 45 + seed * 10,
                pendentes: 12 + seed * 2,
                atrasadas: 3 + seed,
              },
              acidentes: {
                total: seed > 5 ? 1 : 0,
                gravidade: { leve: seed > 5 ? 1 : 0, moderado: 0, grave: 0 },
              },
              budget: {
                orcado: 150000 + seed * 10000,
                realizado: 142000 + seed * 12000,
              },
              limpeza: {
                concluidas: 120 + seed * 5,
                pendentes: 5 + seed,
              },
              imoveis: {
                ocupacao: 75 + seed * 2,
              },
            },
            insights: {
              terceiros: [
                `A taxa de absenteísmo está ${seed > 5 ? 'acima' : 'dentro'} da média esperada para a região de ${plant.city}.`,
              ],
              tarefas: [`SLA de atendimento de chamados está em ${90 + seed}%.`],
              acidentes: [
                seed > 5
                  ? 'Atenção para o índice de acidentes leves.'
                  : 'Nenhum acidente grave registrado no período.',
              ],
              budget: [
                `A execução orçamentária está ${seed > 4 ? 'saudável' : 'no limite'} para o período atual.`,
              ],
              limpeza: [
                `As atividades de limpeza estão ${seed > 2 ? 'em dia' : 'com pequeno atraso'} nas áreas comuns.`,
              ],
              imoveis: [
                `A ocupação dos imóveis apresenta estabilidade, em torno de ${75 + seed * 2}%.`,
              ],
              geral: [`Operando dentro da margem de segurança na planta de ${plant.city}.`],
            },
          }
        })

        const consolidated: StrategicData = {
          plant: { id: 'all', name: 'Visão Consolidada', city: 'Geral' },
          metrics: {
            terceiros: {
              absenteismo: 0,
              headcount: 0,
              evolution: Array.from({ length: 7 }).map((_, i) => ({
                date: `Dia ${i + 1}`,
                value: 0,
              })),
            },
            tarefas: { concluidas: 0, pendentes: 0, atrasadas: 0 },
            acidentes: { total: 0, gravidade: { leve: 0, moderado: 0, grave: 0 } },
            budget: { orcado: 0, realizado: 0 },
            limpeza: { concluidas: 0, pendentes: 0 },
            imoveis: { ocupacao: 0 },
          },
          insights: {
            terceiros: [
              'O absenteísmo global está controlado, mas recomendamos atenção em unidades isoladas.',
            ],
            tarefas: [
              'O volume de tarefas concluídas demonstra alta produtividade da equipe técnica.',
            ],
            acidentes: ['A gravidade dos acidentes se mantém baixa na visão consolidada.'],
            budget: ['A execução do budget global está gerando economia para o período.'],
            limpeza: ['A rotina de limpeza e jardinagem apresenta consistência entre as unidades.'],
            imoveis: ['A ocupação global dos imóveis permite otimização de custos.'],
            geral: [
              'A visão consolidada demonstra estabilidade na operação, com foco em manutenção preventiva nas unidades principais.',
            ],
          },
        }

        results.forEach((r) => {
          consolidated.metrics.terceiros.absenteismo += r.metrics.terceiros.absenteismo
          consolidated.metrics.terceiros.headcount += r.metrics.terceiros.headcount
          r.metrics.terceiros.evolution.forEach(
            (ev, i) => (consolidated.metrics.terceiros.evolution[i].value += ev.value),
          )
          consolidated.metrics.tarefas.concluidas += r.metrics.tarefas.concluidas
          consolidated.metrics.tarefas.pendentes += r.metrics.tarefas.pendentes
          consolidated.metrics.tarefas.atrasadas += r.metrics.tarefas.atrasadas
          consolidated.metrics.acidentes.total += r.metrics.acidentes.total
          consolidated.metrics.budget.orcado += r.metrics.budget.orcado
          consolidated.metrics.budget.realizado += r.metrics.budget.realizado
          consolidated.metrics.limpeza.concluidas += r.metrics.limpeza.concluidas
          consolidated.metrics.limpeza.pendentes += r.metrics.limpeza.pendentes
          consolidated.metrics.imoveis.ocupacao += r.metrics.imoveis.ocupacao
        })

        if (results.length > 0) {
          consolidated.metrics.terceiros.absenteismo /= results.length
          consolidated.metrics.terceiros.evolution.forEach((ev) => (ev.value /= results.length))
          consolidated.metrics.imoveis.ocupacao /= results.length
        }

        consolidated.rankings = {
          absenteismo: [...results]
            .map((r) => ({ plantName: r.plant.name, value: r.metrics.terceiros.absenteismo }))
            .sort((a, b) => a.value - b.value),
          budget: [...results]
            .map((r) => ({
              plantName: r.plant.name,
              value: (r.metrics.budget.realizado / (r.metrics.budget.orcado || 1)) * 100,
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
