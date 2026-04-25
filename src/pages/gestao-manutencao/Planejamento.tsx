import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarCheck, ChevronLeft, ChevronRight, GripHorizontal } from 'lucide-react'

export default function PlanejamentoManutencao() {
  const [days] = useState(['Segunda, 25', 'Terça, 26', 'Quarta, 27', 'Quinta, 28', 'Sexta, 29'])

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, day: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    console.log(`Dropped ticket ${id} on ${day}`)
    // would update state here
  }

  return (
    <div className="p-6 h-full flex flex-col animate-fade-in-up">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <CalendarCheck className="h-8 w-8 text-brand-vividBlue" />
            Agenda de Planejamento
          </h1>
          <p className="text-gray-500 mt-1">Arraste os chamados para agendar a execução.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium px-4">Esta Semana</span>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-6 h-full min-h-[500px]">
        {/* Backlog */}
        <div className="w-72 bg-gray-50 border rounded-xl p-4 flex flex-col">
          <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b">Aguardando Agenda</h3>
          <div className="space-y-3 overflow-y-auto">
            <Card
              draggable
              onDragStart={(e) => handleDragStart(e, '1')}
              className="cursor-move border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all"
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <GripHorizontal className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-bold text-gray-600">MAN-2026-0012</span>
                </div>
                <p className="text-sm">Vazamento no encanamento...</p>
                <div className="text-xs text-gray-500 mt-2">1.5h estimadas</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-5 gap-3">
          {days.map((day) => (
            <div
              key={day}
              className="bg-white border rounded-xl p-3 flex flex-col transition-colors hover:bg-gray-50/50"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              <h4 className="text-center font-medium text-gray-500 text-sm mb-3 pb-2 border-b">
                {day}
              </h4>
              <div className="flex-1 border-2 border-transparent hover:border-dashed hover:border-blue-300 rounded-lg p-1 transition-all">
                {day === 'Terça, 26' && (
                  <Card className="border-l-4 border-l-blue-500 shadow-sm bg-blue-50/50">
                    <CardContent className="p-3">
                      <span className="text-xs font-bold text-blue-700">MAN-2026-0013</span>
                      <p className="text-sm font-medium">Troca de filtro do Ar...</p>
                      <div className="text-xs text-gray-500 mt-1 flex justify-between">
                        <span>Carlos T.</span>
                        <span>09:00</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
