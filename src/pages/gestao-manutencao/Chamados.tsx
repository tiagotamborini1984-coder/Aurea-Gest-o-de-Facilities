import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Wrench, MapPin, Calendar, Clock, AlertCircle } from 'lucide-react'

export default function ChamadosManutencao() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for the CMMS view
    setTickets([
      {
        id: '1',
        ticket_number: 'MAN-2026-0012',
        description: 'Vazamento no encanamento do banheiro masculino',
        location: 'Planta Principal - Banheiro Térreo',
        priority: { name: 'Alta', color: '#ef4444' },
        status: { name: 'Aberto', step: 'Aberto', color: '#f59e0b' },
        reported_at: new Date().toISOString(),
        origin: 'Portal',
      },
      {
        id: '2',
        ticket_number: 'MAN-2026-0013',
        description: 'Troca de filtro do Ar Condicionado',
        location: 'Planta Principal - Sala de Reunião',
        asset: 'AC-001',
        priority: { name: 'Média', color: '#f97316' },
        status: { name: 'Planejado', step: 'Planejado', color: '#3b82f6' },
        reported_at: new Date(Date.now() - 86400000).toISOString(),
        planned_date: new Date(Date.now() + 86400000).toISOString(),
        assignee: { name: 'Carlos Técnico' },
        origin: 'Preventiva',
      },
    ])
    setLoading(false)
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando painel...</div>

  return (
    <div className="p-6 h-full flex flex-col animate-fade-in-up">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Wrench className="h-8 w-8 text-brand-vividBlue" />
            Gestão de Chamados (OS)
          </h1>
          <p className="text-gray-500 mt-1">Kanban de Ordem de Serviço em tempo real.</p>
        </div>
        <Button className="bg-brand-vividBlue">Nova O.S.</Button>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {['Aberto', 'Planejado', 'Em Execução', 'Concluído'].map((column) => (
          <div
            key={column}
            className="flex-none w-80 bg-gray-100 dark:bg-gray-800 rounded-xl p-3 flex flex-col h-full border border-gray-200 dark:border-gray-700"
          >
            <div className="font-semibold text-gray-700 dark:text-gray-300 mb-3 px-2 flex justify-between items-center">
              {column}
              <Badge variant="secondary" className="bg-gray-200">
                {tickets.filter((t) => t.status.step === column).length}
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 px-1">
              {tickets
                .filter((t) => t.status.step === column)
                .map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:border-brand-vividBlue/50 transition-colors shadow-sm"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono font-bold text-gray-500">
                          {ticket.ticket_number}
                        </span>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: ticket.priority.color,
                            color: ticket.priority.color,
                          }}
                          className="text-[10px] px-1 h-5"
                        >
                          {ticket.priority.name}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium leading-snug line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-2">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{ticket.location}</span>
                      </div>
                      {ticket.asset && (
                        <div className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded inline-block">
                          Ativo: {ticket.asset}
                        </div>
                      )}
                      <div className="pt-2 border-t mt-3 flex justify-between items-center">
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Clock className="h-3 w-3" />
                          {new Date(ticket.reported_at).toLocaleDateString()}
                        </div>
                        {ticket.assignee ? (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                              {ticket.assignee.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Não atribuído</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              {tickets.filter((t) => t.status.step === column).length === 0 && (
                <div className="h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-xs text-gray-400">
                  Nenhum chamado
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
