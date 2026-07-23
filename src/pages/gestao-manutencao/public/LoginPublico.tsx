import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useClientColors } from '@/hooks/use-client-colors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Wrench, Mail, Lock, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPublico() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { colors } = useClientColors(slug)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate(`/m/${slug}/meus-chamados`, { replace: true })
  }, [user, slug, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      toast.error('Credenciais inválidas')
      setLoading(false)
    } else {
      navigate(`/m/${slug}/meus-chamados`, { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header
        className="bg-white border-b-2 shadow-sm sticky top-0 z-20"
        style={{ borderBottomColor: colors.primary }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-base text-slate-900">Portal de Manutenção</h1>
            <p className="text-xs text-slate-600">Entrar</p>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-md w-full mx-auto p-4 py-8 animate-fade-in-up">
        <Card className="shadow-xl border-slate-200">
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Entrar</h2>
              <p className="text-sm text-slate-600 mt-1">
                Acesse para acompanhar suas solicitações
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    className="pl-9 h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    className="pl-9 h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full hover:opacity-90 transition-opacity focus:ring-2 focus:ring-offset-2"
                style={
                  {
                    backgroundColor: colors.primary,
                    '--tw-ring-color': colors.primary,
                  } as React.CSSProperties
                }
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
            <div className="flex items-center justify-between text-sm">
              <Link
                to={`/m/${slug}/registro`}
                className="font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-offset-1 rounded px-1"
                style={{ color: colors.primary }}
              >
                Criar conta
              </Link>
              <Link
                to={`/m/${slug}/nova-solicitacao`}
                className="text-slate-600 hover:underline flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-offset-1 rounded px-1"
              >
                <ArrowLeft className="h-3 w-3" /> Voltar
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
