import { Card, CardContent } from '@/components/ui/card'
import { Users, FileText, ClipboardCheck, XCircle, TrendingDown, Eye } from 'lucide-react'
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
                  ? 'Registros de ausências'
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
              Média Contratado
            </p>
            <p className="text-xl lg:text-2xl font-bold text-foreground mt-0.5">
              {metrics.contratado}
            </p>
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
          <div className="flex-1">
            <p className="text-[10px] lg:text-xs font-medium text-red-500 uppercase tracking-wider">
              {activeTab === 'colaboradores' ? 'Ausentes' : 'Indisponíveis'}
            </p>
            <p className="text-xl lg:text-2xl font-bold text-foreground mt-0.5">
              {metrics.ausente}
            </p>
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
