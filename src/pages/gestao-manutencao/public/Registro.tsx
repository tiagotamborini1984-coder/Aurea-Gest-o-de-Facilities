import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useClientColors } from '@/hooks/use-client-colors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Wrench, User, Mail, Lock, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function RegistroPublico() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { colors } = useClientColors(slug)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)

  useEffect(() => {
    if (user) navigate(`/m/${slug}/meus-chamados`, { replace: true })
  }, [user, slug, navigate])

  useEffect(() => {
    async function fetchClient() {
      if (!slug) return
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('url_slug', slug)
        .eq('status', 'Ativo')
        .single()
      if (data) setClientId(data.id)
    }
    fetchClient()
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error('Preencha todos os campos')
      return
    }
    if (form.password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres')
      return
    }
    if (form.password !== form.confirm) {
      toast.error('As senhas não coincidem')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { name: form.name.trim(), role: 'chamado', client_id: clientId },
        emailRedirectTo: `${window.location.origin}/m/${slug}/entrar`,
      },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    if (data.session) {
      navigate(`/m/${slug}/meus-chamados`, { replace: true })
      return
    }
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-900">
        <Card className="w-full max-w-md text-center shadow-xl animate-fade-in-up border-slate-200 bg-white">
          <CardContent className="pt-10 pb-8 space-y-4">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Conta Criada!</h2>
            <p className="text-slate-500 text-sm">
              Verifique seu e-mail para confirmar a conta e depois faça login.
            </p>
            <Button
              className="w-full hover:opacity-90 transition-opacity focus:ring-2 focus:ring-offset-2"
              style={
                {
                  backgroundColor: colors.primary,
                  '--tw-ring-color': colors.primary,
                } as React.CSSProperties
              }
              onClick={() => navigate(`/m/${slug}/entrar`)}
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
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
            <p className="text-xs text-slate-500">Criar Conta</p>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-md w-full mx-auto p-4 py-8 animate-fade-in-up">
        <Card className="shadow-xl border-slate-200 bg-white">
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Criar Conta</h2>
              <p className="text-sm text-slate-500 mt-1">
                Cadastre-se para acompanhar suas solicitações
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">Nome *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-9 h-11 bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Seu nome"
                    maxLength={200}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">E-mail *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    className="pl-9 h-11 bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="seu@email.com"
                    maxLength={200}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">Senha *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    className="pl-9 h-11 bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">Confirmar Senha *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    className="pl-9 h-11 bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    placeholder="Repita a senha"
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
                {loading ? 'Criando...' : 'Criar Conta'}
              </Button>
            </form>
            <div className="flex items-center justify-between text-sm">
              <Link
                to={`/m/${slug}/entrar`}
                className="font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-offset-1 rounded px-1"
                style={{ color: colors.primary }}
              >
                Já tem conta? Entrar
              </Link>
              <Link
                to={`/m/${slug}/nova-solicitacao`}
                className="text-slate-500 hover:text-slate-900 hover:underline flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-offset-1 rounded px-1 transition-colors"
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
