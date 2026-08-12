import { AlertTriangle, TrendingDown, TrendingUp, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { StudyAnalysis, ReallocationSuggestion } from '@/lib/forecast-analysis'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

const situationConfig: Record<string, { label: string; color: string; icon: typeof TrendingDown }> =
  {
    healthy: {
      label: 'Saudável',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      icon: CheckCircle2,
    },
    surplus: {
      label: 'Excedente',
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      icon: TrendingUp,
    },
    deficit: {
      label: 'Déficit',
      color: 'bg-amber-100 text-amber-700 border-amber-300',
      icon: AlertTriangle,
    },
    critical: {
      label: 'Crítico',
      color: 'bg-red-100 text-red-700 border-red-300',
      icon: TrendingDown,
    },
  }

interface ForecastStudySectionProps {
  studies: StudyAnalysis[]
  reallocations: ReallocationSuggestion[]
  acceptedReallocations: Set<string>
  onToggleReallocation: (id: string) => void
  isAdmin: boolean
}

export function ForecastStudySection({
  studies,
  reallocations,
  acceptedReallocations,
  onToggleReallocation,
  isAdmin,
}: ForecastStudySectionProps) {
  const hasCritical = studies.some((s) => s.situation === 'critical')

  return (
    <div className="space-y-4">
      {hasCritical && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-lg p-4 animate-fade-in">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-900 dark:text-red-200">
                Centros de custo com orçamento esgotado detectados
              </p>
              <p className="text-xs text-red-800 dark:text-red-300 mt-1">
                Recomenda-se análise de todos os centros de custo para identificar excedentes que
                possam ser remanejados para cobrir os déficits. Aceite as sugestões de remanejamento
                abaixo antes de aplicar a previsão.
              </p>
            </div>
          </div>
        </div>
      )}
      <div>
        <h3 className="text-base font-bold text-foreground mb-3">Estudo por Centro de Custo</h3>
        <ScrollArea className="max-h-[220px] rounded-md border">
          <div className="divide-y">
            {studies.map((s) => {
              const cfg = situationConfig[s.situation]
              const Icon = cfg.icon
              return (
                <div key={s.cost_center_id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={cn('h-4 w-4 shrink-0', cfg.color.split(' ')[1])} />
                      <span className="font-medium text-sm truncate">{s.cost_center_name}</span>
                    </div>
                    <Badge variant="outline" className={cn('shrink-0 text-xs', cfg.color)}>
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Orçado: </span>
                      <span className="font-mono font-medium">
                        {formatCurrency(s.total_budgeted)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Realizado: </span>
                      <span className="font-mono font-medium">
                        {formatCurrency(s.total_realized)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Saldo: </span>
                      <span
                        className={cn(
                          'font-mono font-medium',
                          s.total_remaining > 0 ? 'text-emerald-600' : 'text-red-600',
                        )}
                      >
                        {formatCurrency(s.total_remaining)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Excedente: </span>
                      <span className="font-mono font-medium text-blue-600">
                        {formatCurrency(s.total_surplus)}
                      </span>
                    </div>
                  </div>
                  {s.warnings.length > 0 && (
                    <div className="space-y-1">
                      {s.warnings.map((w, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400"
                        >
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {reallocations.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-foreground mb-3">Sugestões de Remanejamento</h3>
          <div className="space-y-2">
            {reallocations.map((r) => {
              const accepted = acceptedReallocations.has(r.id)
              return (
                <div
                  key={r.id}
                  className={cn(
                    'p-3 rounded-lg border transition-colors',
                    accepted
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300'
                      : 'bg-muted/30 border-border',
                  )}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm font-medium">{r.from_cost_center_name}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{r.to_cost_center_name}</span>
                    <Badge className="bg-brand-vividBlue text-white ml-auto">
                      {formatCurrency(r.amount)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{r.reason}</p>
                  {isAdmin ? (
                    <Button
                      size="sm"
                      variant={accepted ? 'default' : 'outline'}
                      onClick={() => onToggleReallocation(r.id)}
                      className={cn(accepted && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
                    >
                      {accepted ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Remanejamento Aceito
                        </>
                      ) : (
                        'Aceitar Remanejamento'
                      )}
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Apenas administradores podem aceitar remanejamentos.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
