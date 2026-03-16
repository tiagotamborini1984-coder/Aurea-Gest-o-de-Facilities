import { Card, CardContent } from '@/components/ui/card'
import { Users, FileText, ClipboardCheck, XCircle, TrendingDown } from 'lucide-react'

export default function DashboardMetricsCards({ metrics, activeTab }: any) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4">
      <Card className="shadow-subtle border-border">
        <CardContent className="p-3 lg:p-4 flex items-center gap-3">
          <div className="bg-blue-500/10 p-2 lg:p-3 rounded-lg shrink-0 border border-blue-500/10">
            <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] lg:text-xs font-medium text-blue-500 uppercase tracking-wider">
              Média Lançada
            </p>
            <p className="text-xl lg:text-2xl font-bold text-foreground mt-0.5">
              {metrics.lancado}
            </p>
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
          <div>
            <p className="text-[10px] lg:text-xs font-medium text-green-500 uppercase tracking-wider">
              {activeTab === 'colaboradores' ? 'Presentes' : 'Disponíveis'}
            </p>
            <p className="text-xl lg:text-2xl font-bold text-foreground mt-0.5">
              {metrics.presente}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-subtle border-border">
        <CardContent className="p-3 lg:p-4 flex items-center gap-3">
          <div className="bg-red-500/10 p-2 lg:p-3 rounded-lg shrink-0 border border-red-500/10">
            <XCircle className="h-4 w-4 lg:h-5 lg:w-5 text-red-500" />
          </div>
          <div>
            <p className="text-[10px] lg:text-xs font-medium text-red-500 uppercase tracking-wider">
              {activeTab === 'colaboradores' ? 'Ausentes' : 'Indisponíveis'}
            </p>
            <p className="text-xl lg:text-2xl font-bold text-foreground mt-0.5">
              {metrics.ausente}
            </p>
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
            <p className="text-xl lg:text-2xl font-bold text-foreground mt-0.5">
              {Number(metrics.absenteismo).toFixed(1)}%
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
