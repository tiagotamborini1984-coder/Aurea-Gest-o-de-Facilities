import { useState, useEffect, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useClientColors } from '@/hooks/use-client-colors'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, MapPin, Calendar, Clock, Wrench, User } from 'lucide-react'

export default function DetalheChamadoPublico() {
  const { slug, ticketId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { colors } = useClientColors(slug)
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/m/${slug}/entrar`, { replace: true })
    }
  }, [authLoading, user, slug, navigate])

  useEffect(() => {
    if (user?.email && ticketId) {
      loadTicket(ticketId, user.email)
    }
  }, [user, ticketId])

  const loadTicket = async (id: string, email: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('maintenance_tickets')
      .select(
        `*,
        status:maintenance_statuses(id, name, color, step),
        area:maintenance_areas(name),
        plant:plants(name),
        priority:maintenance_priorities(name, color),
        type:maintenance_types(name, color),
        assignee:profiles!maintenance_tickets_assignee_id_fkey(name)`,
      )
      .eq('id', id)
      .eq('requester_email', email)
      .single()
    setTicket(data)
    setLoading(false)
  }

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.primary }} />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md text-center shadow-xl">
          <CardContent className="pt-10 pb-8">
            <h2 className="text-xl font-bold text-slate-900">Chamado não encontrado</h2>
            <Button
              className="mt-4 hover:opacity-90 transition-opacity focus:ring-2 focus:ring-offset-2"
              style={
                {
                  backgroundColor: colors.primary,
                  '--tw-ring-color': colors.primary,
                } as React.CSSProperties
              }
              onClick={() => navigate(`/m/${slug}/meus-chamados`)}
            >
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header
        className="bg-white border-b shadow-sm sticky top-0 z-20"
        style={{ borderBottomColor: colors.primary }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/m/${slug}/meus-chamados`)}
            className="focus:ring-2 focus:ring-offset-1"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <span className="font-mono font-bold text-sm text-slate-800">{ticket.ticket_number}</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-4 py-8 animate-fade-in-up space-y-4">
        <Card className="shadow-md">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              {ticket.status && (
                <Badge style={{ backgroundColor: ticket.status.color, color: '#fff' }}>
                  {ticket.status.name}
                </Badge>
              )}
              {ticket.type && (
                <Badge
                  variant="outline"
                  style={{ borderColor: ticket.type.color, color: ticket.type.color }}
                >
                  {ticket.type.name}
                </Badge>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-600 mb-1">Descrição</h3>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">{ticket.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              {ticket.plant && (
                <InfoItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Planta"
                  value={ticket.plant.name}
                />
              )}
              {ticket.area && (
                <InfoItem
                  icon={<Wrench className="h-4 w-4" />}
                  label="Área"
                  value={ticket.area.name}
                />
              )}
              <InfoItem
                icon={<Calendar className="h-4 w-4" />}
                label="Criado em"
                value={new Date(ticket.created_at).toLocaleString('pt-BR')}
              />
              {ticket.assignee && (
                <InfoItem
                  icon={<User className="h-4 w-4" />}
                  label="Responsável"
                  value={ticket.assignee.name}
                />
              )}
            </div>
            {ticket.priority && (
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-slate-600">Prioridade:</span>
                <Badge
                  variant="outline"
                  style={{ borderColor: ticket.priority.color, color: ticket.priority.color }}
                >
                  {ticket.priority.name}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
        {ticket.photos?.length > 0 && (
          <Card className="shadow-md">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-slate-600 mb-3">Fotos anexadas</h3>
              <div className="grid grid-cols-3 gap-2">
                {ticket.photos.map((url: string, i: number) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
                    style={{ '--tw-ring-color': colors.primary } as React.CSSProperties}
                  >
                    <img
                      src={url}
                      alt={`anexo ${i + 1}`}
                      className="w-full h-24 object-cover rounded-md border hover:opacity-80 transition"
                    />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {ticket.closure_notes && (
          <Card className="shadow-md">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-slate-600 mb-2">Notas de Fechamento</h3>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">{ticket.closure_notes}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-slate-500 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  )
}
