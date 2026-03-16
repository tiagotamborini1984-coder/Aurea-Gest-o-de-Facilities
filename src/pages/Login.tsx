import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Loader2, Fingerprint, ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

type ViewState = 'login' | 'recovery' | 'update_password'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [view, setView] = useState<ViewState>('login')

  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    const checkUser = async () => {
      if (user && view !== 'update_password') {
        const { data } = await supabase
          .from('profiles')
          .select('force_password_change')
          .eq('id', user.id)
          .single()

        if (data?.force_password_change) {
          setView('update_password')
        } else {
          navigate('/gestao-terceiros', { replace: true })
        }
      }
    }
    checkUser()
  }, [user, navigate, view])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const { error } = await signIn(email, password)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Acesso Negado',
        description: 'Credenciais inválidas ou não autorizadas.',
      })
      setIsSubmitting(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      toast({ variant: 'destructive', title: 'Erro de Autenticação', description: error.message })
      setIsSubmitting(false)
      return
    }

    if (user) {
      await supabase.from('profiles').update({ force_password_change: false }).eq('id', user.id)
    }

    toast({
      title: 'Acesso Atualizado',
      description: 'Sua credencial foi reconfigurada com sucesso.',
      className: 'bg-brand-deepBlue text-white border-brand-deepBlue/50 backdrop-blur-md',
    })
    navigate('/gestao-terceiros', { replace: true })
  }

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Informe seu e-mail para recuperação.',
      })
      return
    }

    setIsSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    setIsSubmitting(false)

    if (error) {
      toast({ variant: 'destructive', title: 'Erro na Recuperação', description: error.message })
    } else {
      toast({
        title: 'E-mail Enviado',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
        className: 'bg-green-600 text-white border-green-700',
      })
      setView('login')
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#1f2937] relative overflow-hidden font-sans">
      {/* High-tech backdrop with Deep Blue and Graphite aesthetics */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-[#1e3a8a]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-[#1e3a8a]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40"></div>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 animate-fade-in-up">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-light tracking-[0.2em] text-white drop-shadow-sm uppercase">
              Gestão de <br />
              <span className="font-bold text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                Facilities
              </span>
            </h1>
            <p className="text-[#60a5fa]/80 text-xs tracking-widest font-medium uppercase mt-4">
              System Authentication
            </p>
          </div>

          <Card className="border-white/10 bg-[#1f2937]/80 backdrop-blur-xl shadow-2xl">
            <CardContent className="pt-8">
              {view === 'login' && (
                <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-gray-300 uppercase text-[10px] tracking-wider"
                    >
                      Identificação (E-mail)
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-[#60a5fa]/70" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@aurea.com"
                        className="pl-9 h-11 bg-black/20 border-white/10 focus-visible:ring-[#1e3a8a] text-white placeholder:text-gray-500 transition-all text-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="password"
                        className="text-gray-300 uppercase text-[10px] tracking-wider"
                      >
                        Código de Acesso (Senha)
                      </Label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-[#60a5fa]/70" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-9 h-11 bg-black/20 border-white/10 focus-visible:ring-[#1e3a8a] text-white placeholder:text-gray-500 transition-all text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setView('recovery')}
                        className="text-[11px] text-[#60a5fa]/80 hover:text-white transition-colors"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="tech"
                    className="w-full h-11 uppercase tracking-wider text-xs font-bold mt-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Fingerprint className="mr-2 h-4 w-4" />
                    )}
                    {isSubmitting ? 'Validando...' : 'Iniciar Sessão'}
                  </Button>
                </form>
              )}

              {view === 'recovery' && (
                <form onSubmit={handleRecovery} className="space-y-6 animate-fade-in">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-medium text-white">Recuperação de Senha</h3>
                    <p className="text-xs text-gray-400 mt-2">
                      Informe seu e-mail cadastrado. Enviaremos um link para você redefinir sua
                      credencial.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="recovery-email"
                      className="text-gray-300 uppercase text-[10px] tracking-wider"
                    >
                      E-mail Cadastrado
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-[#60a5fa]/70" />
                      <Input
                        id="recovery-email"
                        type="email"
                        placeholder="admin@aurea.com"
                        className="pl-9 h-11 bg-black/20 border-white/10 focus-visible:ring-[#1e3a8a] text-white transition-all text-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 mt-4">
                    <Button
                      type="submit"
                      variant="tech"
                      className="w-full h-11 uppercase tracking-wider text-xs font-bold"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        'Enviar Link de Recuperação'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-11 text-xs text-gray-400 hover:text-white hover:bg-white/5"
                      onClick={() => setView('login')}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="mr-2 h-3 w-3" />
                      Voltar ao Login
                    </Button>
                  </div>
                </form>
              )}

              {view === 'update_password' && (
                <form onSubmit={handleUpdatePassword} className="space-y-6 animate-fade-in">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-medium text-white">Atualização Obrigatória</h3>
                    <p className="text-xs text-gray-400 mt-2">
                      Por favor, defina uma nova credencial segura para continuar.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="new-password"
                      className="text-gray-300 uppercase text-[10px] tracking-wider"
                    >
                      Nova Credencial Segura
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-[#60a5fa]/70" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-9 h-11 bg-black/20 border-white/10 focus-visible:ring-[#1e3a8a] text-white transition-all text-sm"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    variant="tech"
                    className="w-full h-11 uppercase tracking-wider text-xs font-bold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      'Confirmar Atualização'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
