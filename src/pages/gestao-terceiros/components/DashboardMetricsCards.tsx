import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Users,
  FileText,
  ClipboardCheck,
  XCircle,
  TrendingDown,
  Eye,
  Calendar,
  CalendarRange,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'

export default function DashboardMetricsCards({
  metrics,
  activeTab,
  logs = [],
  employees = [],
  equipment = [],
  selectedPlants = [],
  selectedCompanies = [],
}: any) {
  const [absentAuditView, setAbsentAuditView] = useState<'today' | 'period'>('today')

  const renderAuditButton = (metricType: 'presentes' | 'ausentes' | 'all') => {
    const typeFiltered = logs.filter(
      (l: any) => l.type === (activeTab === 'colaboradores' ? 'staff' : 'equipment'),
    )
    const plantFiltered =
      selectedPlants.length > 0
        ? typeFiltered.filter((l: any) => selectedPlants.includes(l.plant_id))
        : typeFiltered
    const companyFiltered = plantFiltered.filter((l: any) => {
      if (selectedCompanies.length === 0) return true
      if (activeTab === 'colaboradores') {
        const emp = employees.find((e: any) => e.id === l.reference_id)
        return emp && emp.company_id && selectedCompanies.includes(emp.company_id)
      }
      return true
    })
    // Se for auditoria de ausentes de colaboradores, utilizar os dados unificados do hook
    // que garantem correspondência idêntica entre o badge "Hoje: X", a média do card e a listagem.
    if (metricType === 'ausentes' && activeTab === 'colaboradores') {
      const todayList: any[] = metrics.todayAbsentsList || []
      const periodList: any[] = metrics.periodAbsentsList || []
      const currentList = absentAuditView === 'today' ? todayList : periodList
      const totalDays = metrics.validDatesCount || 1

      return (
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground mt-1 gap-1 -ml-2"
            >
              <Eye className="h-3 w-3" /> Ver Detalhes
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg flex flex-col p-0">
            <SheetHeader className="p-6 pb-3 border-b border-border/50 space-y-3">
              <div>
                <SheetTitle className="text-lg">Auditoria de Ausências</SheetTitle>
                <SheetDescription className="text-xs mt-1">
                  {absentAuditView === 'today' ? (
                    <>
                      Mostrando colaboradores ausentes em{' '}
                      <strong>
                        Hoje (
                        {metrics.todayDateStr
                          ? format(new Date(metrics.todayDateStr + 'T12:00:00Z'), 'dd/MM/yyyy')
                          : 'data atual'}
                        )
                      </strong>
                      : <strong>{todayList.length} pessoas</strong> (bate exatamente com o badge{' '}
                      <em>Hoje: {metrics.todayAusente}</em>).
                    </>
                  ) : (
                    <>
                      Mostrando total acumulado de ausências no período selecionado:{' '}
                      <strong>{periodList.length} ocorrências</strong> em{' '}
                      <strong>
                        {totalDays} {totalDays === 1 ? 'dia com logs' : 'dias com logs'}
                      </strong>{' '}
                      (média exibida no card: <strong>{metrics.ausente}</strong>).
                    </>
                  )}
                </SheetDescription>
              </div>

              {/* Botões para alternar entre "Hoje" e "Todo o Período" */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg w-fit">
                <Button
                  type="button"
                  size="sm"
                  variant={absentAuditView === 'today' ? 'default' : 'ghost'}
                  onClick={() => setAbsentAuditView('today')}
                  className="h-7 text-xs px-2.5 gap-1.5 shadow-none"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Hoje ({todayList.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={absentAuditView === 'period' ? 'default' : 'ghost'}
                  onClick={() => setAbsentAuditView('period')}
                  className="h-7 text-xs px-2.5 gap-1.5 shadow-none"
                >
                  <CalendarRange className="h-3.5 w-3.5" />
                  Todo o Período ({periodList.length})
                </Button>
              </div>
            </SheetHeader>
            <ScrollArea className="flex-1">
              <div className="p-6 pt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Planta / Empresa</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          {absentAuditView === 'today'
                            ? 'Nenhum colaborador ausente registrado hoje.'
                            : 'Nenhum colaborador ausente registrado no período.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentList.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-nowrap text-xs">
                            {format(new Date(item.date + 'T12:00:00Z'), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="font-medium text-xs">{item.refName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div>{item.plantName || '-'}</div>
                            {item.companyName && (
                              <div className="text-[10px] text-muted-foreground/80">
                                {item.companyName}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] whitespace-nowrap"
                              title={
                                item.type === 'implicit'
                                  ? 'Sem presença lançada no dia'
                                  : 'Ausência explícita lançada'
                              }
                            >
                              {item.type === 'implicit' ? 'Sem presença' : 'Ausente'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )
    }

    const finalLogs = companyFiltered
      .filter((l: any) => {
        if (metricType === 'presentes') return l.status === true
        if (metricType === 'ausentes') return l.status === false
        return true
      })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground mt-1 gap-1 -ml-2"
          >
            <Eye className="h-3 w-3" /> Ver Detalhes
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg flex flex-col p-0">
          <SheetHeader className="p-6 pb-2 border-b border-border/50">
            <SheetTitle>Auditoria de Logs</SheetTitle>
            <SheetDescription>
              {metricType === 'presentes'
                ? 'Registros de presenças'
                : metricType === 'ausentes'
                  ? 'Registros de indisponibilidade'
                  : 'Todos os registros'}{' '}
              ({finalLogs.length})
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="p-6 pt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>
                      {activeTab === 'colaboradores' ? 'Colaborador' : 'Equipamento'}
                    </TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finalLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    finalLogs.map((log: any) => {
                      const refName =
                        activeTab === 'colaboradores'
                          ? employees.find((e: any) => e.id === log.reference_id)?.name ||
                            'Desconhecido'
                          : equipment.find((e: any) => e.id === log.reference_id)?.name ||
                            'Desconhecido'
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(log.date + 'T12:00:00Z'), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">{refName}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                log.status
                                  ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                  : 'bg-red-500/10 text-red-600 border-red-500/20'
                              }
                            >
                              {log.status ? 'Presente' : 'Ausente'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4">
      <Card className="shadow-subtle border-border">
        <CardContent className="p-3 lg:p-4 flex items-center gap-3">
          <div className="bg-blue-500/10 p-2 lg:p-3 rounded-lg shrink-0 border border-blue-500/10">
            <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] lg:text-xs font-medium text-blue-500 uppercase tracking-wider">
              Média Lançada
            </p>
            <p className="text-xl lg:text-2xl font-bold text-foreground mt-0.5">
              {metrics.lancado}
            </p>
            {renderAuditButton('all')}
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-subtle border-border">
        <CardContent className="p-3 lg:p-4 flex items-center gap-3">
          <div className="bg-amber-500/10 p-2 lg:p-3 rounded-lg shrink-0 border border-amber-500/10">
            <ClipboardCheck className="h-4 w-4 lg:h-5 lg:w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] lg:text-xs font-medium text-amber-500 uppercase tracking-wider">
              {activeTab === 'colaboradores'
                ? 'Média Contratada'
                : 'Média Contratada de Equipamentos'}
            </p>
            <div className="flex items-baseline mt-0.5">
              <p className="text-xl lg:text-2xl font-bold text-foreground">{metrics.contratado}</p>
              {activeTab === 'equipamentos' && (
                <span className="text-[10px] lg:text-xs font-normal text-muted-foreground ml-1.5">
                  Equipamentos
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-subtle border-border">
        <CardContent className="p-3 lg:p-4 flex items-center gap-3">
          <div className="bg-green-500/10 p-2 lg:p-3 rounded-lg shrink-0 border border-green-500/10">
            <Users className="h-4 w-4 lg:h-5 lg:w-5 text-green-500" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] lg:text-xs font-medium text-green-500 uppercase tracking-wider">
              {activeTab === 'colaboradores' ? 'Presentes' : 'Disponíveis'}
            </p>
            <p className="text-xl lg:text-2xl font-bold text-foreground mt-0.5">
              {metrics.presente}
            </p>
            {renderAuditButton('presentes')}
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-subtle border-border">
        <CardContent className="p-3 lg:p-4 flex items-center gap-3">
          <div className="bg-red-500/10 p-2 lg:p-3 rounded-lg shrink-0 border border-red-500/10">
            <XCircle className="h-4 w-4 lg:h-5 lg:w-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] lg:text-xs font-medium text-red-500 uppercase tracking-wider truncate">
              {activeTab === 'colaboradores' ? 'Ausentes' : 'Indisponíveis'}
            </p>
            <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
              <p className="text-xl lg:text-2xl font-bold text-foreground">{metrics.ausente}</p>
              {activeTab === 'colaboradores' && metrics.todayAusente !== undefined && (
                <button
                  type="button"
                  onClick={() => setAbsentAuditView('today')}
                  className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 border border-red-500/20 whitespace-nowrap hover:bg-red-500/20 transition-colors cursor-pointer"
                  title="Clique para abrir detalhes de ausentes hoje (sem presença marcada no dia corrente)"
                >
                  Hoje: {metrics.todayAusente}
                </button>
              )}
            </div>
            {renderAuditButton('ausentes')}
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-subtle border-border col-span-2 md:col-span-1 xl:col-span-1">
        <CardContent className="p-3 lg:p-4 flex items-center gap-3 relative z-10">
          <div className="bg-orange-500/10 p-2 lg:p-3 rounded-lg shrink-0 border border-orange-500/10">
            <TrendingDown className="h-4 w-4 lg:h-5 lg:w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] lg:text-xs font-medium text-orange-500 uppercase tracking-wider">
              {activeTab === 'colaboradores' ? 'Absenteísmo' : 'Indisp.'}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl lg:text-2xl font-bold text-foreground mt-0.5">
                {Number(metrics.absenteismo).toFixed(1)}%
              </p>
              {metrics.excludedDaysCount > 0 && (
                <span
                  className="text-[10px] text-muted-foreground whitespace-nowrap"
                  title={`${metrics.excludedDaysCount} dias não úteis ou finais de semana desconsiderados`}
                >
                  (-{metrics.excludedDaysCount} dias)
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
