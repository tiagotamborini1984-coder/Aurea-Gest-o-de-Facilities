import { Navigate, Outlet } from 'react-router-dom'
import { useAppStore } from '@/store/AppContext'

export function MasterGuard() {
  const { profile } = useAppStore()

  if (profile?.role !== 'Master') {
    return <Navigate to="/gestao-terceiros" replace />
  }

  return <Outlet />
}
