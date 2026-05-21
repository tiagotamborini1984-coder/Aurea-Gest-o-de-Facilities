import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  Shield,
  Wrench,
  Box,
  Calendar,
  ArrowRight,
  Zap,
  Star,
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="bg-brand-vividBlue p-2 rounded-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-cyan-600">
              Áurea SaaS
            </span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <a href="#recursos" className="hover:text-brand-vividBlue transition-colors">
              Recursos
            </a>
            <a href="#modulos" className="hover:text-brand-vividBlue transition-colors">
              Módulos
            </a>
            <a href="#planos" className="hover:text-brand-vividBlue transition-colors">
              Planos
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium hover:text-brand-vividBlue transition-colors hidden sm:block"
            >
              Entrar
            </Link>
            <Button
              asChild
              className="bg-brand-vividBlue hover:bg-brand-vividBlue/90 shadow-md transition-transform hover:-translate-y-0.5 text-white"
            >
              <a href="#planos">Começar Agora</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-white"></div>
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight animate-fade-in-up">
            Gestão de Facilities <span className="text-brand-vividBlue">Inteligente</span> para sua
            Empresa
          </h1>
          <p
            className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            Automatize operações, gerencie terceiros, manutenções, imóveis e auditorias em uma única
            plataforma integrada e escalável.
          </p>
          <div
            className="mt-10 flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up"
            style={{ animationDelay: '200ms' }}
          >
            <Button
              size="lg"
              className="bg-brand-vividBlue hover:bg-brand-vividBlue/90 text-white h-12 px-8 text-base shadow-lg"
              asChild
            >
              <a href="#planos">
                Ver Planos <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <Link to="/login">Acessar Sistema</Link>
            </Button>
          </div>

          <div
            className="mt-20 relative mx-auto max-w-5xl rounded-xl border bg-white shadow-2xl overflow-hidden animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            <div className="flex h-8 items-center border-b bg-slate-100 px-4">
              <div className="flex space-x-2">
                <div className="h-3 w-3 rounded-full bg-red-400"></div>
                <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                <div className="h-3 w-3 rounded-full bg-green-400"></div>
              </div>
            </div>
            <img
              src="https://img.usecurling.com/p/1200/600?q=dashboard%20interface&color=blue"
              alt="Dashboard Áurea"
              className="w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="modulos" className="py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Módulos Completos</h2>
            <p className="mt-4 text-lg text-slate-600">
              Tudo o que você precisa para gerenciar sua infraestrutura com excelência e economia.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Wrench,
                title: 'Gestão de Manutenção',
                desc: 'Planeje preventivas, abra chamados (OS), gerencie ativos e acompanhe SLAs em tempo real.',
                color: 'bg-blue-100 text-blue-600',
              },
              {
                icon: Shield,
                title: 'Auditoria e Qualidade',
                desc: 'Crie checklists personalizados, agende auditorias recorrentes e gere planos de ação automáticos.',
                color: 'bg-emerald-100 text-emerald-600',
              },
              {
                icon: Box,
                title: 'Central de Encomendas',
                desc: 'Rastreie pacotes, notifique destinatários automaticamente e mantenha um log de entregas seguro.',
                color: 'bg-amber-100 text-amber-600',
              },
              {
                icon: Calendar,
                title: 'Gestão de Imóveis',
                desc: 'Controle reservas, taxas diárias, limpeza de quartos e ocupação para housing corporativo.',
                color: 'bg-purple-100 text-purple-600',
              },
              {
                icon: Zap,
                title: 'Gestão de Terceiros',
                desc: 'Acompanhe documentações, metas (Book de Metas) e treinamentos obrigatórios de fornecedores.',
                color: 'bg-rose-100 text-rose-600',
              },
              {
                icon: Building2,
                title: 'Lockers Inteligentes',
                desc: 'Distribua armários para colaboradores, controle chaves e gerencie ocupação das plantas.',
                color: 'bg-cyan-100 text-cyan-600',
              },
            ].map((mod, i) => (
              <div
                key={i}
                className="rounded-2xl border bg-white p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${mod.color}`}
                >
                  <mod.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{mod.title}</h3>
                <p className="text-slate-600 leading-relaxed">{mod.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="py-24 bg-slate-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Planos Transparentes</h2>
            <p className="mt-4 text-lg text-slate-600">
              Escolha o plano ideal para o tamanho da sua operação.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Plan 1 */}
            <div className="rounded-3xl border bg-white p-8 shadow-sm flex flex-col">
              <h3 className="text-2xl font-bold text-slate-900">Essencial</h3>
              <p className="text-slate-500 mt-2">Para pequenas operações e escritórios.</p>
              <div className="mt-6 flex items-baseline text-5xl font-extrabold">
                R$ 499
                <span className="ml-1 text-xl font-medium text-slate-500">/mês</span>
              </div>
              <ul className="mt-8 space-y-4 flex-1">
                {[
                  'Gestão de Encomendas',
                  'Gestão de Terceiros (Básico)',
                  'Até 2 Plantas',
                  'Suporte por Email',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <span className="text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full"
                variant="outline"
                onClick={() => alert('Redirecionando para checkout...')}
              >
                Assinar Essencial
              </Button>
            </div>

            {/* Plan 2 */}
            <div className="rounded-3xl border-2 border-brand-vividBlue bg-white p-8 shadow-xl flex flex-col relative transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-vividBlue text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                <Star className="w-4 h-4" /> Mais Popular
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Profissional</h3>
              <p className="text-slate-500 mt-2">Para médias empresas e gestores de FM.</p>
              <div className="mt-6 flex items-baseline text-5xl font-extrabold">
                R$ 1.299
                <span className="ml-1 text-xl font-medium text-slate-500">/mês</span>
              </div>
              <ul className="mt-8 space-y-4 flex-1">
                {[
                  'Tudo do Essencial',
                  'Gestão de Manutenção (SLA)',
                  'Auditoria e Checklists',
                  'Até 10 Plantas',
                  'Lockers',
                  'Suporte Prioritário',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <span className="text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full bg-brand-vividBlue hover:bg-brand-vividBlue/90 text-white"
                onClick={() => alert('Redirecionando para checkout...')}
              >
                Assinar Profissional
              </Button>
            </div>

            {/* Plan 3 */}
            <div className="rounded-3xl border bg-white p-8 shadow-sm flex flex-col">
              <h3 className="text-2xl font-bold text-slate-900">Enterprise</h3>
              <p className="text-slate-500 mt-2">Para indústrias e grandes corporações.</p>
              <div className="mt-6 flex items-baseline text-5xl font-extrabold">Custom</div>
              <ul className="mt-8 space-y-4 flex-1">
                {[
                  'Tudo do Profissional',
                  'Gestão de Imóveis (Housing)',
                  'Plantas Ilimitadas',
                  'Módulos Customizáveis',
                  'API e Integrações',
                  'Gerente de Sucesso',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <span className="text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full"
                variant="outline"
                onClick={() => alert('Fale com Vendas')}
              >
                Falar com Vendas
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="flex justify-center items-center gap-2 mb-6">
            <Building2 className="h-6 w-6 text-slate-400" />
            <span className="text-xl font-bold text-white">Áurea</span>
          </div>
          <p className="mb-6">Transformando a gestão de facilities com tecnologia.</p>
          <div className="flex justify-center gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">
              Termos de Uso
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Privacidade
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Contato
            </a>
          </div>
          <p className="mt-8 text-sm opacity-50">
            &copy; {new Date().getFullYear()} Áurea Facility Management. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
