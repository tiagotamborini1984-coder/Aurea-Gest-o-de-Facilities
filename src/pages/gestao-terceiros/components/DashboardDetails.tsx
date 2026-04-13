import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  Users,
  Wrench,
  ChevronRight,
  TrendingDown,
  Download,
  FileSpreadsheet,
  List,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { exportToCSV } from '@/lib/export'

const HistoryPills = ({ history, item, isEq }: { history: any[]; item: any; isEq: boolean }) => {
  const handleExportItem = () => {
    const rows = history.map((day: any) => ({
      Nome: item.name,
      Local: item.location || '-',
      Tipo: isEq ? 'Equipamento' : 'Colaborador',
      Data: format(new Date(day.date + 'T12:00:00Z'), 'dd/MM/yyyy'),
      Status: day.status ? (isEq ? 'Disponível' : 'Presente') : isEq ? 'Indisponível' : 'Falta',
    }))
    exportToCSV(
      `auditoria_${item.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`,
      rows,
    )
  }

  return (
    <div className="px-5 lg:px-6 py-4 bg-muted/20 border-t border-border/50 shadow-inner">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5" /> Detalhes (Logs de {item.name})
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportItem}
          className="h-6 text-[10px] gap-1.5 bg-background"
        >
          <FileSpreadsheet className="w-3 h-3" />
          Exportar Excel
        </Button>
      </div>
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
}

export default function DashboardDetails({ activeTab, equipmentStats, collaboratorStats }: any) {
  const isEq = activeTab === 'equipamentos'
  const title = isEq ? 'Por Equipamento' : 'Por Colaborador'
  const Icon = isEq ? Wrench : Users
  const data = isEq ? equipmentStats : collaboratorStats

  const allLogs = useMemo(() => {
    if (!data) return []
    return data
      .flatMap((item: any) => {
        if (!item.history) return []
        return item.history.map((day: any) => ({
          id: item.id,
          name: item.name,
          location: item.location || '-',
          date: day.date,
          status: day.status,
        }))
      })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [data])

  if (activeTab === 'metas') return null

  const handleExport = () => {
    if (!data || data.length === 0) return

    const rows = data.flatMap((item: any) => {
      const baseRow = {
        Nome: item.name,
        Local: item.location || '-',
        Tipo: isEq ? 'Equipamento' : 'Colaborador',
        'Presenças/Disp Totais': isEq ? item.mediaPresenca?.toFixed(1) : item.presencas,
        'Faltas/Indisp Totais': isEq ? item.mediaFalta?.toFixed(1) : item.faltas,
        'Taxa (%)': isEq
          ? item.taxaDisp?.toFixed(1)
          : ((item.presencas / (item.presencas + item.faltas || 1)) * 100).toFixed(1),
      }

      if (!item.history || item.history.length === 0) {
        return [{ ...baseRow, Data: '-', Status: '-' }]
      }

      return item.history.map((day: any) => ({
        ...baseRow,
        Data: format(new Date(day.date + 'T12:00:00Z'), 'dd/MM/yyyy'),
        Status: day.status ? (isEq ? 'Disponível' : 'Presente') : isEq ? 'Indisponível' : 'Falta',
      }))
    })

    const fileName = `auditoria_geral_${isEq ? 'equipamentos' : 'colaboradores'}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
    exportToCSV(fileName, rows)
  }

  return (
    <Card className="shadow-subtle border-border bg-card animate-in fade-in slide-in-from-bottom-4">
      <CardHeader className="pb-2 lg:pb-3 border-b border-border/50 px-4 lg:px-5 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm lg:text-base font-semibold flex items-center gap-2 text-foreground/90">
          <Icon className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground/80" /> {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm" className="h-8 gap-2 font-medium">
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ver Detalhes</span>
                <span className="sm:hidden">Detalhes</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0"
            >
              <SheetHeader className="p-4 sm:p-6 pb-4 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
                <div className="pr-8 sm:pr-0">
                  <SheetTitle className="flex items-center gap-2 text-left text-base sm:text-lg">
                    <TrendingDown className="w-5 h-5 text-primary shrink-0" />
                    Auditoria de Logs - {isEq ? 'Equipamentos' : 'Colaboradores'}
                  </SheetTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 text-left">
                    Lista bruta dos registros diários
                  </p>
                </div>
                <div className="w-full sm:w-auto flex sm:block mt-2 sm:mt-0 sm:pr-8">
                  <Button
                    onClick={() => {
                      if (!allLogs || allLogs.length === 0) return
                      const rows = allLogs.map((log: any) => {
                        const base: Record<string, string> = {
                          Data: format(new Date(log.date + 'T12:00:00Z'), 'dd/MM/yyyy'),
                          [isEq ? 'Equipamento' : 'Colaborador']: log.name,
                        }
                        if (!isEq) base['Local'] = log.location || '-'
                        base['Status'] = log.status
                          ? isEq
                            ? 'Disponível'
                            : 'Presente'
                          : isEq
                            ? 'Indisponível'
                            : 'Falta'
                        return base
                      })
                      exportToCSV(
                        `auditoria_logs_${isEq ? 'equipamentos' : 'colaboradores'}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`,
                        rows,
                      )
                    }}
                    className="w-full sm:w-auto gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Exportar para CSV</span>
                  </Button>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-muted/10">
                {allLogs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 bg-background rounded-lg border border-dashed">
                    Nenhum log encontrado para os filtros atuais.
                  </div>
                ) : (
                  <div className="border border-border/50 rounded-lg overflow-hidden bg-background shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b border-border/50">
                        <tr>
                          <th className="p-3 text-left font-medium text-muted-foreground">Data</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">
                            {isEq ? 'Equipamento' : 'Colaborador'}
                          </th>
                          {!isEq && (
                            <th className="p-3 text-left font-medium text-muted-foreground hidden sm:table-cell">
                              Local
                            </th>
                          )}
                          <th className="p-3 text-center font-medium text-muted-foreground">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {allLogs.map((log: any, idx: number) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 text-foreground font-medium">
                              {format(new Date(log.date + 'T12:00:00Z'), 'dd/MM/yyyy')}
                            </td>
                            <td className="p-3 text-foreground">{log.name}</td>
                            {!isEq && (
                              <td className="p-3 text-muted-foreground hidden sm:table-cell">
                                {log.location}
                              </td>
                            )}
                            <td className="p-3 text-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'uppercase text-[10px]',
                                  log.status
                                    ? 'bg-green-500/10 text-green-700 border-green-500/20'
                                    : 'bg-red-500/10 text-red-700 border-red-500/20',
                                )}
                              >
                                {log.status
                                  ? isEq
                                    ? 'Disp.'
                                    : 'Presente'
                                  : isEq
                                    ? 'Indisp.'
                                    : 'Falta'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Button variant="outline" size="sm" onClick={handleExport} className="h-8 gap-2">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar Excel</span>
            <span className="sm:hidden">Exportar</span>
          </Button>
        </div>
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
                    <HistoryPills history={item.history} item={item} isEq={isEq} />
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
