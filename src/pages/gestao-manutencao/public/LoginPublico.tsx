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

const INDUSTRIAL_BG_STYLE: React.CSSProperties = {
  backgroundImage:
    'radial-gradient(circle at top right, rgba(15, 23, 42, 0.3), transparent 50%), linear-gradient(to bottom, rgba(15, 23, 42, 0.5), rgba(15, 23, 42, 0.95)), url("https://img.usecurling.com/p/1920/1080?q=industrial%20maintenance%20factory")',
  backgroundSize: 'cover',
  backgroundAttachment: 'fixed',
  backgroundPosition: 'center',
}

export default function LoginPublico() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { colors } = useClientColors(slug)
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate(`/m/${slug}/meus-chamados`, { replace: true })
  }, [user, slug, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email.trim() || !form.password) {
      toast.error('Preencha todos os campos')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    })
    if (error) {
      toast.error('E-mail ou senha incorretos')
      setLoading(false)
      return
    }
    navigate(`/m/${slug}/meus-chamados`, { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col text-slate-900" style={INDUSTRIAL_BG_STYLE}>
      <header
        className="bg-white/95 backdrop-blur-sm border-b-2 shadow-sm sticky top-0 z-20"
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
            <p className="text-xs text-slate-500">Entrar</p>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-md w-full mx-auto p-4 py-8 animate-fade-in-up flex items-center">
        <Card className="w-full shadow-2xl border-slate-200 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Entrar</h2>
              <p className="text-sm text-slate-600 mt-1">
                Acesse para acompanhar suas solicitações
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    className="pl-9 h-11 bg-white/80 text-slate-900 border-slate-300 placeholder:text-slate-400 focus:bg-white transition-colors"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    className="pl-9 h-11 bg-white/80 text-slate-900 border-slate-300 placeholder:text-slate-400 focus:bg-white transition-colors"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full hover:opacity-90 transition-opacity shadow-md"
                style={{ backgroundColor: colors.primary }}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
            <div className="flex items-center justify-between text-sm pt-2">
              <Link
                to={`/m/${slug}/registro`}
                className="font-medium hover:underline rounded px-1 transition-colors"
                style={{ color: colors.primary }}
              >
                Criar conta
              </Link>
              <Link
                to={`/m/${slug}/nova-solicitacao`}
                className="text-slate-500 hover:text-slate-900 hover:underline flex items-center gap-1 transition-colors"
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
