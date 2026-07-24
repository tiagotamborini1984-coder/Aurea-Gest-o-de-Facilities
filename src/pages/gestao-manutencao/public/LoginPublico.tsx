import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Wrench, ArrowLeft, Mail, Lock, CheckCircle2 } from 'lucide-react'
import { useClientColors } from '@/hooks/use-client-colors'
import { useAuth } from '@/hooks/use-auth'

const BackgroundElements = () => (
  <>
    <div
      className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none scale-105"
      style={{
        backgroundImage:
          'url("https://img.usecurling.com/p/1920/1080?q=corn%20ethanol%20plant%20silo%20industrial&dpr=2")',
      }}
    />
    <div className="fixed inset-0 bg-gradient-to-br from-[#1f2937]/95 via-[#1f2937]/85 to-[#1e3a8a]/90 pointer-events-none" />
    <div className="fixed inset-0 bg-gradient-to-t from-[#1f2937]/95 via-transparent to-[#1f2937]/70 pointer-events-none" />
    <div className="fixed top-[-15%] left-[-10%] w-[500px] h-[500px] bg-[#1e3a8a]/20 rounded-full blur-[120px] pointer-events-none" />
    <div className="fixed bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-[#1e3a8a]/10 rounded-full blur-[120px] pointer-events-none" />
    <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40"></div>
  </>
)

export default function LoginPublico() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { colors, client, loading: clientLoading } = useClientColors(slug)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      navigate(`/m/${slug}/meus-chamados`, { replace: true })
    }
  }, [user, navigate, slug])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error('Credenciais inválidas. Verifique seu e-mail e senha.')
      setIsSubmitting(false)
    } else {
      navigate(`/m/${slug}/meus-chamados`, { replace: true })
    }
  }

  if (clientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans bg-[#1f2937]">
        <BackgroundElements />
        <Loader2 className="h-8 w-8 animate-spin z-10 text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col text-slate-900 relative overflow-hidden font-sans bg-[#1f2937]">
      <BackgroundElements />

      <header
        className="bg-white/95 backdrop-blur-sm border-b-2 shadow-sm sticky top-0 z-20"
        style={{ borderBottomColor: colors.primary }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {client?.logo_url ? (
            <img
              src={client.logo_url}
              alt={client.name}
              className="h-11 w-auto object-contain rounded"
            />
          ) : (
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: colors.primary }}
            >
              <Wrench className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base leading-tight text-slate-900 truncate">
              {client?.name || 'Portal de Manutenção'}
            </h1>
            <p className="text-xs text-slate-500">Acesso Restrito</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 animate-fade-in-up">
        <Card className="w-full max-w-md shadow-2xl border-white/10 bg-[#1f2937]/80 backdrop-blur-xl">
          <CardContent className="pt-8 sm:p-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                <CheckCircle2 className="h-7 w-7 text-[#60a5fa]" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-wide">Acompanhar Chamados</h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2">
                Entre com sua conta para visualizar suas solicitações de manutenção.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-gray-300 uppercase text-[10px] tracking-wider"
                >
                  Seu E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-[#60a5fa]/70" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="voce@empresa.com"
                    className="pl-9 h-11 bg-black/20 border-white/10 focus-visible:ring-[#1e3a8a] text-white placeholder:text-gray-500 transition-all text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-gray-300 uppercase text-[10px] tracking-wider"
                >
                  Senha
                </Label>
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
              </div>

              <Button
                type="submit"
                className="w-full h-11 uppercase tracking-wider text-xs font-bold mt-2 shadow-lg"
                style={{ backgroundColor: colors.primary, color: colors.primaryContrast }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Acessar Meus Chamados'
                )}
              </Button>

              <div className="pt-6 mt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
                <Link
                  to={`/m/${slug}/nova-solicitacao`}
                  className="flex items-center text-gray-400 hover:text-white transition-colors text-xs"
                >
                  <ArrowLeft className="mr-1.5 h-3 w-3" />
                  Voltar para abertura
                </Link>
                <Link
                  to={`/m/${slug}/registro`}
                  className="text-[#60a5fa] hover:text-[#93c5fd] font-medium transition-colors text-xs"
                >
                  Ainda não tem conta? Criar
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
