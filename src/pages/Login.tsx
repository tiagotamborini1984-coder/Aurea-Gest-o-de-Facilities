import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, User, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      navigate('/clientes', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const { error } = await signIn(email, password)

    if (!error) {
      toast({
        title: 'Login bem-sucedido',
        description: 'Bem-vindo ao painel administrativo.',
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      navigate('/clientes', { replace: true })
    } else {
      toast({
        variant: 'destructive',
        title: 'Credenciais inválidas',
        description: 'O e-mail ou senha fornecidos estão incorretos.',
      })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-light relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-primary -skew-y-6 origin-top-left -z-0 transition-colors duration-500" />
      <div className="absolute top-0 right-0 w-1/3 h-full bg-secondary/10 blur-3xl rounded-full -z-0 transition-colors duration-500" />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 animate-fade-in-up">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center justify-center space-y-3 mb-8">
            <div className="bg-white p-3 rounded-2xl shadow-md border border-border">
              <Building2 className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                Gestão <span className="text-secondary font-light">Facilities</span>
              </h1>
              <p className="text-white/80 text-sm font-medium mt-1">SaaS de Operação</p>
            </div>
          </div>

          <Card className="shadow-elevation border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-6 text-center">
              <CardTitle className="text-2xl font-bold text-foreground">Acesso Restrito</CardTitle>
              <CardDescription>
                Insira suas credenciais para acessar os módulos de gestão.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2 relative">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@aurea.com"
                      className="pl-9 h-11"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <a href="#" className="text-xs text-primary hover:underline font-medium">
                      Esqueceu a senha?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9 h-11"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 transition-all shadow-md mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Autenticando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>

                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground bg-slate-100 p-2 rounded-md border border-slate-200">
                    Dica: Use admin@aurea.com e AureaAdmin2024!
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
