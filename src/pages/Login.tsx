import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Triangle, User, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppStore } from '@/store/AppContext'
import { useToast } from '@/hooks/use-toast'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login, isAuthenticated } = useAppStore()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/clientes', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const success = await login(username, password)

    if (success) {
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
        description: 'O usuário ou senha fornecidos estão incorretos.',
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-light relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-brand-blue -skew-y-6 origin-top-left -z-0" />
      <div className="absolute top-0 right-0 w-1/3 h-full bg-brand-cyan/10 blur-3xl rounded-full -z-0" />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 animate-fade-in-up">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center justify-center space-y-3 mb-8">
            <div className="bg-white p-3 rounded-2xl shadow-md border border-brand-light/50">
              <Triangle className="h-10 w-10 text-brand-cyan fill-brand-blue -rotate-90" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                Áurea <span className="text-brand-cyan font-light">Mgt</span>
              </h1>
              <p className="text-white/80 text-sm font-medium mt-1">Facility Management System</p>
            </div>
          </div>

          <Card className="shadow-elevation border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-6 text-center">
              <CardTitle className="text-2xl font-bold text-brand-graphite">
                Acesso Restrito
              </CardTitle>
              <CardDescription>
                Insira suas credenciais para acessar os módulos de gestão.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2 relative">
                  <Label htmlFor="username">Usuário</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="admin@aurea.com"
                      className="pl-9 h-11"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <a href="#" className="text-xs text-brand-cyan hover:underline font-medium">
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
                  className="w-full h-11 bg-brand-blue hover:bg-brand-blue/90 text-white transition-all shadow-md mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Autenticando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>

                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground bg-brand-light/50 p-2 rounded-md">
                    Dica: Qualquer usuário e senha com +4 caracteres para testar.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="h-14 flex items-center justify-center border-t border-brand-light bg-white/80 backdrop-blur-sm z-10 shrink-0">
        <p className="text-xs text-brand-graphite/70 font-medium px-4 text-center">
          Módulo do Sistema Áurea – Desenvolvido por Tiago Tamborini
        </p>
      </footer>
    </div>
  )
}
