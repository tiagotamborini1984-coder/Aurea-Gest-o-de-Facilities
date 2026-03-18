import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Leaf } from 'lucide-react'
import { PlanejamentoTab } from './components/PlanejamentoTab'
import { ExecucaoTab } from './components/ExecucaoTab'

export default function Cronograma() {
  const [activeTab, setActiveTab] = useState('planejamento')

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="bg-brand-deepBlue/10 p-2.5 rounded-xl border border-brand-deepBlue/20 shadow-sm">
          <Leaf className="h-6 w-6 text-brand-deepBlue" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Cronograma Operacional
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Planejamento semanal e registro de execuções.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200">
          <TabsTrigger
            value="planejamento"
            className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600"
          >
            Planejamento
          </TabsTrigger>
          <TabsTrigger
            value="execucao"
            className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600"
          >
            Lançamento de Execução
          </TabsTrigger>
        </TabsList>
        <TabsContent value="planejamento" className="mt-6">
          <PlanejamentoTab />
        </TabsContent>
        <TabsContent value="execucao" className="mt-6">
          <ExecucaoTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
