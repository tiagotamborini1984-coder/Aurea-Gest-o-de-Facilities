import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const WARNING_MS = 60 * 1000 // 60 seconds

export function AutoLogout() {
  const [warningOpen, setWarningOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const lastActivity = useRef(Date.now())
  const intervalRef = useRef<NodeJS.Timeout>()
  const warningIntervalRef = useRef<NodeJS.Timeout>()
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const updateActivity = useCallback(() => {
    if (!warningOpen) {
      lastActivity.current = Date.now()
    }
  }, [warningOpen])

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, updateActivity))
    return () => events.forEach((e) => window.removeEventListener(e, updateActivity))
  }, [updateActivity])

  useEffect(() => {
    if (!user) return

    intervalRef.current = setInterval(() => {
      const idleTime = Date.now() - lastActivity.current
      if (idleTime >= TIMEOUT_MS) {
        handleLogout()
      } else if (idleTime >= TIMEOUT_MS - WARNING_MS && !warningOpen) {
        setWarningOpen(true)
        setTimeLeft(60)
      }
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [user, warningOpen])

  useEffect(() => {
    if (warningOpen) {
      warningIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleLogout()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(warningIntervalRef.current)
    }
    return () => clearInterval(warningIntervalRef.current)
  }, [warningOpen])

  const handleLogout = async () => {
    clearInterval(intervalRef.current)
    clearInterval(warningIntervalRef.current)
    setWarningOpen(false)
    await signOut()
    navigate('/login')
  }

  const stayLoggedIn = () => {
    lastActivity.current = Date.now()
    setWarningOpen(false)
  }

  if (!warningOpen) return null

  return (
    <Dialog open={warningOpen} onOpenChange={(open) => !open && stayLoggedIn()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sessão Expirando</DialogTitle>
          <DialogDescription>
            Por motivos de segurança, sua sessão será encerrada em{' '}
            <span className="font-bold text-foreground">{timeLeft} segundos</span> por inatividade.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleLogout}>
            Sair Agora
          </Button>
          <Button onClick={stayLoggedIn}>Continuar Conectado</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
