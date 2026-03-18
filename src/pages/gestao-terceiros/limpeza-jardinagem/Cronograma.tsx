import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Leaf } from 'lucide-react'
import { PlanejamentoTab } from './components/PlanejamentoTab'
import { ExecucaoTab } from './components/ExecucaoTab'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'
import { useAppStore } from '@/store/AppContext'

export default function Cronograma() {
  const [activeTab, setActiveTab] = useState('planejamento')
  const { profile } = useAppStore()
  const hasAccess = useHasAccess('Limpeza e Jardinagem')

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-fade-in print:p-0 print:m-0 print:space-y-2">
      <div className="flex items-center gap-3 print:hidden">
        <div className="bg-brand-deepBlue/10 p-2.5 rounded-xl border border-brand-deepBlue/20 shadow-sm">
          <Leaf className="h-6 w-6 text-brand-deepBlue" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Cronograma Operacional
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Planejamento interativo semanal e registro de execuções.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="print:block">
        <TabsList className="bg-white border border-gray-200 print:hidden h-12">
          <TabsTrigger
            value="planejamento"
            className="text-base font-semibold data-[state=active]:bg-brand-deepBlue data-[state=active]:text-white text-slate-600 px-6 py-2"
          >
            Planejamento Interativo
          </TabsTrigger>
          <TabsTrigger
            value="execucao"
            className="text-base font-semibold data-[state=active]:bg-brand-deepBlue data-[state=active]:text-white text-slate-600 px-6 py-2"
          >
            Lançamento de Execução
          </TabsTrigger>
        </TabsList>
        <TabsContent value="planejamento" className="mt-6 print:m-0">
          <PlanejamentoTab />
        </TabsContent>
        <TabsContent value="execucao" className="mt-6 print:m-0">
          <ExecucaoTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
