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
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/95 backdrop-blur-md px-4 sm:px-6 shadow-sm text-foreground transition-colors duration-500 print:hidden">
      <div className="flex items-center gap-2">
        {isMobile && (
          <SidebarTrigger className="text-muted-foreground hover:text-brand-cyan hover:bg-brand-cyan/10" />
        )}
        <h1 className="text-lg font-semibold tracking-tight hidden sm:block text-brand-cyan drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]">
          Gestão de Facilities
        </h1>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4">
        <div className="w-full max-w-sm hidden md:flex relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar no sistema..."
            className="w-full bg-muted/50 border-border text-foreground placeholder:text-muted-foreground pl-9 focus-visible:ring-1 focus-visible:ring-brand-cyan focus-visible:bg-muted transition-all rounded-full h-9"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-brand-cyan hover:bg-brand-cyan/10 rounded-full h-9 w-9 relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-cyan border-2 border-background shadow-[0_0_5px_rgba(0,255,255,0.8)]"></span>
        </Button>

        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-semibold leading-none text-brand-cyan uppercase tracking-wider text-[10px]">
              {profile?.role || 'User'}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[150px] mt-1">
              {profile?.name || 'Loading...'}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 text-muted-foreground hover:text-brand-cyan hover:bg-brand-cyan/10"
              >
                <UserCircle className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 mt-2 border-border/50 bg-card/95 backdrop-blur-lg"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {profile?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="cursor-pointer hover:text-brand-cyan">
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações da Conta</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Encerrar Sessão</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
