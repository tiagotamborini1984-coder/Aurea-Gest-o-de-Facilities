import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, MapPin } from 'lucide-react'

const TableHeader = ({ title, icon: Icon }: any) => (
  <CardHeader className="pb-2 lg:pb-3 border-b border-border/50 px-4 lg:px-5 shrink-0">
    <CardTitle className="text-sm lg:text-base font-semibold flex items-center gap-2 text-foreground/90">
      <Icon className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground/80" /> {title}
    </CardTitle>
  </CardHeader>
)

const TableCols = ({ isLocal }: any) => (
  <div className="px-4 lg:px-5 py-2 lg:py-3 grid grid-cols-12 gap-2 lg:gap-4 text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/30 shrink-0">
    <div className="col-span-4">{isLocal ? 'Local' : 'Planta'}</div>
    <div className="col-span-2 text-center" title="Média Presença">
      Pres.
    </div>
    <div className="col-span-2 text-center" title="Média Falta">
      Falta
    </div>
    <div className="col-span-2 text-center">Contrat.</div>
    <div className="col-span-2 text-right">Taxa</div>
  </div>
)

const TableRow = ({ item }: any) => (
  <div className="px-4 lg:px-5 py-2.5 lg:py-3 grid grid-cols-12 gap-2 lg:gap-4 items-center hover:bg-muted/50 transition-colors">
    <div
      className="col-span-4 font-semibold text-xs lg:text-sm text-foreground truncate"
      title={item.name}
    >
      {item.name}
    </div>
    <div className="col-span-2 flex justify-center">
      <span className="bg-green-500/10 text-green-600 border border-green-500/20 text-[10px] lg:text-xs font-bold px-1.5 lg:px-2 py-0.5 rounded">
        {item.presentes}
      </span>
    </div>
    <div className="col-span-2 flex justify-center">
      <span className="bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] lg:text-xs font-bold px-1.5 lg:px-2 py-0.5 rounded">
        {item.ausentes}
      </span>
    </div>
    <div className="col-span-2 flex justify-center">
      <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] lg:text-xs font-bold px-2 lg:px-3 py-0.5 rounded-full">
        {item.contratado}
      </span>
    </div>
    <div className="col-span-2 text-right">
      <div className="font-bold text-xs lg:text-sm text-foreground">
        {(item.absenteismo || 0).toFixed(1)}%
      </div>
    </div>
  </div>
)

export default function DashboardPlantSummary({ plantStats, locationStats }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <Card className="shadow-subtle border-border flex flex-col h-full bg-card">
        <TableHeader title="Resumo por Planta" icon={Building2} />
        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
          <TableCols isLocal={false} />
          <div className="divide-y divide-border/50 overflow-y-auto custom-scrollbar flex-1 min-h-[200px] max-h-[350px]">
            {plantStats.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground/80 text-xs lg:text-sm">
                Sem dados
              </div>
            ) : (
              plantStats.map((p: any) => <TableRow key={p.id} item={p} />)
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-subtle border-border flex flex-col h-full bg-card">
        <TableHeader title="Resumo por Local" icon={MapPin} />
        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
          <TableCols isLocal={true} />
          <div className="divide-y divide-border/50 overflow-y-auto custom-scrollbar flex-1 min-h-[200px] max-h-[350px]">
            {locationStats.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground/80 text-xs lg:text-sm">
                Sem dados
              </div>
            ) : (
              locationStats.map((l: any) => <TableRow key={l.id} item={l} />)
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
