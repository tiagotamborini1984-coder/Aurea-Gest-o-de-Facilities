import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { useAppStore } from '@/store/AppContext'
import { hexToHsl } from '@/lib/color-utils'

export default function Layout() {
  const { activeClient } = useAppStore()

  useEffect(() => {
    if (activeClient?.primaryColor) {
      const hsl = hexToHsl(activeClient.primaryColor)
      document.documentElement.style.setProperty('--primary', hsl)
      document.documentElement.style.setProperty('--sidebar-background', hsl)
    } else {
      document.documentElement.style.removeProperty('--primary')
      document.documentElement.style.removeProperty('--sidebar-background')
    }
  }, [activeClient])

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden transition-colors duration-500">
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 animate-fade-in relative pb-16">
            <Outlet />
          </main>
          <footer className="absolute bottom-0 left-0 right-0 h-12 flex items-center justify-center border-t border-brand-light bg-white/80 backdrop-blur-sm z-10">
            <p className="text-xs text-muted-foreground font-medium">
              Módulo do Sistema Áurea – Desenvolvido por Tiago Tamborini
            </p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  )
}
