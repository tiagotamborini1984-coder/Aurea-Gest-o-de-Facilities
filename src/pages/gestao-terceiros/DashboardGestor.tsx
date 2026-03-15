import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, Truck, Target, TrendingDown } from 'lucide-react'

export default function DashboardGestor() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Gestor</h2>
          <p className="text-muted-foreground mt-1">Visão geral da operação e KPIs de terceiros.</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Planta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Plantas</SelectItem>
              <SelectItem value="sp">Planta SP</SelectItem>
              <SelectItem value="rj">Planta RJ</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="today">
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Colaboradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-muted/30 p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Lançados (Média)</p>
                <p className="text-3xl font-bold mt-1">120</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Contratados</p>
                <p className="text-3xl font-bold mt-1">135</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-green-700">Presentes (Média)</p>
                <p className="text-3xl font-bold text-green-700 mt-1">115</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <p className="text-sm text-red-700">Absenteísmo</p>
                <p className="text-3xl font-bold text-red-700 mt-1 flex items-center justify-center gap-1">
                  14.8% <TrendingDown className="h-4 w-4" />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" /> Equipamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-muted/30 p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Lançados (Média)</p>
                <p className="text-3xl font-bold mt-1">45</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Contratados</p>
                <p className="text-3xl font-bold mt-1">50</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-blue-700">Disponíveis</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">42</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg text-center">
                <p className="text-sm text-amber-700">Indisponibilidade</p>
                <p className="text-3xl font-bold text-amber-700 mt-1">16%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Book de Metas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <span className="font-medium">Absenteísmo (Meta &lt; 4%)</span>
              <span className="text-red-600 font-bold">0% Atingimento (Atual: 14.8%)</span>
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <span className="font-medium">Disponibilidade de Equipamentos (Meta &gt; 90%)</span>
              <span className="text-amber-600 font-bold">84% Atingimento</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg border-primary/20 border">
              <span className="font-bold text-primary">Nota Geral</span>
              <span className="text-xl font-bold text-primary">42%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
