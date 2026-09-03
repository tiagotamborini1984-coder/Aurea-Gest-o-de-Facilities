import { Outlet } from 'react-router-dom'
import { useEffect, useMemo, memo } from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { useAppStore } from '@/store/AppContext'
import { hexToHsl } from '@/lib/color-utils'

const MainContent = memo(function MainContent() {
  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 animate-fade-in relative print:p-0 print:overflow-visible">
      <Outlet />
    </main>
  )
})

export default function Layout() {
  const { activeClient } = useAppStore()

  const applyClientColors = useMemo(
    () => (client: typeof activeClient) => {
      const isDark = document.documentElement.classList.contains('dark')

      if (client?.primaryColor) {
        const hsl = hexToHsl(client.primaryColor)
        document.documentElement.style.setProperty('--primary', hsl)
        if (!isDark) {
          document.documentElement.style.setProperty('--sidebar-background', hsl)
        } else {
          document.documentElement.style.removeProperty('--sidebar-background')
        }
      } else {
        document.documentElement.style.removeProperty('--primary')
        document.documentElement.style.removeProperty('--sidebar-background')
      }

      if (client?.secondaryColor) {
        const secondaryHsl = hexToHsl(client.secondaryColor)
        document.documentElement.style.setProperty('--secondary', secondaryHsl)
        document.documentElement.style.setProperty('--secondary-foreground', '0 0% 100%')
        document.documentElement.style.setProperty('--sidebar-primary', secondaryHsl)
      } else {
        document.documentElement.style.removeProperty('--secondary')
        document.documentElement.style.removeProperty('--secondary-foreground')
        document.documentElement.style.removeProperty('--sidebar-primary')
      }
    },
    [],
  )

  useEffect(() => {
    applyClientColors(activeClient)
  }, [activeClient, applyClientColors])

  useEffect(() => {
    let rafId: number
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        applyClientColors(activeClient)
      })
    })

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [activeClient, applyClientColors])

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden transition-colors duration-500">
        <div className="print:hidden h-full">
          <AppSidebar />
        </div>
        <div className="flex flex-col flex-1 w-full overflow-hidden print:w-full print:block">
          <div className="print:hidden">
            <AppHeader />
          </div>
          <MainContent />
        </div>
      </div>
    </SidebarProvider>
  )
}
