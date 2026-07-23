import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Wrench, LogOut, ChevronRight } from 'lucide-react'

export default function MeusChamadosPublico() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/m/${slug}/entrar`, { replace: true })
    }
  }, [authLoading, user, slug, navigate])

  useEffect(() => {
    if (user?.email) {
      ensureRequesterRecord(user)
      loadTickets(user.email)
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

  const loadTickets = async (email: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('maintenance_tickets')
      .select(
        `id, ticket_number, description, created_at, photos,
        status:maintenance_statuses(id, name, color, step),
        area:maintenance_areas(name),
        plant:plants(name)`,
      )
      .eq('requester_email', email)
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-vividBlue" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-20 border-brand-vividBlue">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-brand-vividBlue">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base text-slate-900">Meus Chamados</h1>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4 py-8 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Solicitações</h2>
          <Button
            className="bg-brand-vividBlue"
            onClick={() => navigate(`/m/${slug}/nova-solicitacao`)}
          >
            <Plus className="h-4 w-4 mr-2" /> Nova Solicitação
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-vividBlue" />
          </div>
        ) : tickets.length === 0 ? (
          <Card className="shadow-md">
            <CardContent className="pt-10 pb-10 text-center">
              <p className="text-slate-500 mb-4">Você ainda não possui solicitações.</p>
              <Button
                className="bg-brand-vividBlue"
                onClick={() => navigate(`/m/${slug}/nova-solicitacao`)}
              >
                Criar primeira solicitação
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Card
                key={t.id}
                className="shadow-sm hover:shadow-md transition cursor-pointer"
                onClick={() => navigate(`/m/${slug}/chamado/${t.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {t.ticket_number}
                      </span>
                      {t.status && (
                        <Badge
                          variant="outline"
                          style={{
                            backgroundColor: t.status.color,
                            color: '#fff',
                            borderColor: t.status.color,
                          }}
                          className="text-[10px] px-1.5"
                        >
                          {t.status.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-1">{t.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(t.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
