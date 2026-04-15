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

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 lg:h-16 shrink-0 items-center gap-3 lg:gap-4 border-b border-border bg-white/95 backdrop-blur-md px-4 sm:px-6 shadow-sm text-foreground transition-colors duration-500 print:hidden">
        <div className="flex items-center gap-2">
          {isMobile && (
            <SidebarTrigger className="text-slate-600 hover:text-brand-deepBlue hover:bg-slate-100" />
          )}
          <h1 className="text-base lg:text-lg font-semibold tracking-tight hidden sm:block text-brand-graphite">
            Gestão de Facilities
          </h1>
          {profile?.role === 'Master' && (
            <div className="hidden md:flex items-center ml-4">
              <Select value={selectedMasterClient} onValueChange={setSelectedMasterClient}>
                <SelectTrigger className="w-[200px] h-8 text-xs bg-slate-100/50 border-border rounded-full focus:ring-1 focus:ring-brand-deepBlue">
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
              className="w-full bg-slate-100/50 border-border text-slate-800 placeholder:text-slate-500 pl-9 focus-visible:ring-1 focus-visible:ring-brand-deepBlue focus-visible:bg-white transition-all rounded-full h-8 lg:h-9 text-xs lg:text-sm"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-600 hover:text-brand-deepBlue hover:bg-slate-100 rounded-full h-8 w-8 lg:h-9 lg:w-9 relative"
          >
            <Bell className="h-4 w-4 lg:h-5 lg:w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-deepBlue border-2 border-white shadow-sm"></span>
          </Button>

          <div className="flex items-center gap-3 pl-3 border-l border-border">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] font-semibold leading-none text-brand-deepBlue uppercase tracking-wider">
                {profile?.role || 'User'}
              </span>
              <span className="text-xs text-slate-600 truncate max-w-[150px] mt-1">
                {profile?.name || 'Loading...'}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-8 w-8 lg:h-9 lg:w-9 text-slate-600 hover:text-brand-deepBlue hover:bg-slate-100"
                >
                  <UserCircle className="h-5 w-5 lg:h-6 lg:w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 mt-2 border-border/50 bg-white/95 backdrop-blur-lg"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-slate-800">
                      {profile?.name}
                    </p>
                    <p className="text-xs leading-none text-slate-600">{profile?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-brand-deepBlue focus:text-white text-slate-700"
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
