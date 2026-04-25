import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Database } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function CadastrosManutencao() {
  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Database className="h-8 w-8 text-brand-vividBlue" />
          Cadastros Base - Manutenção
        </h1>
        <p className="text-gray-500 mt-1">Configure as entidades e ativos para o CMMS.</p>
      </div>

      <Tabs defaultValue="ativos" className="w-full">
        <TabsList className="bg-white border rounded-lg h-auto p-1 shadow-sm">
          <TabsTrigger value="ativos" className="py-2.5">
            Equipamentos/Ativos
          </TabsTrigger>
          <TabsTrigger value="locais" className="py-2.5">
            Sub-locais
          </TabsTrigger>
          <TabsTrigger value="tipos" className="py-2.5">
            Tipos de Manutenção
          </TabsTrigger>
          <TabsTrigger value="status" className="py-2.5">
            Fluxo de Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ativos" className="mt-6">
          <Card className="shadow-sm">
            <CardContent className="p-16 text-center text-gray-500 border-2 border-dashed m-4 rounded-xl">
              Gerenciamento da árvore de ativos virá aqui...
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
