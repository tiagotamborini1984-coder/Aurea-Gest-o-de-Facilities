import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SubscriptionGuard() {
  const { user, signOut } = useAuth()
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkStatus() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, client_id')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'Master') {
          setStatus('Ativo')
        } else if (profile?.client_id) {
          const { data: client } = await supabase
            .from('clients')
            .select('status')
            .eq('id', profile.client_id)
            .single()

          setStatus(client?.status || 'Inativo')
        } else {
          setStatus('Inativo')
        }
      } catch (err) {
        console.error('Error verifying subscription:', err)
        setStatus('Inativo')
      } finally {
        setLoading(false)
      }
    }

    checkStatus()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin w-8 h-8 text-brand-vividBlue" />
      </div>
    )
  }

  if (status !== 'Ativo') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-6 animate-fade-in-up border border-slate-200">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Assinatura Bloqueada</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            O acesso ao sistema foi temporariamente suspenso para a sua empresa. Por favor,
            regularize o pagamento ou entre em contato com o suporte para reativar sua conta.
          </p>
          <div className="pt-4 space-y-3">
            <Button
              className="w-full bg-brand-vividBlue hover:bg-brand-vividBlue/90 text-white"
              onClick={() => (window.location.href = 'mailto:suporte@aurea.com')}
            >
              Contatar Suporte
            </Button>
            <Button variant="outline" className="w-full" onClick={() => signOut()}>
              Sair da Conta
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <Outlet />
}
