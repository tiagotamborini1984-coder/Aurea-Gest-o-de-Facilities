import { Bell, Search, UserCircle } from 'lucide-react'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useLocation } from 'react-router-dom'

export function AppHeader() {
  const location = useLocation()
  const { isMobile } = useSidebar()

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/clientes':
        return 'Gestão de Clientes'
      case '/gestao-terceiros':
        return 'Gestão de Terceiros'
      default:
        return 'Áurea Facility Management'
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-[#0F4C81] px-4 sm:px-6 shadow-sm text-white">
      <div className="flex items-center gap-2">
        {isMobile && <SidebarTrigger className="text-white hover:bg-white/20" />}
        <h1 className="text-lg font-semibold tracking-tight hidden sm:block">{getPageTitle()}</h1>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4">
        <div className="w-full max-w-sm hidden md:flex relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/50" />
          <Input
            type="search"
            placeholder="Buscar no sistema..."
            className="w-full bg-white/10 border-none text-white placeholder:text-white/50 pl-9 focus-visible:ring-1 focus-visible:ring-[#2B95D6] focus-visible:bg-white/20 transition-all rounded-full h-9"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 rounded-full h-9 w-9"
        >
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notificações</span>
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border-2 border-[#0F4C81]"></span>
        </Button>
        <div className="flex items-center gap-2 pl-2 border-l border-white/20">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-medium leading-none">Master User</span>
            <span className="text-xs text-white/70">Admin Global</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 text-white hover:bg-white/20"
          >
            <UserCircle className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  )
}
