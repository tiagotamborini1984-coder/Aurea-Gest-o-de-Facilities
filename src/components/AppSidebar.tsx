import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  Database,
  FileBarChart,
  PieChart,
  History,
  Users,
  Triangle,
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
      // Filter subItems for Operacional role
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
    <Sidebar className="border-none bg-[var(--sidebar-background)] text-white">
      <SidebarHeader className="p-4 pt-6 pb-8 flex items-center justify-center border-b border-white/10">
        <div className="flex items-center gap-3">
          {activeClient?.logo ? (
            <img
              src={activeClient.logo}
              alt="Logo"
              className="h-8 w-8 object-contain bg-white rounded p-1"
            />
          ) : (
            <div className="bg-white/10 p-2 rounded-lg">
              <Triangle className="h-6 w-6 text-brand-cyan fill-current -rotate-90" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight text-white leading-none">
              {activeClient ? activeClient.name : 'Áurea'}
            </span>
            <span className="text-[0.65rem] text-white/70 uppercase tracking-widest font-medium mt-1">
              Gestão de Terceiros
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
                      <SidebarMenuButton className="py-5 mb-1 text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200">
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.title}</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="border-white/20 mr-0 pr-0">
                        {item.subItems.map((sub) => {
                          const isActive = location.pathname === sub.path
                          return (
                            <SidebarMenuSubItem key={sub.path}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive}
                                className={cn(
                                  'py-4 text-white/60 hover:text-white hover:bg-white/10 transition-colors',
                                  isActive && 'bg-white/20 text-white font-medium',
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
                    'w-full mb-1 transition-all duration-200 py-5',
                    isActive
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                  )}
                >
                  <Link to={item.path} className="flex items-center gap-3">
                    <item.icon
                      className={cn('h-5 w-5', isActive ? 'text-white' : 'text-white/70')}
                    />
                    <span className="font-medium">{item.title}</span>
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
