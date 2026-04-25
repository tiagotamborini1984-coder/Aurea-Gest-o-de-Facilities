import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCcw, Plus, Settings2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function PreventivasManutencao() {
  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <RefreshCcw className="h-8 w-8 text-brand-vividBlue" />
            Planos de Preventiva
          </h1>
          <p className="text-gray-500 mt-1">Configure o robô gerador automático de OS.</p>
        </div>
        <Button className="bg-brand-vividBlue">
          <Plus className="h-4 w-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-bold">Revisão Ar Condicionado</CardTitle>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-0">Ativo</Badge>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Periodicidade:</span>
              <span className="font-medium">Mensal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Ativo Alvo:</span>
              <span className="font-medium">Todos (HVAC)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Próx. Geração:</span>
              <span className="font-medium">01/Mai/2026</span>
            </div>
            <Button variant="outline" className="w-full mt-2">
              <Settings2 className="h-4 w-4 mr-2" />
              Configurar Escopo
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
