import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  Database,
  FileBarChart,
  PieChart,
  History,
  Users,
  Building2,
  Mail,
  ChevronRight,
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
  const { profile, activeClient } = useAppStore()
  const role = profile?.role || 'Operacional'
  const accessibleMenus = profile?.accessible_menus || []

  const navItems = [
    { title: 'Dashboard Gestor', path: '/gestao-terceiros', icon: LayoutDashboard },
    { title: 'Lançamentos', path: '/gestao-terceiros/lancamentos', icon: ClipboardList },
    {
      title: 'Cadastros',
      path: '/gestao-terceiros/cadastros',
      icon: Database,
      subItems: [
        { title: 'Plantas', path: '/gestao-terceiros/cadastros/plantas' },
        { title: 'Locais', path: '/gestao-terceiros/cadastros/locais' },
        { title: 'Funções', path: '/gestao-terceiros/cadastros/funcoes' },
        { title: 'Colaboradores', path: '/gestao-terceiros/cadastros/colaboradores' },
        { title: 'Equipamentos', path: '/gestao-terceiros/cadastros/equipamentos' },
        { title: 'Quadro Contratado', path: '/gestao-terceiros/cadastros/quadro-contratado' },
        { title: 'Book de Metas', path: '/gestao-terceiros/cadastros/book-metas' },
      ],
    },
    { title: 'Relatórios', path: '/gestao-terceiros/relatorios', icon: FileBarChart },
    { title: 'BI Dashboard', path: '/gestao-terceiros/bi', icon: PieChart },
    { title: 'Email Reports', path: '/gestao-terceiros/email-reports', icon: Mail },
    { title: 'Log de Auditoria', path: '/gestao-terceiros/auditoria', icon: History },
    { title: 'Usuários', path: '/gestao-terceiros/usuarios', icon: Users },
  ]

  const visibleItems = navItems
    .filter((item) => {
      if (role === 'Administrador' || role === 'Master') return true
      if (role === 'Gestor') return accessibleMenus.includes(item.title)
      if (role === 'Operacional') {
        if (item.title === 'Lançamentos') return true
        if (item.title === 'Cadastros') return true
        return false
      }
      return false
    })
    .map((item) => {
      if (role === 'Operacional' && item.title === 'Cadastros' && item.subItems) {
        return {
          ...item,
          subItems: item.subItems.filter((sub) =>
            ['Colaboradores', 'Equipamentos', 'Quadro Contratado'].includes(sub.title),
          ),
        }
      }
      return item
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
          {visibleItems.map((item) => {
            if (item.subItems) {
              const isSubActive = item.subItems.some((s) => location.pathname === s.path)
              return (
                <Collapsible
                  key={item.path}
                  defaultOpen={isSubActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="py-5 mb-1 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white transition-all duration-300 relative group overflow-hidden">
                        <item.icon className="h-5 w-5 group-hover:text-brand-vividBlue transition-colors" />
                        <span className="font-medium tracking-wide">{item.title}</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="border-sidebar-border mr-0 pr-0 ml-4 pl-3">
                        {item.subItems.map((sub) => {
                          const isActive = location.pathname === sub.path
                          return (
                            <SidebarMenuSubItem key={sub.path}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive}
                                className={cn(
                                  'py-4 text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent transition-colors my-0.5 rounded-md',
                                  isActive &&
                                    'bg-brand-vividBlue text-white font-medium shadow-[inset_0_0_8px_rgba(0,0,0,0.2)] border-l-2 border-white/20',
                                )}
                              >
                                <Link to={sub.path}>{sub.title}</Link>
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

            const isActive = location.pathname === item.path
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    'w-full mb-1 transition-all duration-300 py-5 rounded-md relative overflow-hidden group',
                    isActive
                      ? 'bg-brand-vividBlue text-white shadow-[inset_0_0_12px_rgba(0,0,0,0.2)] border-l-4 border-white/20'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white',
                  )}
                >
                  <Link to={item.path} className="flex items-center gap-3">
                    <item.icon
                      className={cn(
                        'h-5 w-5 transition-colors',
                        isActive
                          ? 'text-white'
                          : 'text-sidebar-foreground/70 group-hover:text-white',
                      )}
                    />
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
