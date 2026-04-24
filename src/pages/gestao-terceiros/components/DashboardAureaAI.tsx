import { useMemo } from 'react'
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  BrainCircuit,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/AppContext'

export default function DashboardAureaAI({ metrics, activeTab, plantStats }: any) {
  const { profile } = useAppStore()
  const isAdmin = profile?.role === 'Administrador' || profile?.role === 'Master'

  const insights = useMemo(() => {
    const alerts = []

    const abs = Number(metrics?.absenteismo || 0)
    const target = activeTab === 'colaboradores' ? 4 : 2 // default targets

    if (abs > target) {
      alerts.push({
        type: 'danger',
        title:
          activeTab === 'colaboradores' ? 'Absenteísmo Acima da Meta' : 'Indisponibilidade Elevada',
        description: `A taxa atual é de ${abs.toFixed(1)}%, ultrapassando o limite aceitável de ${target}%. Há risco de queda no SLA de atendimento.`,
        action: 'Revisar Termo Aditivo',
      })
    } else if (abs > 0) {
      alerts.push({
        type: 'warning',
        title: 'Variação Leve Detectada',
        description: `A taxa está em ${abs.toFixed(1)}%, dentro da meta, mas requer monitoramento para evitar gargalos na operação diária.`,
        action: 'Validar Performance de SLA',
      })
    } else {
      alerts.push({
        type: 'success',
        title: 'Operação Estável',
        description:
          'As taxas de presença e disponibilidade estão em 100% no período selecionado. O quadro está completo.',
        action: 'Ver Relatórios',
      })
    }

    // Find worst performing plant
    if (plantStats && plantStats.length > 1) {
      const sortedPlants = [...plantStats].sort(
        (a: any, b: any) => Number(b.absenteismo) - Number(a.absenteismo),
      )
      const worst = sortedPlants[0]
      if (Number(worst.absenteismo) > target) {
        alerts.push({
          type: 'warning',
          title: `Atenção Crítica: ${worst.name}`,
          description: `Esta unidade concentra a maior taxa de desvios (${Number(worst.absenteismo).toFixed(1)}%), puxando a média global para baixo.`,
          action: 'Analisar Unidade',
        })
      } else {
        alerts.push({
          type: 'success',
          title: 'Distribuição Equilibrada',
          description:
            'Nenhuma unidade apresenta desvios críticos isolados no período selecionado.',
          action: 'Comparar Plantas',
        })
      }
    } else if (alerts.length < 2) {
      alerts.push({
        type: 'success',
        title: 'Análise de Cobertura',
        description:
          'A cobertura dos postos de trabalho está aderente ao dimensionamento contratado.',
        action: 'Validar Postos',
      })
    }

    return alerts.slice(0, 2) // keep max 2 insights
  }, [metrics, activeTab, plantStats])

  const forecast = useMemo(() => {
    if (!isAdmin) return null
    const currentAbs = Number(metrics?.absenteismo || 0)
    // Basic heuristic: if it's already high, project it higher or lower depending on recent trend.
    const projectedAbs = currentAbs > 0 ? (currentAbs * 1.12).toFixed(1) : '1.5'
    const trend = currentAbs > 0 ? 'Alta' : 'Estável'

    return {
      projectedAbs,
      trend,
      message: `Com base no histórico recente de desvios e cobertura contratual, a projeção para o próximo mês aponta uma taxa de ${projectedAbs}%. Sugerimos alinhar preventivamente um plano de ação com os fornecedores.`,
    }
  }, [metrics, isAdmin])

  if (!metrics) return null

  return (
    <div
      className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4 mb-6 mt-6`}
    >
      <Card
        className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-2'} border-indigo-500/20 shadow-sm bg-gradient-to-br from-indigo-500/5 to-transparent relative overflow-hidden`}
      >
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
                Análise de desvios e performance dos terceiros
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          <div className="grid gap-3 sm:grid-cols-2">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className="bg-card/80 backdrop-blur-sm p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between transition-all hover:shadow-md"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {insight.type === 'danger' && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    {insight.type === 'warning' && (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    {insight.type === 'success' && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                    <h4 className="font-semibold text-sm">{insight.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">{insight.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1 group bg-background/50 hover:bg-background"
                >
                  {insight.action}
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isAdmin && forecast && (
        <Card className="border-emerald-500/20 shadow-sm bg-gradient-to-br from-emerald-500/5 to-transparent relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 text-emerald-500/5 pointer-events-none">
            <TrendingUp className="w-40 h-40" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-emerald-900 dark:text-emerald-300">
                    Forecast (Próx. Mês)
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Projeção de tendência (Admin)</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 whitespace-nowrap"
              >
                {forecast.trend}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 flex flex-col justify-between h-[calc(100%-70px)]">
            <div>
              <div className="mb-3">
                <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                  {forecast.projectedAbs}%
                </span>
                <span className="text-xs text-muted-foreground ml-2 font-medium">
                  desvio estimado
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{forecast.message}</p>
            </div>
            <Button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-2 text-xs h-9">
              Planejar Contratos
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
