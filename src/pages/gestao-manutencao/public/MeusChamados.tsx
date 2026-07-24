import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useClientColors } from '@/hooks/use-client-colors'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Plus,
  Wrench,
  LogOut,
  ChevronRight,
  MapPin,
  Building2,
  Calendar,
  User,
  Clock,
} from 'lucide-react'
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

export default function MeusChamadosPublico() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { colors, client } = useClientColors(slug)
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/m/${slug}/entrar`, { replace: true })
    }
  }, [authLoading, user, slug, navigate])

  useEffect(() => {
    if (user?.id && user?.email) {
      ensureRequesterRecord(user)
      loadTickets(user.id, user.email)
    }
  }, [user])

  const ensureRequesterRecord = async (u: any) => {
    await supabase.from('requesters').upsert(
      {
        user_id: u.id,
        name: u.user_metadata?.name || u.email || '',
        email: u.email || '',
      },
      { onConflict: 'user_id' },
    )
  }

  const loadTickets = async (userId: string, email: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('maintenance_tickets')
      .select(
        `id, ticket_number, description, created_at, photos, planned_start,
        status:maintenance_statuses(id, name, color, step),
        area:maintenance_areas(name),
        plant:plants(name),
        assignee:profiles!maintenance_tickets_assignee_id_fkey(name)`,
      )
      .or(`requester_id.eq.${userId},requester_email.eq.${email}`)
      .order('created_at', { ascending: false })
    setTickets(data || [])
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate(`/m/${slug}/nova-solicitacao`)
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#1f2937]">
        <BackgroundElements />
        <Loader2
          className="h-8 w-8 animate-spin z-10"
          style={{ color: colors?.primary || '#3b82f6' }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden font-sans bg-[#1f2937]">
      <BackgroundElements />

      <header
        className="bg-white/95 backdrop-blur-sm border-b-2 shadow-sm sticky top-0 z-20"
        style={{ borderBottomColor: colors.primary }}
      >
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          {client?.logo_url ? (
            <img
              src={client.logo_url}
              alt={client.name}
              className="h-11 w-auto object-contain rounded"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Wrench className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base text-slate-900 truncate">Meus Chamados</h1>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="focus:ring-2 focus:ring-offset-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 py-8 animate-fade-in-up z-10 relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Solicitações</h2>
          <Button
            className="hover:opacity-90 transition-opacity shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1f2937]"
            style={
              {
                backgroundColor: colors.primary,
                color: colors.primaryContrast,
                '--tw-ring-color': colors.primary,
              } as React.CSSProperties
            }
            onClick={() => navigate(`/m/${slug}/nova-solicitacao`)}
          >
            <Plus className="h-4 w-4 mr-2" /> Abrir Novo
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.primary }} />
          </div>
        ) : tickets.length === 0 ? (
          <Card className="shadow-2xl border-slate-200 bg-white/95 backdrop-blur-sm">
            <CardContent className="pt-10 pb-10 text-center">
              <p className="text-slate-500 mb-4">Você ainda não possui solicitações.</p>
              <Button
                className="hover:opacity-90 transition-opacity shadow-md"
                style={{ backgroundColor: colors.primary, color: colors.primaryContrast }}
                onClick={() => navigate(`/m/${slug}/nova-solicitacao`)}
              >
                Abrir Primeiro Chamado
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((t) => (
              <Card
                key={t.id}
                className="shadow-xl hover:shadow-2xl transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 border-slate-200 bg-white/95 backdrop-blur-sm group"
                onClick={() => navigate(`/m/${slug}/chamado/${t.id}`)}
                style={{ '--tw-ring-color': colors.primary } as React.CSSProperties}
              >
                <div
                  className="h-1 w-full opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl"
                  style={{ backgroundColor: colors.primary }}
                />
                <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {t.ticket_number}
                      </span>
                      {t.status && (
                        <Badge
                          variant="outline"
                          style={{
                            backgroundColor: t.status.color,
                            color: getReadableTextColor(t.status.color),
                            borderColor: t.status.color,
                          }}
                          className="text-[10px] px-2 py-0 font-medium tracking-wide shadow-sm"
                        >
                          {t.status.name}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm sm:text-base text-slate-900 line-clamp-2 font-medium mb-3">
                      {t.description}
                    </p>

                    <div className="flex items-center gap-3 flex-wrap">
                      {t.plant && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" /> {t.plant.name}
                        </span>
                      )}
                      {t.area && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {t.area.name}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(t.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 flex-wrap">
                      {t.planned_start && (
                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-100">
                          <Clock className="h-3 w-3" />
                          Data de Planejamento:{' '}
                          {new Date(t.planned_start).toLocaleDateString('pt-BR', {
                            timeZone: 'UTC',
                          })}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-medium border border-emerald-100">
                        <User className="h-3 w-3" />
                        Executor: {t.assignee?.name || 'Não atribuído'}
                      </div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors flex-shrink-0">
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
