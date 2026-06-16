import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface TrainingStatusCellProps {
  employeeName: string
  statusData: {
    status: 'Apto' | 'Inapto' | 'Isento' | string
    details: any[]
  }
}

export function TrainingStatusCell({ employeeName, statusData }: TrainingStatusCellProps) {
  const { status, details } = statusData

  if (status === 'Isento') {
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
        <MinusCircle className="w-3 h-3 mr-1" />
        Isento
      </Badge>
    )
  }

  const isApto = status === 'Apto'

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="inline-flex cursor-pointer">
          <Badge
            variant="outline"
            className={cn(
              isApto
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100',
            )}
          >
            {isApto ? (
              <CheckCircle2 className="w-3 h-3 mr-1" />
            ) : (
              <XCircle className="w-3 h-3 mr-1" />
            )}
            {status}
          </Badge>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="center">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{employeeName}</h4>
          <div className="text-xs text-muted-foreground mb-2">
            Status de Treinamentos Obrigatórios:
          </div>
          {details.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum treinamento obrigatório.</p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {details.map((d, i) => (
                <div
                  key={i}
                  className="flex justify-between items-start border-b pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{d.training_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {d.status === 'Pendente' && 'Não realizado'}
                      {d.status === 'Vencido' && 'Vencido'}
                      {d.status === 'Concluído' &&
                        `Válido até ${formatDate(d.completion_date, d.validity_months)}`}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1 py-0 h-4',
                      d.status === 'Concluído' &&
                        'bg-emerald-50 text-emerald-600 border-emerald-200',
                      d.status === 'Vencido' && 'bg-rose-50 text-rose-600 border-rose-200',
                      d.status === 'Pendente' && 'bg-amber-50 text-amber-600 border-amber-200',
                    )}
                  >
                    {d.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

function formatDate(completionDateStr: string, validityMonths: number) {
  if (!completionDateStr) return 'N/A'
  if (!validityMonths) return 'Vitalício'

  const d = new Date(completionDateStr)
  d.setMonth(d.getMonth() + validityMonths)
  return format(d, 'dd/MM/yyyy')
}
