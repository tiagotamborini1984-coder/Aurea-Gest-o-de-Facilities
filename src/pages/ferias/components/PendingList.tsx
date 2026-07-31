import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useAuth } from '@/hooks/use-auth'
import { getVacations, approveVacation, rejectVacation, type Vacation } from '@/services/vacations'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function PendingList() {
  const { activeClient, profile } = useAppStore()
  const { user } = useAuth()
  const [pending, setPending] = useState<Vacation[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = profile?.role === 'Master' || profile?.role === 'Administrador'

  const loadPending = useCallback(async () => {
    if (!activeClient) return
    setLoading(true)
    try {
      const all = await getVacations(activeClient.id)
      setPending(all.filter((v) => v.status === 'scheduled'))
    } catch (e: any) {
      toast.error('Erro ao carregar: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [activeClient])

  useEffect(() => {
    loadPending()
  }, [loadPending])

  const handleApprove = async (id: string) => {
    if (!user) return
    try {
      await approveVacation(id, user.id)
      toast.success('Férias aprovadas!')
      loadPending()
    } catch (e: any) {
      toast.error('Erro: ' + e.message)
    }
  }

  const handleReject = async (id: string) => {
    try {
      await rejectVacation(id)
      toast.success('Férias rejeitadas.')
      loadPending()
    } catch (e: any) {
      toast.error('Erro: ' + e.message)
    }
  }

  if (!isAdmin) return null

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" />
          Solicitações Pendentes ({pending.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-gray-400 py-4">Carregando...</div>
        ) : pending.length === 0 ? (
          <div className="text-center text-gray-400 py-4">Nenhuma solicitação pendente.</div>
        ) : (
          <div className="space-y-3">
            {pending.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50/50"
              >
                <div>
                  <h4 className="font-semibold text-sm">{v.org_collaborators?.name || 'N/A'}</h4>
                  <p className="text-xs text-gray-500">
                    {format(parseISO(v.start_date), 'dd/MM/yyyy')} —{' '}
                    {format(parseISO(v.end_date), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleReject(v.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={() => handleApprove(v.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
