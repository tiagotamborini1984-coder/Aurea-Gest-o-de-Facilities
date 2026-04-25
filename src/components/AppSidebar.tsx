import { Link, useLocation } from 'react-router-dom'
import {
  Database,
  Building2,
  ChevronRight,
  Package,
  Briefcase,
  Users,
  Leaf,
  CheckSquare,
  ClipboardCheck,
  Globe,
  Home,
  DollarSign,
  Archive,
  Target,
  Network,
  AlertTriangle,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/AppContext'

export function AppSidebar() {
  const location = useLocation()
  const { profile, activeClient, selectedMasterClient } = useAppStore()
  const role = profile?.role || 'Operacional'
  const accessibleMenus = profile?.accessible_menus || []

  const navItems = [
    {
      title: 'Gestão de Clientes',
      icon: Globe,
      path: '/admin/clientes',
    },
    {
      title: 'Gestão de Terceiros',
      icon: Briefcase,
      subItems: [
        { title: 'Dashboard Gestor', path: '/gestao-terceiros' },
        { title: 'Lançamentos', path: '/gestao-terceiros/lancamentos' },
        { title: 'Relatórios', path: '/gestao-terceiros/relatorios' },
        { title: 'BI Dashboard', path: '/gestao-terceiros/bi' },
        { title: 'Email Reports', path: '/gestao-terceiros/email-reports' },
        { title: 'Log de Auditoria', path: '/gestao-terceiros/auditoria' },
      ],
    },
    {
      title: 'Limpeza e Jardinagem',
      icon: Leaf,
      subItems: [
        { title: 'Áreas', path: '/limpeza-jardinagem/areas' },
        { title: 'Cronograma', path: '/limpeza-jardinagem/cronograma' },
        { title: 'Dashboard', path: '/limpeza-jardinagem/dashboard' },
        { title: 'Relatórios', path: '/limpeza-jardinagem/relatorios' },
      ],
    },
    {
      title: 'Gestão de Tarefas',
      icon: CheckSquare,
      subItems: [
        { title: 'Painel de Chamados', path: '/gestao-tarefas' },
        { title: 'Relatórios', path: '/gestao-tarefas/relatorios' },
        { title: 'Tipos de Chamado', path: '/gestao-tarefas/tipos' },
        { title: 'Status', path: '/gestao-tarefas/status' },
      ],
    },
    {
      title: 'Organograma e Fluxos',
      icon: Network,
      subItems: [
        { title: 'Organograma', path: '/organograma/dashboard' },
        { title: 'Cadastros', path: '/organograma/cadastros' },
        { title: 'Fluxogramas', path: '/organograma/fluxogramas' },
      ],
    },
    {
      title: 'Auditoria e Checklist',
      icon: ClipboardCheck,
      subItems: [
        { title: 'Nova Auditoria', path: '/auditoria-checklist/configuracao' },
        { title: 'Auditorias Criadas', path: '/auditoria-checklist/criadas' },
        { title: 'Auditorias Realizadas', path: '/auditoria-checklist/realizadas' },
        { title: 'Dashboard', path: '/auditoria-checklist/dashboard' },
      ],
    },
    {
      title: 'Gestão de Acidentes',
      icon: AlertTriangle,
      subItems: [
        { title: 'Dashboard', path: '/gestao-acidentes/dashboard' },
        { title: 'Novo Registro', path: '/gestao-acidentes/registro' },
        { title: 'Histórico', path: '/gestao-acidentes/historico' },
      ],
    },
    {
      title: 'Gestão de Budget',
      icon: DollarSign,
      subItems: [
        { title: 'Dashboard', path: '/gestao-budget/dashboard' },
        {
          title: 'Lançamentos',
          label:
            role === 'Master' || role === 'Administrador' ? 'Lançamentos' : 'Painel de Lançamentos',
          path: '/gestao-budget/lancamentos',
        },
        { title: 'Centros de Custo', path: '/gestao-budget/centros-custo' },
        { title: 'Contas Contábeis', path: '/gestao-budget/contas' },
      ],
    },
    {
      title: 'Gestão de Lockers',
      icon: Archive,
      subItems: [
        { title: 'Dashboard', path: '/gestao-lockers/dashboard' },
        { title: 'Mapa de Ocupação', path: '/gestao-lockers/ocupacao' },
        { title: 'Lockers', path: '/gestao-lockers/lockers' },
        { title: 'Colaboradores', path: '/gestao-lockers/colaboradores' },
      ],
    },
    {
      title: 'Gestão de Imóveis',
      icon: Home,
      subItems: [
        { title: 'Dashboard', path: '/gestao-imoveis/dashboard' },
        { title: 'Mapa de Ocupação', path: '/gestao-imoveis/ocupacao' },
        { title: 'Imóveis', path: '/gestao-imoveis/imoveis' },
        { title: 'Hóspedes', path: '/gestao-imoveis/hospedes' },
        { title: 'Centros de Custo', path: '/gestao-imoveis/centros-custo' },
        { title: 'Relatórios', path: '/gestao-imoveis/relatorios' },
      ],
    },
    {
      title: 'Gestão de Encomendas',
      icon: Package,
      subItems: [
        { title: 'Painel', path: '/gestao-terceiros/encomendas' },
        { title: 'Tipos de Embalagem', path: '/gestao-terceiros/encomendas/tipos' },
        { title: 'Configurações', path: '/gestao-terceiros/encomendas/configuracoes' },
      ],
    },
    {
      title: 'Cadastros',
      icon: Database,
      subItems: [
        { title: 'Plantas', path: '/gestao-terceiros/cadastros/plantas' },
        { title: 'Locais', path: '/gestao-terceiros/cadastros/locais' },
        { title: 'Empresas', path: '/gestao-terceiros/cadastros/empresas' },
        { title: 'Funções', path: '/gestao-terceiros/cadastros/funcoes' },
        { title: 'Colaboradores', path: '/gestao-terceiros/cadastros/colaboradores' },
        { title: 'Equipamentos', path: '/gestao-terceiros/cadastros/equipamentos' },
        { title: 'Treinamentos', path: '/gestao-terceiros/cadastros/treinamentos' },
        { title: 'Quadro Contratado', path: '/gestao-terceiros/cadastros/quadro-contratado' },
        { title: 'Book de Metas', path: '/gestao-terceiros/cadastros/book-metas' },
      ],
    },
    {
      title: 'Book de Metas',
      icon: Target,
      path: '/gestao-terceiros/metas',
    },
    {
      title: 'Usuários',
      icon: Users,
      path: '/usuarios',
    },
  ]

  const visibleItems = navItems
    .map((item) => {
      if (item.title === 'Gestão de Clientes') {
        if (role !== 'Master') return null
        return item
      }

      const isFilteredByModules =
        (role === 'Administrador' || (role === 'Master' && selectedMasterClient !== 'all')) &&
        activeClient
      if (
        isFilteredByModules &&
        item.title !== 'Usuários' &&
        item.title !== 'Cadastros' &&
        item.title !== 'Gestão de Clientes' &&
        item.title !== 'Gestão de Imóveis'
      ) {
        const hasModule = activeClient?.modules?.includes(item.title)
        if (!hasModule) return null
      }

      if (role === 'Administrador' || role === 'Master') return item

      let userMenus = accessibleMenus
      if (role === 'Operacional' && (!userMenus || userMenus.length === 0)) {
        userMenus = [
          'Lançamentos',
          'Gestão de Encomendas',
          'Cadastros:Colaboradores',
          'Cadastros:Equipamentos',
          'Cadastros:Quadro Contratado',
          'Limpeza e Jardinagem',
          'Gestão de Tarefas',
          'Organograma e Fluxos',
          'Auditoria e Checklist',
          'Gestão de Imóveis',
          'Gestão de Lockers',
          'Book de Metas',
          'Gestão de Acidentes',
        ]
      }

      if (item.subItems) {
        let filteredSubItems = item.subItems

        if (item.title === 'Gestão de Budget') {
          filteredSubItems = item.subItems.filter(
            (sub) =>
              userMenus.includes('Gestão de Budget') ||
              userMenus.includes(`Gestão de Budget:${sub.title}`) ||
              (sub.label && userMenus.includes(`Gestão de Budget:${sub.label}`)) ||
              userMenus.includes(sub.title) ||
              (sub.label && userMenus.includes(sub.label)),
          )
        } else if (item.title === 'Cadastros') {
          filteredSubItems = item.subItems.filter(
            (sub) =>
              userMenus.includes('Cadastros') || userMenus.includes(`Cadastros:${sub.title}`),
          )
        } else if (item.title === 'Gestão de Encomendas') {
          filteredSubItems =
            userMenus.includes('Gestão de Encomendas') || userMenus.includes('Encomendas')
              ? item.subItems
              : []
        } else if (item.title === 'Limpeza e Jardinagem') {
          filteredSubItems = userMenus.includes('Limpeza e Jardinagem') ? item.subItems : []
        } else if (item.title === 'Gestão de Tarefas') {
          filteredSubItems = item.subItems.filter(
            (sub) =>
              userMenus.includes('Gestão de Tarefas') ||
              userMenus.includes(`Gestão de Tarefas:${sub.title}`) ||
              (sub.title === 'Painel de Chamados' &&
                userMenus.includes('Gestão de Tarefas:Painel')) ||
              (sub.title === 'Tipos de Chamado' && userMenus.includes('Gestão de Tarefas:Tipos')),
          )
        } else if (item.title === 'Gestão de Imóveis') {
          filteredSubItems = userMenus.includes('Gestão de Imóveis') ? item.subItems : []
        } else if (item.title === 'Gestão de Lockers') {
          filteredSubItems = userMenus.includes('Gestão de Lockers') ? item.subItems : []
        } else if (item.title === 'Gestão de Acidentes') {
          filteredSubItems = item.subItems.filter(
            (sub) =>
              userMenus.includes('Gestão de Acidentes') ||
              userMenus.includes(`Gestão de Acidentes:${sub.title}`),
          )
        } else if (item.title === 'Organograma e Fluxos') {
          filteredSubItems = item.subItems.filter(
            (sub) =>
              userMenus.includes('Organograma e Fluxos') ||
              userMenus.includes(`Organograma e Fluxos:${sub.title}`),
          )
        } else if (item.title === 'Auditoria e Checklist') {
          filteredSubItems = item.subItems.filter(
            (sub) =>
              userMenus.includes('Auditoria e Checklist') ||
              userMenus.includes(`Auditoria e Checklist:${sub.title}`),
          )
        } else if (item.title === 'Gestão de Terceiros') {
          filteredSubItems = item.subItems.filter((sub) => userMenus.includes(sub.title))
        }

        return { ...item, subItems: filteredSubItems }
      } else {
        if (!userMenus.includes(item.title)) return null
      }

      return item
    })
    .filter((item) => {
      if (!item) return false
      if (role === 'Administrador' || role === 'Master') return true
      return (item.subItems && item.subItems.length > 0) || item.path
    })

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground h-full shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      <SidebarHeader className="p-4 pt-6 pb-8 flex items-center justify-center border-b border-sidebar-border">
        <div className="flex items-center gap-3 w-full pl-2">
          <div className="bg-brand-deepBlue border border-brand-deepBlue/50 p-2.5 rounded-lg shadow-[0_0_10px_rgba(30,58,138,0.4)]">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-sidebar-foreground leading-none">
              Gestão de Facilities
            </span>
            <span className="text-[0.65rem] text-blue-400 uppercase tracking-widest font-semibold mt-1.5 opacity-80">
              {activeClient ? activeClient.name : 'SaaS Mode'}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 pt-6">
        <SidebarMenu>
          {visibleItems.map((item: any) => {
            if (item.subItems) {
              const isSubActive = item.subItems.some((s: any) => {
                if (s.path === '/gestao-terceiros') return location.pathname === '/gestao-terceiros'
                return location.pathname === s.path || location.pathname.startsWith(s.path + '/')
              })

              return (
                <Collapsible
                  key={item.title}
                  defaultOpen={isSubActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="py-5 mb-1 text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-white transition-all duration-300 relative group overflow-hidden">
                        <item.icon className="h-5 w-5 group-hover:text-brand-vividBlue transition-colors" />
                        <span className="font-medium tracking-wide">{item.title}</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="border-sidebar-border mr-0 pr-0 ml-4 pl-3">
                        {item.subItems.map((sub: any) => {
                          const isActive = location.pathname === sub.path

                          return (
                            <SidebarMenuSubItem key={sub.path}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive}
                                className={cn(
                                  'py-4 text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent transition-colors my-0.5 rounded-md',
                                  isActive &&
                                    'bg-brand-vividBlue text-white font-medium shadow-[inset_0_0_8px_rgba(0,0,0,0.2)] border-l-2 border-white/20',
                                )}
                              >
                                <Link to={sub.path}>{sub.label || sub.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            }

            const isActive =
              location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    'py-5 mb-1 text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-white transition-all duration-300 relative group overflow-hidden',
                    isActive &&
                      'bg-sidebar-accent text-white shadow-[inset_0_0_8px_rgba(0,0,0,0.2)] border-l-2 border-white/20',
                  )}
                >
                  <Link to={item.path}>
                    <item.icon className="h-5 w-5 group-hover:text-brand-vividBlue transition-colors" />
                    <span className="font-medium tracking-wide">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  )
}
