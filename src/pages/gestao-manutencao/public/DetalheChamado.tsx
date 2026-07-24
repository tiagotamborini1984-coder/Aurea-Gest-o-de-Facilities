import { useState, useEffect, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useClientColors } from '@/hooks/use-client-colors'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, MapPin, Calendar, Clock, Wrench, User } from 'lucide-react'
import { getReadableTextColor } from '@/lib/contrast-utils'

const BackgroundElements = () => (
  <>
    <div
      className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none scale-105"
      style={{
        backgroundImage:
          'url("https://img.usecurling.com/p/1920/1080?q=corn%20ethanol%20plant%20silo%20industrial&dpr=2")',
      }}
    />
    <div className="fixed inset-0 bg-gradient-to-br from-[#1f2937]/95 via-[#1f2937]/85 to-[#1e3a8a]/90 pointer-events-none" />
    <div className="fixed inset-0 bg-gradient-to-t from-[#1f2937]/95 via-transparent to-[#1f2937]/70 pointer-events-none" />
    <div className="fixed top-[-15%] left-[-10%] w-[500px] h-[500px] bg-[#1e3a8a]/20 rounded-full blur-[120px] pointer-events-none" />
    <div className="fixed bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-[#1e3a8a]/10 rounded-full blur-[120px] pointer-events-none" />
    <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40"></div>
  </>
)

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
    if (user?.id && user?.email && ticketId) {
      loadTicket(ticketId, user.id, user.email)
    }
  }, [user, ticketId])

  const loadTicket = async (id: string, userId: string, email: string) => {
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
      .or(`requester_id.eq.${userId},requester_email.eq.${email}`)
      .single()
    setTicket(data)
    setLoading(false)
  }

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#1f2937]">
        <BackgroundElements />
        <Loader2
          className="h-8 w-8 animate-spin z-10"
          style={{ color: colors.primary || '#3b82f6' }}
        />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans bg-[#1f2937] p-4">
        <BackgroundElements />
        <Card className="w-full max-w-md text-center shadow-xl border-slate-200 bg-white/95 backdrop-blur-sm z-10">
          <CardContent className="pt-10 pb-8">
            <h2 className="text-xl font-bold text-slate-900">Chamado não encontrado</h2>
            <Button
              className="mt-4 hover:opacity-90 transition-opacity focus:ring-2 focus:ring-offset-2"
              style={
                {
                  backgroundColor: colors.primary,
                  color: colors.primaryContrast,
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
    <div className="min-h-screen relative overflow-hidden font-sans bg-[#1f2937] text-slate-900">
      <BackgroundElements />
      <header
        className="bg-white/95 backdrop-blur-sm border-b-2 shadow-sm sticky top-0 z-20"
        style={{ borderBottomColor: colors.primary }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/m/${slug}/meus-chamados`)}
            className="focus:ring-2 focus:ring-offset-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <span className="font-mono font-bold text-sm text-slate-800">{ticket.ticket_number}</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-4 py-8 animate-fade-in-up space-y-4 z-10 relative">
        <Card className="shadow-md border-slate-200 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              {ticket.status && (
                <Badge
                  style={{
                    backgroundColor: ticket.status.color,
                    color: getReadableTextColor(ticket.status.color),
                  }}
                  className="font-medium"
                >
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
              <h3 className="text-sm font-semibold text-slate-500 mb-1">Descrição</h3>
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
              <InfoItem
                icon={<User className="h-4 w-4" />}
                label="Responsável"
                value={ticket.assignee ? ticket.assignee.name : 'Não atribuído'}
              />
              {ticket.planned_start && (
                <InfoItem
                  icon={<Clock className="h-4 w-4" />}
                  label="Data de Planejamento"
                  value={new Date(ticket.planned_start).toLocaleDateString('pt-BR', {
                    timeZone: 'UTC',
                  })}
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
          <Card className="shadow-md border-slate-200 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-slate-500 mb-3">Fotos anexadas</h3>
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
                      className="w-full h-24 object-cover rounded-md border border-slate-200 hover:opacity-80 transition"
                    />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {ticket.closure_notes && (
          <Card className="shadow-md border-slate-200 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-slate-500 mb-2">Notas de Fechamento</h3>
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
      <div className="text-slate-400 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  )
}
