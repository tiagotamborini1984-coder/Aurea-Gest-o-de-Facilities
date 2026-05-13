import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, Download, Presentation, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useDashboardEstrategico } from '@/hooks/use-dashboard-estrategico'
import { PlantMetrics } from './PlantMetrics'

export default function DashboardEstrategico() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [isExporting, setIsExporting] = useState(false)
  const { data, loading } = useDashboardEstrategico(selectedMonth)

  const handleExportPPTX = async () => {
    setIsExporting(true)
    toast.info('Gerando apresentação...', {
      description: 'Aguarde enquanto os slides são montados pela IA.',
    })

    // Simulate backend generation processing time
    await new Promise((resolve) => setTimeout(resolve, 2500))

    const blob = new Blob(['Mock PPTX content - requires backend pptx generation module'], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Apresentacao_Gerencial_${format(selectedMonth, 'MMM_yyyy')}.pptx`
    a.click()
    URL.revokeObjectURL(url)

    toast.success('Apresentação Gerada', { description: 'O download foi iniciado com sucesso.' })
    setIsExporting(false)
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Presentation className="h-8 w-8 text-brand-vividBlue" />
            Dashboard Estratégico
          </h1>
          <p className="text-gray-500 mt-1">
            Visão consolidada de todas as plantas com insights gerados por IA
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[240px] justify-start text-left font-normal bg-white border-gray-200',
                  !selectedMonth && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-brand-vividBlue" />
                {selectedMonth ? (
                  format(selectedMonth, 'MMMM yyyy', { locale: ptBR })
                ) : (
                  <span>Selecione o mês</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedMonth}
                onSelect={(d) => d && setSelectedMonth(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            onClick={handleExportPPTX}
            disabled={isExporting || loading || data.length === 0}
            className="bg-brand-vividBlue hover:bg-brand-vividBlue/90 shadow-md"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar PPTX
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-brand-vividBlue" />
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Presentation className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhuma planta encontrada</h3>
          <p className="text-gray-500">Cadastre plantas para visualizar o dashboard estratégico.</p>
        </div>
      ) : (
        <Tabs defaultValue={data[0]?.plant.id} className="space-y-6">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <TabsList className="bg-transparent h-auto p-0 inline-flex min-w-full gap-2">
              {data.map((item) => (
                <TabsTrigger
                  key={item.plant.id}
                  value={item.plant.id}
                  className="data-[state=active]:bg-brand-deepBlue data-[state=active]:text-white px-6 py-2.5 rounded-lg font-medium transition-all"
                >
                  {item.plant.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {data.map((item) => (
            <TabsContent
              key={item.plant.id}
              value={item.plant.id}
              className="mt-0 focus-visible:outline-none focus-visible:ring-0"
            >
              <PlantMetrics data={item} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
