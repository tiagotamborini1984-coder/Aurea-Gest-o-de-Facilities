import { useState } from 'react'
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
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useAppStore } from '@/store/AppContext'
import { AccountSettingsDialog } from './AccountSettingsDialog'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AppHeader() {
  const navigate = useNavigate()
  const { isMobile } = useSidebar()
  const { signOut } = useAuth()
  const { profile, clients, selectedMasterClient, setSelectedMasterClient } = useAppStore()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 lg:h-16 shrink-0 items-center gap-3 lg:gap-4 border-b border-border bg-background/95 backdrop-blur-md px-4 sm:px-6 shadow-sm text-foreground transition-colors duration-500 print:hidden">
        <div className="flex items-center gap-2">
          {isMobile && (
            <SidebarTrigger className="text-muted-foreground hover:text-foreground hover:bg-muted" />
          )}
          <h1 className="text-base lg:text-lg font-semibold tracking-tight hidden sm:block text-foreground">
            Gestão de Facilities
          </h1>
          {profile?.role === 'Master' && (
            <div className="hidden md:flex items-center ml-4">
              <Select value={selectedMasterClient} onValueChange={setSelectedMasterClient}>
                <SelectTrigger className="w-[200px] h-8 text-xs bg-muted/50 border-border rounded-full focus:ring-1 focus:ring-primary text-foreground">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Visão Consolidada</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end gap-3 lg:gap-4">
          <div className="w-full max-w-sm hidden md:flex relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="search"
              placeholder="Buscar no sistema..."
              className="w-full bg-muted/50 border-border text-foreground placeholder:text-muted-foreground pl-9 focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background transition-all rounded-full h-8 lg:h-9 text-xs lg:text-sm"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full h-8 w-8 lg:h-9 lg:w-9 relative"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 lg:h-5 lg:w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 lg:h-5 lg:w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full h-8 w-8 lg:h-9 lg:w-9 relative"
          >
            <Bell className="h-4 w-4 lg:h-5 lg:w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary border-2 border-background shadow-sm"></span>
          </Button>

          <div className="flex items-center gap-3 pl-3 border-l border-border">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] font-semibold leading-none text-primary uppercase tracking-wider">
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
                  className="rounded-full h-8 w-8 lg:h-9 lg:w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <UserCircle className="h-5 w-5 lg:h-6 lg:w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 mt-2 border-border/50 bg-popover/95 backdrop-blur-lg text-popover-foreground"
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
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-primary focus:text-primary-foreground text-foreground"
                  onClick={() => setIsSettingsOpen(true)}
                >
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

      <AccountSettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  )
}
