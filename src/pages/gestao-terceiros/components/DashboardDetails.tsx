import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Users, Wrench, ChevronRight, TrendingDown } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const HistoryPills = ({ history }: { history: any[] }) => (
  <div className="px-5 lg:px-6 py-4 bg-muted/20 border-t border-border/50 shadow-inner">
    <h4 className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase mb-2.5 flex items-center gap-1.5">
      <TrendingDown className="w-3.5 h-3.5" /> Histórico
    </h4>
    <div className="flex flex-wrap gap-2">
      {history.length === 0 ? (
        <span className="text-xs text-muted-foreground/80">Sem lançamentos.</span>
      ) : (
        history.map((day: any, idx: number) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-center bg-background py-1 px-2 border border-border rounded shadow-sm min-w-[50px]"
          >
            <span className="text-[9px] text-muted-foreground/80 font-medium mb-0.5">
              {format(new Date(day.date + 'T12:00:00Z'), 'dd/MM')}
            </span>
            <div
              className={cn('w-2 h-2 rounded-full', day.status ? 'bg-green-500' : 'bg-red-500')}
            />
          </div>
        ))
      )}
    </div>
  </div>
)

export default function DashboardDetails({ activeTab, equipmentStats, collaboratorStats }: any) {
  if (activeTab === 'metas') return null
  const isEq = activeTab === 'equipamentos'
  const title = isEq ? 'Por Equipamento' : 'Por Colaborador'
  const Icon = isEq ? Wrench : Users
  const data = isEq ? equipmentStats : collaboratorStats

  return (
    <Card className="shadow-subtle border-border bg-card animate-in fade-in slide-in-from-bottom-4">
      <CardHeader className="pb-2 lg:pb-3 border-b border-border/50 px-4 lg:px-5">
        <CardTitle className="text-sm lg:text-base font-semibold flex items-center gap-2 text-foreground/90">
          <Icon className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground/80" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-4 lg:px-5 py-2.5 grid grid-cols-12 gap-2 lg:gap-4 text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/30">
          <div className="col-span-5 lg:col-span-6">
            {isEq ? 'Equipamento' : 'Colaborador / Local'}
          </div>
          <div className="col-span-3 text-center">{isEq ? 'Contratado' : 'Presenças'}</div>
          <div className="col-span-2 text-center">{isEq ? 'Presença / Falta' : 'Faltas'}</div>
          <div className="col-span-2 lg:col-span-1 text-right">{isEq ? 'Disp.' : 'Taxa'}</div>
        </div>
        <div className="divide-y divide-border/50 max-h-[400px] overflow-y-auto custom-scrollbar">
          {data.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground/80 text-xs lg:text-sm">
              Sem dados neste período.
            </div>
          ) : (
            data.map((item: any) => {
              const total = !isEq ? item.presencas + item.faltas : 0
              const taxa = !isEq ? (total > 0 ? (item.presencas / total) * 100 : 0) : item.taxaDisp
              return (
                <Collapsible key={item.id}>
                  <CollapsibleTrigger className="w-full group focus-visible:outline-none">
                    <div className="px-4 lg:px-5 py-3 grid grid-cols-12 gap-2 lg:gap-4 items-center group-hover:bg-muted/50 transition-colors cursor-pointer text-left">
                      <div className="col-span-5 lg:col-span-6 font-semibold text-xs lg:text-sm text-foreground flex items-center gap-1.5 lg:gap-2">
                        <ChevronRight className="w-3.5 h-3.5 group-data-[state=open]:rotate-90 transition-transform shrink-0" />
                        <div className="truncate">
                          <div title={item.name}>{item.name}</div>
                          {!isEq && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {item.location}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-span-3 text-center">
                        {isEq ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-600 border-amber-500/20"
                          >
                            {item.contratado}
                          </Badge>
                        ) : (
                          <span className="text-green-600 font-bold">{item.presencas}</span>
                        )}
                      </div>
                      <div className="col-span-2 text-center">
                        {isEq ? (
                          <div className="flex gap-2 justify-center">
                            <span className="text-green-600">{item.mediaPresenca.toFixed(1)}</span>{' '}
                            / <span className="text-red-600">{item.mediaFalta.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-red-600 font-bold">{item.faltas}</span>
                        )}
                      </div>
                      <div className="col-span-2 lg:col-span-1 text-right font-bold text-xs lg:text-sm">
                        {taxa.toFixed(0)}%
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <HistoryPills history={item.history} />
                  </CollapsibleContent>
                </Collapsible>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
