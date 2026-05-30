import { useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

const TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export function AutoLogout() {
  const lastActivity = useRef(Date.now())
  const intervalRef = useRef<NodeJS.Timeout>()
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const updateActivity = useCallback(() => {
    lastActivity.current = Date.now()
  }, [])

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, updateActivity))
    return () => events.forEach((e) => window.removeEventListener(e, updateActivity))
  }, [updateActivity])

  useEffect(() => {
    updateActivity()
  }, [location.pathname, updateActivity])

  useEffect(() => {
    if (!user) return

    lastActivity.current = Date.now()

    intervalRef.current = setInterval(() => {
      const idleTime = Date.now() - lastActivity.current
      if (idleTime >= TIMEOUT_MS) {
        handleLogout()
      }
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [user])

  const handleLogout = async () => {
    clearInterval(intervalRef.current)
    await signOut()
    navigate('/login')
  }

  return null
}
