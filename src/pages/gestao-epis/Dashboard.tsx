import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PpeItemsTab } from './PpeItemsTab'
import { PpeLoansTab } from './PpeLoansTab'

export default function GestaoEPIs() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Gestão de EPIs</h1>
        <p className="text-slate-500 text-sm">
          Controle de estoque e empréstimos de Equipamentos de Proteção Individual
        </p>
      </div>
      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Inventário EPI</TabsTrigger>
          <TabsTrigger value="loans">Empréstimos</TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="mt-4">
          <PpeItemsTab />
        </TabsContent>
        <TabsContent value="loans" className="mt-4">
          <PpeLoansTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
