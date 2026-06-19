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
    const isDark = document.documentElement.classList.contains('dark')

    if (activeClient?.primaryColor) {
      const hsl = hexToHsl(activeClient.primaryColor)
      document.documentElement.style.setProperty('--primary', hsl)
      // Only apply custom sidebar background in light mode
      if (!isDark) {
        document.documentElement.style.setProperty('--sidebar-background', hsl)
      } else {
        document.documentElement.style.removeProperty('--sidebar-background')
      }
    } else {
      document.documentElement.style.removeProperty('--primary')
      document.documentElement.style.removeProperty('--sidebar-background')
    }

    if (activeClient?.secondaryColor) {
      const secondaryHsl = hexToHsl(activeClient.secondaryColor)
      document.documentElement.style.setProperty('--secondary', secondaryHsl)
      document.documentElement.style.setProperty('--sidebar-primary', secondaryHsl)
    } else {
      document.documentElement.style.removeProperty('--secondary')
      document.documentElement.style.removeProperty('--sidebar-primary')
    }
  }, [activeClient])

  // Create an observer to watch for class changes on the html element (dark mode toggle)
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark')
          if (activeClient?.primaryColor) {
            if (isDark) {
              document.documentElement.style.removeProperty('--sidebar-background')
            } else {
              const hsl = hexToHsl(activeClient.primaryColor)
              document.documentElement.style.setProperty('--sidebar-background', hsl)
            }
          }
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [activeClient])

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
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 animate-fade-in relative print:p-0 print:overflow-visible">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
