import { useMemo, useEffect, useState } from 'react'
import { Sparkles, AlertTriangle, CheckCircle2, BrainCircuit } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'

export default function DashboardAureaAI({ metrics, activeTab, plantStats }: any) {
  const [worstFunction, setWorstFunction] = useState<string>('')

  const locationStats = metrics?.locationStats || []
  const collabStats = metrics?.collaboratorStats || []

  const worstCollab = useMemo(() => {
    if (collabStats.length > 0) {
      const sortedCollabs = [...collabStats].sort(
        (a: any, b: any) => Number(b.faltas) - Number(a.faltas),
      )
      return sortedCollabs[0]
    }
    return null
  }, [collabStats])

  useEffect(() => {
    if (worstCollab?.function_id) {
      supabase
        .from('functions')
        .select('name')
        .eq('id', worstCollab.function_id)
        .single()
        .then(({ data }) => {
          if (data) setWorstFunction(data.name)
        })
    }
  }, [worstCollab?.function_id])

  const insights = useMemo(() => {
    const alerts = []

    const abs = Number(metrics?.absenteismo || 0)
    const target = activeTab === 'colaboradores' ? 4 : 2 // default targets

    // 1. Visão Geral de Absenteísmo
    if (abs > target) {
      alerts.push({
        type: 'danger',
        title:
          activeTab === 'colaboradores' ? 'Absenteísmo Acima da Meta' : 'Indisponibilidade Elevada',
        description: `A taxa atual é de ${abs.toFixed(1)}%, ultrapassando o limite aceitável de ${target}%. Há impacto direto no dimensionamento e na qualidade da operação.`,
      })
    } else if (abs > 0) {
      alerts.push({
        type: 'warning',
        title: 'Variação Leve Detectada',
        description: `A taxa está em ${abs.toFixed(1)}%, dentro da meta, mas requer monitoramento contínuo para não comprometer a cobertura dos postos.`,
      })
    } else {
      alerts.push({
        type: 'success',
        title: 'Operação Estável',
        description:
          'A cobertura dos postos de trabalho está 100% aderente ao dimensionamento contratado no período selecionado.',
      })
    }

    if (activeTab === 'colaboradores') {
      // 2. Análise de Locais Críticos
      if (locationStats.length > 0) {
        const sortedLocations = [...locationStats].sort(
          (a: any, b: any) => Number(b.absenteismo) - Number(a.absenteismo),
        )
        const worstLocation = sortedLocations[0]
        if (Number(worstLocation.absenteismo) > target) {
          alerts.push({
            type: 'warning',
            title: `Atenção: Local Crítico`,
            description: `O local "${worstLocation.name}" apresenta a maior taxa de desvio (${Number(worstLocation.absenteismo).toFixed(1)}%), sendo o principal ofensor do indicador geral.`,
          })
        }
      } else if (plantStats && plantStats.length > 0) {
        const sortedPlants = [...plantStats].sort(
          (a: any, b: any) => Number(b.absenteismo) - Number(a.absenteismo),
        )
        const worst = sortedPlants[0]
        if (Number(worst.absenteismo) > target) {
          alerts.push({
            type: 'warning',
            title: `Atenção: Unidade ${worst.name}`,
            description: `Esta unidade concentra a maior taxa de desvios (${Number(worst.absenteismo).toFixed(1)}%), puxando a média global para baixo.`,
          })
        }
      }

      // 3. Análise de Funções / Colaboradores
      if (worstCollab && Number(worstCollab.faltas) > 0) {
        const functionText = worstFunction ? `na função de ${worstFunction}` : 'nesta função'
        alerts.push({
          type: 'warning',
          title: 'Impacto por Funções/Efetivo',
          description: `Identificamos desvios significativos ${functionText}. O colaborador ${worstCollab.name}, por exemplo, acumula ${worstCollab.faltas} faltas, prejudicando a performance do indicador.`,
        })
      }
    }

    return alerts.slice(0, 3)
  }, [metrics, activeTab, plantStats, locationStats, worstCollab, worstFunction])

  if (!metrics) return null

  return (
    <div className="grid grid-cols-1 gap-4 mb-6 mt-6">
      <Card className="border-indigo-500/20 shadow-sm bg-gradient-to-br from-indigo-500/5 to-transparent relative overflow-hidden">
        <div className="absolute -right-10 -top-10 text-indigo-500/5 pointer-events-none">
          <BrainCircuit className="w-48 h-48" />
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-indigo-900 dark:text-indigo-300">
                Aurea AI Insights
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Análise diagnóstica de absenteísmo e performance dos terceiros
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-3">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className="bg-card/80 backdrop-blur-sm p-4 rounded-xl border border-border shadow-sm flex flex-col transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-2 mb-2">
                  {insight.type === 'danger' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  {insight.type === 'warning' && (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  {insight.type === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                  <h4 className="font-semibold text-sm">{insight.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {insight.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
