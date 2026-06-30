import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  loading: boolean
  refreshing: boolean
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let mounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setSession(null)
        setUser(null)
        setRefreshing(false)
      } else if (event === 'TOKEN_REFRESHED') {
        setRefreshing(false)
        if (session) {
          setSession(session)
          setUser(session.user)
        }
      } else if (event === 'USER_UPDATED' && session) {
        setSession(session)
        setUser(session.user)
      } else if (session) {
        setSession(session)
        setUser(session.user)
      }
      setLoading(false)
    })

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return
        if (error) console.error('Session fetch error:', error.message)
        if (session) {
          setSession(session)
          setUser(session.user)
        } else {
          setSession(null)
          setUser(null)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to get session:', err)
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (!s) {
          setRefreshing(true)
          supabase.auth.refreshSession().finally(() => setRefreshing(false))
        }
      })
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    if (!session) return
    const interval = setInterval(
      () => {
        supabase.auth.getSession().then(({ data: { session: s } }) => {
          if (!s) {
            setRefreshing(true)
            supabase.auth.refreshSession().finally(() => setRefreshing(false))
          }
        })
      },
      5 * 60 * 1000,
    )
    return () => clearInterval(interval)
  }, [session])

  const refreshSession = useCallback(async () => {
    setRefreshing(true)
    const { error } = await supabase.auth.refreshSession()
    if (error) {
      console.error('Session refresh failed:', error.message)
      setRefreshing(false)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return (
    <AuthContext.Provider
      value={{ user, session, signIn, signOut, loading, refreshing, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  )
}
