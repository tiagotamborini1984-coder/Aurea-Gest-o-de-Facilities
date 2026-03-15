import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Loader2, Fingerprint } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requirePasswordChange, setRequirePasswordChange] = useState(false)
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    const checkUser = async () => {
      if (user && !requirePasswordChange) {
        const { data } = await supabase
          .from('profiles')
          .select('force_password_change')
          .eq('id', user.id)
          .single()
        if (data?.force_password_change) {
          setRequirePasswordChange(true)
        } else {
          navigate('/gestao-terceiros', { replace: true })
        }
      }
    }
    checkUser()
  }, [user, navigate, requirePasswordChange])

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden font-sans">
      {/* High-tech backdrop with Deep Blue and Graphite aesthetics */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-brand-deepBlue/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-brand-deepBlue/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40"></div>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 animate-fade-in-up">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-light tracking-[0.2em] text-foreground drop-shadow-sm uppercase">
              Gestão de <br />
              <span className="font-bold text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                Facilities
              </span>
            </h1>
            <p className="text-blue-400/80 text-xs tracking-widest font-medium uppercase mt-4">
              System Authentication
            </p>
          </div>

          <Card className="border-border bg-card/80 backdrop-blur-xl shadow-2xl">
            <CardContent className="pt-8">
              {!requirePasswordChange ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-muted-foreground uppercase text-[10px] tracking-wider"
                    >
                      Identificação (E-mail)
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-blue-400/70" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@aurea.com"
                        className="pl-9 h-11 bg-background/50 border-border focus-visible:ring-brand-deepBlue text-foreground placeholder:text-muted-foreground/50 transition-all"
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
                        className="text-muted-foreground uppercase text-[10px] tracking-wider"
                      >
                        Código de Acesso (Senha)
                      </Label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-blue-400/70" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-9 h-11 bg-background/50 border-border focus-visible:ring-brand-deepBlue text-foreground placeholder:text-muted-foreground/50 transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="tech"
                    className="w-full h-12 uppercase tracking-wider text-xs font-bold mt-4"
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
              ) : (
                <form onSubmit={handleUpdatePassword} className="space-y-6 animate-fade-in">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-medium text-foreground">Atualização Obrigatória</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Por favor, defina uma nova credencial para continuar.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="new-password"
                      className="text-muted-foreground uppercase text-[10px] tracking-wider"
                    >
                      Nova Credencial Segura
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-blue-400/70" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-9 h-11 bg-background/50 border-border focus-visible:ring-brand-deepBlue text-foreground transition-all"
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
                    className="w-full h-12 uppercase tracking-wider text-xs font-bold"
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
