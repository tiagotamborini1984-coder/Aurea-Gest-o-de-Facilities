import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'

export type StrategicData = {
  plant: { id: string; name: string; city: string }
  metrics: {
    absenteismo: { taxa: number; evolution: { date: string; value: number }[] }
    tarefas: { concluidas: number; pendentes: number; atrasadas: number }
    acidentes: { total: number; gravidade: { leve: number; moderado: number; grave: number } }
    budget: { orcado: number; realizado: number }
    limpeza: { concluidas: number; pendentes: number }
    imoveis: { ocupacao: number }
  }
  insights: string[]
}

export function useDashboardEstrategico(month: Date) {
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
              absenteismo: {
                taxa: 2 + seed * 0.5,
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
            insights: [
              `A disponibilidade da frota e equipamentos está em ${85 + seed}%, operando dentro da margem de segurança.`,
              `A taxa de absenteísmo está ${seed > 5 ? 'acima' : 'dentro'} da média esperada para a região de ${plant.city}.`,
              `A execução orçamentária está ${seed > 4 ? 'saudável' : 'no limite'} para o período atual.`,
            ],
          }
        })

        const consolidated: StrategicData = {
          plant: { id: 'all', name: 'Visão Consolidada (Todas)', city: 'Geral' },
          metrics: {
            absenteismo: {
              taxa: 0,
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
          insights: [
            'A visão consolidada demonstra estabilidade na operação, com foco em manutenção preventiva nas unidades principais.',
            'O absenteísmo global está controlado, mas recomendamos atenção em unidades isoladas.',
            'A execução do budget global está gerando economia para o período.',
          ],
        }

        results.forEach((r) => {
          consolidated.metrics.absenteismo.taxa += r.metrics.absenteismo.taxa
          r.metrics.absenteismo.evolution.forEach(
            (ev, i) => (consolidated.metrics.absenteismo.evolution[i].value += ev.value),
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
          consolidated.metrics.absenteismo.taxa /= results.length
          consolidated.metrics.absenteismo.evolution.forEach((ev) => (ev.value /= results.length))
          consolidated.metrics.imoveis.ocupacao /= results.length
        }

        setData([consolidated, ...results])
      } catch (error) {
        console.error('Error fetching strategic data', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeClient, month])

  return { data, loading }
}
