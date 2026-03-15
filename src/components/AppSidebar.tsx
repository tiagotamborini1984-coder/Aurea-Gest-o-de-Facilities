import { Link, useLocation } from 'react-router-dom'
import { Building2, Triangle } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

export function AppSidebar() {
  const location = useLocation()

  const navItems = [{ title: 'Gestão de Clientes', path: '/clientes', icon: Building2 }]

  return (
    <Sidebar className="border-none bg-[#0F4C81] text-white">
      <SidebarHeader className="p-4 pt-6 pb-8 flex items-center justify-center border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg">
            <Triangle className="h-6 w-6 text-[#2B95D6] fill-current -rotate-90" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight text-white leading-none">Áurea</span>
            <span className="text-[0.65rem] text-white/70 uppercase tracking-widest font-medium">
              Facility Mgt
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 pt-6">
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    'w-full mb-1 transition-all duration-200 py-5',
                    isActive
                      ? 'bg-[#2B95D6] text-white hover:bg-[#2B95D6]/90 hover:text-white shadow-sm'
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
