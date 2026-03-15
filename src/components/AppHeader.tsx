import { Bell, Search, UserCircle, LogOut, Settings } from 'lucide-react'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useAppStore } from '@/store/AppContext'

export function AppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isMobile } = useSidebar()
  const { signOut } = useAuth()
  const { profile } = useAppStore()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-[var(--primary)] px-4 sm:px-6 shadow-sm text-white transition-colors duration-500">
      <div className="flex items-center gap-2">
        {isMobile && <SidebarTrigger className="text-white hover:bg-white/20" />}
        <h1 className="text-lg font-semibold tracking-tight hidden sm:block">
          Gestão de Facilities
        </h1>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4">
        <div className="w-full max-w-sm hidden md:flex relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/50" />
          <Input
            type="search"
            placeholder="Buscar no sistema..."
            className="w-full bg-white/10 border-none text-white placeholder:text-white/50 pl-9 focus-visible:ring-1 focus-visible:ring-secondary focus-visible:bg-white/20 transition-all rounded-full h-9"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 rounded-full h-9 w-9 relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-secondary border-2 border-[var(--primary)]"></span>
        </Button>

        <div className="flex items-center gap-2 pl-2 border-l border-white/20">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-medium leading-none">{profile?.role || 'User'}</span>
            <span className="text-xs text-white/70 truncate max-w-[150px]">
              {profile?.name || 'Loading...'}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 text-white hover:bg-white/20"
              >
                <UserCircle className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações da Conta</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair do Sistema</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
