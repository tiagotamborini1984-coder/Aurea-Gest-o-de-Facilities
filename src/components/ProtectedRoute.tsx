import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Loader2, MailWarning } from 'lucide-react'
import { AutoLogout } from './AutoLogout'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const { toast } = useToast()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-vividBlue" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.email_confirmed_at) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-md w-full text-center space-y-6 animate-fade-in-up">
          <div className="bg-amber-100 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
            <MailWarning className="w-10 h-10 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Verifique seu E-mail</h2>
            <p className="text-sm text-gray-500">
              Para garantir a segurança da sua conta, é necessário validar o seu endereço de e-mail
              antes de acessar o sistema.
            </p>
            <p className="text-sm font-medium text-gray-700">
              Enviamos um link de confirmação para: <br />
              <span className="text-brand-vividBlue">{user.email}</span>
            </p>
          </div>
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <Button
              className="w-full bg-brand-vividBlue hover:bg-brand-vividBlue/90 text-white"
              onClick={async () => {
                const { error } = await supabase.auth.resend({ type: 'signup', email: user.email! })
                if (error) {
                  toast({ variant: 'destructive', title: 'Erro', description: error.message })
                } else {
                  toast({
                    title: 'E-mail enviado',
                    description: 'Verifique sua caixa de entrada e spam.',
                  })
                }
              }}
            >
              Reenviar E-mail de Confirmação
            </Button>
            <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut()}>
              Sair e Voltar ao Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <AutoLogout />
      <Outlet />
    </>
  )
}
