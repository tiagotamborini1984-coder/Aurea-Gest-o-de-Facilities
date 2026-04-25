import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Wrench, MapPin, Calendar, Clock, AlertCircle, Plus } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

export default function ChamadosManutencao() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const { user } = useAuth()

  const [form, setForm] = useState({ description: '', priority_id: '' })
  const [priorities, setPriorities] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [ticketsRes, prioRes] = await Promise.all([
      supabase
        .from('maintenance_tickets')
        .select(`
        *,
        priority:maintenance_priorities(id, name, color),
        status:maintenance_statuses(id, name, color, step),
        asset:maintenance_assets(name),
        location:locations(name),
        assignee:profiles!maintenance_tickets_assignee_id_fkey(name)
      `)
        .order('created_at', { ascending: false }),
      supabase.from('maintenance_priorities').select('*'),
    ])

    setTickets(ticketsRes.data || [])
    setPriorities(prioRes.data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user?.id)
        .single()
      if (!profile?.client_id) throw new Error('Cliente não encontrado')

      const { data: plant } = await supabase
        .from('plants')
        .select('id')
        .eq('client_id', profile.client_id)
        .limit(1)
        .single()
      if (!plant?.id) throw new Error('Planta não encontrada')

      const { data: status } = await supabase
        .from('maintenance_statuses')
        .select('id')
        .eq('client_id', profile.client_id)
        .order('order_index')
        .limit(1)
        .single()

      const year = new Date().getFullYear()
      const { data: latest } = await supabase
        .from('maintenance_tickets')
        .select('ticket_number')
        .eq('client_id', profile.client_id)
        .like('ticket_number', `MAN-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1)
      let seq = 1
      if (latest && latest.length > 0) {
        const p = latest[0].ticket_number.split('-')
        if (p.length === 3) seq = parseInt(p[2], 10) + 1
      }
      const ticketNumber = `MAN-${year}-${seq.toString().padStart(4, '0')}`

      const { error } = await supabase.from('maintenance_tickets').insert({
        client_id: profile.client_id,
        plant_id: plant.id,
        ticket_number: ticketNumber,
        description: form.description,
        priority_id: form.priority_id || null,
        status_id: status?.id || null,
        origin: 'Manual',
        requester_name: user?.email,
      })

      if (error) throw error
      toast.success('OS criada com sucesso!')
      setOpen(false)
      setForm({ description: '', priority_id: '' })
      loadData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando painel...</div>

  const columns = ['Aberto', 'Planejado', 'Em Execução', 'Concluído']

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

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button className="bg-brand-vividBlue">
              <Plus className="h-4 w-4 mr-2" />
              Nova O.S.
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Criar Nova Ordem de Serviço</SheetTitle>
            </SheetHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Descrição do Problema</Label>
                <Textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descreva o problema ou serviço necessário..."
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={form.priority_id}
                  onValueChange={(v) => setForm({ ...form, priority_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-brand-vividBlue">
                Salvar OS
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnTickets = tickets.filter(
            (t) => t.status?.step === column || (!t.status && column === 'Aberto'),
          )
          return (
            <div
              key={column}
              className="flex-none w-80 bg-gray-100 dark:bg-gray-800 rounded-xl p-3 flex flex-col h-full border border-gray-200 dark:border-gray-700"
            >
              <div className="font-semibold text-gray-700 dark:text-gray-300 mb-3 px-2 flex justify-between items-center">
                {column}
                <Badge variant="secondary" className="bg-gray-200">
                  {columnTickets.length}
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 px-1">
                {columnTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:border-brand-vividBlue/50 transition-colors shadow-sm"
                    onClick={() => toast.info(`Detalhes da OS ${ticket.ticket_number}`)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono font-bold text-gray-500">
                          {ticket.ticket_number}
                        </span>
                        {ticket.priority && (
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
                        )}
                      </div>
                      <p className="text-sm font-medium leading-snug line-clamp-2">
                        {ticket.description}
                      </p>
                      {(ticket.location || ticket.origin) && (
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-2">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">
                            {ticket.location?.name || `Origem: ${ticket.origin}`}
                          </span>
                        </div>
                      )}
                      {ticket.asset && (
                        <div className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded inline-block">
                          Ativo: {ticket.asset.name}
                        </div>
                      )}
                      <div className="pt-2 border-t mt-3 flex justify-between items-center">
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Clock className="h-3 w-3" />
                          {new Date(ticket.reported_at).toLocaleDateString()}
                        </div>
                        {ticket.assignee ? (
                          <Avatar className="h-6 w-6" title={ticket.assignee.name}>
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
                {columnTickets.length === 0 && (
                  <div className="h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-xs text-gray-400">
                    Nenhum chamado
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
