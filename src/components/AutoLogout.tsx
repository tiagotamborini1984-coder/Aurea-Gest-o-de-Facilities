import { useEffect, useCallback, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Clock } from 'lucide-react'

// Timeout de inatividade total: 10 minutos
const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

// Aviso prévio ao usuário quando faltar 1 minuto (60 segundos)
const WARNING_BEFORE_LOGOUT_MS = 60 * 1000 // 1 minute warning
const WARNING_THRESHOLD_MS = IDLE_TIMEOUT_MS - WARNING_BEFORE_LOGOUT_MS // 9 minutes

const STORAGE_KEY = 'aurea_last_user_activity'

export function AutoLogout() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [showWarning, setShowWarning] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(60)

  // Armazena a última atividade em memória e sincroniza com sessionStorage/localStorage
  const lastActivityRef = useRef<number>(Date.now())
  const warningActiveRef = useRef<boolean>(false)
  const isLoggingOutRef = useRef<boolean>(false)

  // Atualiza o timestamp de atividade real do usuário
  const registerActivity = useCallback(() => {
    // Se o usuário interagiu, atualizamos o timestamp
    const now = Date.now()
    lastActivityRef.current = now
    try {
      localStorage.setItem(STORAGE_KEY, String(now))
    } catch {
      // Ignora erro de localStorage caso bloqueado
    }

    if (warningActiveRef.current) {
      warningActiveRef.current = false
      setShowWarning(false)
    }
  }, [])

  // Captura eventos reais de interação do usuário
  useEffect(() => {
    if (!user) return

    // Throttle simples para evitar overhead em eventos de alta frequência como mousemove ou scroll
    let lastThrottledCall = 0
    const throttledHandler = (e?: Event) => {
      // Ignorar cliques/interações sintéticas automáticas se houver
      if (e && !e.isTrusted) return

      const now = Date.now()
      if (now - lastThrottledCall > 500) {
        lastThrottledCall = now
        registerActivity()
      }
    }

    // Eventos de interação humana direta no navegador
    const events: Array<keyof WindowEventMap> = [
      'pointerdown',
      'mousedown',
      'keydown',
      'touchstart',
      'touchmove',
      'wheel',
      'scroll',
      'click',
    ]

    events.forEach((eventName) => {
      window.addEventListener(eventName, throttledHandler, { passive: true, capture: true })
    })

    // Sincronização entre abas: se o usuário estiver ativo em outra aba, não desloga nesta
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const remoteTimestamp = Number(e.newValue)
        if (!isNaN(remoteTimestamp) && remoteTimestamp > lastActivityRef.current) {
          lastActivityRef.current = remoteTimestamp
          if (warningActiveRef.current) {
            warningActiveRef.current = false
            setShowWarning(false)
          }
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, throttledHandler, { capture: true })
      })
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [user, registerActivity])

  // A mudança de rota/navegação pelo app também conta como atividade do usuário
  useEffect(() => {
    if (user) {
      registerActivity()
    }
  }, [location.pathname, user, registerActivity])

  const handleLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return
    isLoggingOutRef.current = true
    setShowWarning(false)
    warningActiveRef.current = false

    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }

    try {
      await signOut()
    } catch (err) {
      console.error('Erro ao efetuar auto logout:', err)
    } finally {
      navigate('/login', { replace: true })
      isLoggingOutRef.current = false
    }
  }, [signOut, navigate])

  // Timer de checagem regular a cada 1 segundo
  useEffect(() => {
    if (!user) {
      setShowWarning(false)
      warningActiveRef.current = false
      return
    }

    // Inicializa o timestamp ao logar
    const now = Date.now()
    lastActivityRef.current = now
    try {
      localStorage.setItem(STORAGE_KEY, String(now))
    } catch {
      // ignore
    }

    const interval = setInterval(() => {
      if (isLoggingOutRef.current) return

      // Obter o timestamp mais recente entre memória local e localStorage
      let mostRecent = lastActivityRef.current
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const val = Number(stored)
          if (!isNaN(val) && val > mostRecent) {
            mostRecent = val
            lastActivityRef.current = val
          }
        }
      } catch {
        // ignore
      }

      const idleTime = Date.now() - mostRecent

      // Se passou de 10 minutos (600.000 ms), desloga
      if (idleTime >= IDLE_TIMEOUT_MS) {
        handleLogout()
        return
      }

      // Se está nos últimos 60 segundos (entre 9min e 10min), exibe aviso com contagem regressiva
      if (idleTime >= WARNING_THRESHOLD_MS) {
        const remainingMs = IDLE_TIMEOUT_MS - idleTime
        const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000))
        setSecondsRemaining(remainingSec)
        if (!warningActiveRef.current) {
          warningActiveRef.current = true
          setShowWarning(true)
        }
      } else if (warningActiveRef.current) {
        warningActiveRef.current = false
        setShowWarning(false)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [user, handleLogout])

  const handleContinueSession = () => {
    registerActivity()
  }

  if (!showWarning || !user) {
    return null
  }

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent className="max-w-md bg-white text-slate-900 border border-slate-200 shadow-2xl">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3 text-amber-600">
            <div className="p-2.5 bg-amber-50 rounded-full border border-amber-200">
              <Clock className="w-6 h-6 text-amber-600 animate-pulse" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-slate-900">
              Sessão Prestes a Expirar
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-slate-600 leading-relaxed">
            Você está inativo há quase 10 minutos. Para a sua segurança, seu login será encerrado
            automaticamente em:
          </AlertDialogDescription>
          <div className="flex items-center justify-center p-4 bg-amber-50/80 rounded-lg border border-amber-200">
            <span className="text-3xl font-extrabold text-amber-600 tracking-tight">
              {secondsRemaining} {secondsRemaining === 1 ? 'segundo' : 'segundos'}
            </span>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            Sair agora
          </button>
          <AlertDialogAction
            onClick={handleContinueSession}
            className="w-full sm:w-auto bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-semibold"
          >
            Continuar Conectado
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
