import { Outlet } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'

export default function Layout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 animate-fade-in relative pb-16">
            <Outlet />
          </main>
          <footer className="absolute bottom-0 left-0 right-0 h-12 flex items-center justify-center border-t bg-white/50 backdrop-blur-sm z-10">
            <p className="text-xs text-muted-foreground">
              Módulo do Sistema Áurea – Desenvolvido por Tiago Tamborini
            </p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  )
}
