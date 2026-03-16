import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'
import { AutoLogout } from './AutoLogout'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-light">
        <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <>
      <AutoLogout />
      <Outlet />
    </>
  )
}
