import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
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
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (user) navigate(`/m/${slug}/meus-chamados`, { replace: true })
  }, [user, slug, navigate])

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
        data: { name: form.name.trim(), role: 'Solicitante' },
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-xl animate-fade-in-up">
          <CardContent className="pt-10 pb-8 space-y-4">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Conta Criada!</h2>
            <p className="text-slate-500 text-sm">
              Verifique seu e-mail para confirmar a conta e depois faça login.
            </p>
            <Button
              className="w-full bg-brand-vividBlue"
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b-2 shadow-sm sticky top-0 z-20 border-brand-vividBlue">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-brand-vividBlue">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-base text-slate-900">Portal de Manutenção</h1>
            <p className="text-xs text-slate-500">Criar Conta</p>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-md w-full mx-auto p-4 py-8 animate-fade-in-up">
        <Card className="shadow-xl border-slate-200">
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Criar Conta</h2>
              <p className="text-sm text-slate-500 mt-1">
                Cadastre-se para acompanhar suas solicitações
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Nome *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-9 h-11"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Seu nome"
                    maxLength={200}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">E-mail *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    className="pl-9 h-11"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="seu@email.com"
                    maxLength={200}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Senha *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    className="pl-9 h-11"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Confirmar Senha *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    className="pl-9 h-11"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    placeholder="Repita a senha"
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full bg-brand-vividBlue"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {loading ? 'Criando...' : 'Criar Conta'}
              </Button>
            </form>
            <div className="flex items-center justify-between text-sm">
              <Link to={`/m/${slug}/entrar`} className="text-brand-vividBlue hover:underline">
                Já tem conta? Entrar
              </Link>
              <Link
                to={`/m/${slug}/nova-solicitacao`}
                className="text-slate-500 hover:underline flex items-center gap-1"
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
