import { Navigate, Outlet } from 'react-router-dom'
import { useAppStore } from '@/store/AppContext'

export function ProtectedRoute() {
  const { isAuthenticated } = useAppStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
