import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  Star,
  Users,
  PieChart,
  Lock,
  Home,
  ShieldCheck,
  Wrench,
  Package,
  Leaf,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import heroImage from '@/assets/chatgpt-image-21-de-mai.de-2026-161932-16216.png'

export default function LandingPage() {
  const allModules = [
    {
      icon: Lock,
      title: 'Gestão de Lockers',
      desc: 'Smart locker management com distribuição inteligente e auditoria em tempo real.',
      features: ['Distribuição inteligente', 'Controle de chaves', 'Auditoria de ocupação'],
      gradient: 'from-blue-500/10 to-cyan-500/10',
      iconColor: 'text-cyan-600',
      border: 'group-hover:border-cyan-200',
    },
    {
      icon: Home,
      title: 'Gestão de Imóveis',
      desc: 'Administração completa de housing corporativo, reservas e controle de capacidade.',
      features: ['Reservas avançadas', 'Controle de capacidade', 'Gestão de faturamento'],
      gradient: 'from-purple-500/10 to-pink-500/10',
      iconColor: 'text-purple-600',
      border: 'group-hover:border-purple-200',
    },
    {
      icon: Users,
      title: 'Gestão de Terceiros',
      desc: 'Controle absoluto sobre provedores externos, documentação e treinamentos.',
      features: ['Controle de headcount', 'Gestão de documentação', 'Treinamentos e NRs'],
      gradient: 'from-orange-500/10 to-red-500/10',
      iconColor: 'text-orange-600',
      border: 'group-hover:border-orange-200',
    },
    {
      icon: PieChart,
      title: 'Gestão de Budget',
      desc: 'Acompanhamento financeiro robusto com centros de custo flexíveis e comparativo.',
      features: ['Centros de custo', 'Contas orçamentárias', 'Previsto vs Realizado'],
      gradient: 'from-emerald-500/10 to-teal-500/10',
      iconColor: 'text-emerald-600',
      border: 'group-hover:border-emerald-200',
    },
    {
      icon: Wrench,
      title: 'Gestão de Manutenção',
      desc: 'Controle de chamados de manutenção predial e rotinas preventivas.',
      features: ['Controle de tickets (OS)', 'Planejamento preventivo', 'Gestão de ativos'],
      gradient: 'from-indigo-500/10 to-blue-500/10',
      iconColor: 'text-indigo-600',
      border: 'group-hover:border-indigo-200',
    },
    {
      icon: ShieldCheck,
      title: 'Auditoria e Qualidade',
      desc: 'Acompanhamento rigoroso de conformidade e auditorias em todas as áreas.',
      features: ['Execução de checklists', 'Acompanhamento de notas', 'Planos de ação'],
      gradient: 'from-rose-500/10 to-red-500/10',
      iconColor: 'text-rose-600',
      border: 'group-hover:border-rose-200',
    },
    {
      icon: Package,
      title: 'Central de Encomendas',
      desc: 'Logística interna corporativa automatizada para recebimento de pacotes.',
      features: ['Registro de chegada', 'Rastreamento de pacotes', 'Protocolos de entrega'],
      gradient: 'from-amber-500/10 to-yellow-500/10',
      iconColor: 'text-amber-600',
      border: 'group-hover:border-amber-200',
    },
    {
      icon: Leaf,
      title: 'Limpeza e Jardinagem',
      desc: 'Padronização e roteirização das atividades contínuas de conservação.',
      features: ['Gestão de cronogramas', 'Monitoramento de áreas', 'Registro de evidências'],
      gradient: 'from-green-500/10 to-emerald-500/10',
      iconColor: 'text-green-600',
      border: 'group-hover:border-green-200',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-brand-graphite selection:bg-brand-vividBlue selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-brand-deepBlue to-brand-vividBlue p-2.5 rounded-xl shadow-sm">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-brand-graphite">Áurea</span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-semibold text-slate-600">
            <a href="#recursos" className="hover:text-brand-vividBlue transition-colors">
              Plataforma
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
              className="text-sm font-semibold text-slate-600 hover:text-brand-vividBlue transition-colors hidden sm:block"
            >
              Entrar
            </Link>
            <Button
              asChild
              className="bg-brand-graphite hover:bg-brand-deepBlue shadow-md transition-all hover:scale-105 text-white font-semibold rounded-full px-6"
            >
              <a href="#planos">Assine Agora</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-24 pb-32 md:pt-32 md:pb-40 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 -z-10 bg-slate-50"></div>
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/4 w-[800px] h-[600px] bg-brand-vividBlue/10 rounded-full blur-[100px] opacity-60 pointer-events-none"></div>
        <div className="absolute top-0 left-0 -translate-y-12 -translate-x-1/4 w-[800px] h-[600px] bg-brand-deepBlue/10 rounded-full blur-[100px] opacity-60 pointer-events-none"></div>

        <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
          <div className="inline-flex items-center rounded-full border border-brand-vividBlue/20 bg-brand-vividBlue/5 px-4 py-1.5 text-sm font-bold text-brand-deepBlue mb-8 animate-fade-in-up">
            <Star className="mr-2 h-4 w-4 fill-brand-vividBlue text-brand-vividBlue" />
            Nova Plataforma SaaS Multi-Tenant
          </div>
          <h1
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-brand-graphite max-w-5xl mx-auto leading-[1.1] animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            O Controle Total das suas <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-deepBlue to-brand-vividBlue">
              Operações de Facilities
            </span>
          </h1>
          <p
            className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium animate-fade-in-up"
            style={{ animationDelay: '200ms' }}
          >
            Aumente a eficiência, reduza custos e garanta compliance com nossa suíte integrada de
            gestão corporativa premium.
          </p>
          <div
            className="mt-10 flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            <Button
              size="lg"
              className="bg-brand-deepBlue hover:bg-brand-deepBlue/90 text-white h-14 px-8 text-base font-semibold shadow-xl shadow-brand-deepBlue/20 transition-all hover:scale-105 rounded-full"
              asChild
            >
              <a href="#planos">
                Ver Planos e Preços <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-semibold border-slate-300 text-brand-graphite hover:bg-slate-100 transition-all bg-white/50 backdrop-blur-sm rounded-full"
              asChild
            >
              <Link to="/login">Acessar Sistema</Link>
            </Button>
          </div>

          <div
            className="mt-24 relative mx-auto max-w-5xl rounded-2xl border border-slate-200/60 bg-white/40 backdrop-blur-xl shadow-2xl overflow-hidden animate-fade-in-up ring-1 ring-black/5"
            style={{ animationDelay: '400ms' }}
          >
            <div className="flex h-10 items-center border-b border-slate-200/60 bg-white/50 px-4 backdrop-blur-md">
              <div className="flex space-x-2">
                <div className="h-3 w-3 rounded-full bg-red-400 shadow-sm"></div>
                <div className="h-3 w-3 rounded-full bg-amber-400 shadow-sm"></div>
                <div className="h-3 w-3 rounded-full bg-green-400 shadow-sm"></div>
              </div>
            </div>
            <img
              src={heroImage}
              alt="Áurea Dashboard Mockup"
              className="w-full object-cover max-h-[600px] border-b border-slate-100"
            />
          </div>
        </div>
      </section>

      {/* Modules - Core Showcase */}
      <section id="modulos" className="py-24 bg-white relative border-y border-slate-100">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-brand-graphite tracking-tight">
              Módulos Especializados
            </h2>
            <p className="mt-4 text-lg text-slate-600 font-medium">
              Ecossistema completo desenhado para atender aos padrões mais exigentes de Facility
              Management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {allModules.map((mod, i) => (
              <div
                key={i}
                className={cn(
                  'group relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/70 backdrop-blur-xl p-6 lg:p-8 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col',
                  mod.border,
                )}
              >
                <div
                  className={cn(
                    'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10',
                    mod.gradient,
                  )}
                />
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 group-hover:scale-110 transition-transform duration-500">
                  <mod.icon className={cn('h-7 w-7', mod.iconColor)} />
                </div>
                <h3 className="mb-3 text-xl font-bold text-brand-graphite tracking-tight">
                  {mod.title}
                </h3>
                <p className="text-slate-600 leading-relaxed font-medium text-sm mb-6 flex-grow">
                  {mod.desc}
                </p>

                <ul className="space-y-2 mb-6">
                  {mod.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-slate-600">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-brand-vividBlue shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex items-center text-sm font-bold text-brand-vividBlue opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  Explorar Módulo <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-blue-100/40 via-slate-50 to-white"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-brand-graphite tracking-tight">
              Planos e Assinaturas
            </h2>
            <p className="mt-4 text-lg text-slate-600 font-medium">
              Escolha a estrutura ideal para impulsionar a infraestrutura da sua empresa.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
            {/* Plan 1 */}
            <div className="rounded-3xl border border-slate-200 bg-white/60 backdrop-blur-sm p-8 shadow-sm flex flex-col hover:shadow-xl transition-all duration-300">
              <h3 className="text-2xl font-bold text-brand-graphite">Essencial</h3>
              <p className="text-slate-500 mt-2 font-medium">
                Para operações enxutas e escritórios locais.
              </p>
              <div className="mt-6 flex items-baseline text-5xl font-extrabold text-brand-graphite">
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
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-brand-vividBlue flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-8 w-full text-brand-deepBlue border-brand-deepBlue/20 hover:bg-brand-deepBlue hover:text-white bg-white hover:border-transparent transition-colors rounded-full"
                variant="outline"
              >
                <Link to="/login">Assinar Essencial</Link>
              </Button>
            </div>

            {/* Plan 2 - Highlighted */}
            <div className="rounded-3xl border-2 border-brand-vividBlue bg-white p-8 shadow-2xl flex flex-col relative transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-brand-deepBlue to-brand-vividBlue text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-lg">
                <Star className="w-4 h-4" fill="currentColor" /> Mais Escolhido
              </div>
              <h3 className="text-2xl font-bold text-brand-graphite">Profissional</h3>
              <p className="text-slate-500 mt-2 font-medium">
                Para médias empresas e líderes de FM.
              </p>
              <div className="mt-6 flex items-baseline text-5xl font-extrabold text-brand-graphite">
                R$ 1.299
                <span className="ml-1 text-xl font-medium text-slate-500">/mês</span>
              </div>
              <ul className="mt-8 space-y-4 flex-1">
                {[
                  'Tudo do plano Essencial',
                  'Gestão de Lockers',
                  'Gestão de Budget Avançado',
                  'Auditoria e Checklists',
                  'Até 10 Plantas',
                  'Suporte Prioritário',
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-brand-vividBlue flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-bold">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-8 w-full bg-brand-deepBlue hover:bg-brand-deepBlue/90 text-white shadow-xl shadow-brand-deepBlue/20 transition-transform hover:scale-105 rounded-full"
              >
                <Link to="/login">Assinar Profissional</Link>
              </Button>
            </div>

            {/* Plan 3 */}
            <div className="rounded-3xl border border-slate-200 bg-white/60 backdrop-blur-sm p-8 shadow-sm flex flex-col hover:shadow-xl transition-all duration-300">
              <h3 className="text-2xl font-bold text-brand-graphite">Enterprise</h3>
              <p className="text-slate-500 mt-2 font-medium">
                Para indústrias e grandes corporações.
              </p>
              <div className="mt-6 flex items-baseline text-5xl font-extrabold text-brand-graphite">
                Custom
              </div>
              <ul className="mt-8 space-y-4 flex-1">
                {[
                  'Tudo do Profissional',
                  'Gestão de Imóveis (Housing)',
                  'Plantas Ilimitadas',
                  'Integrações via API (ERP)',
                  'SSO / SAML 2.0',
                  'Customer Success Dedicado',
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-brand-vividBlue flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="mt-8 w-full text-brand-deepBlue border-brand-deepBlue/20 hover:bg-brand-deepBlue hover:text-white bg-white hover:border-transparent transition-colors rounded-full"
                variant="outline"
              >
                <Link to="/login">Falar com Consultor</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A0F1C] text-slate-400 py-12 border-t border-slate-800">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="flex justify-center items-center gap-2 mb-6">
            <Building2 className="h-6 w-6 text-slate-400" />
            <span className="text-2xl font-extrabold text-white tracking-tight">Áurea</span>
          </div>
          <p className="mb-6 font-medium text-slate-500">
            A inovação definitiva em gestão de facilities.
          </p>
          <div className="flex justify-center gap-8 text-sm font-semibold">
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
          <p className="mt-10 text-sm font-medium opacity-40">
            &copy; {new Date().getFullYear()} Áurea Facility Management. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
