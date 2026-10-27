import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useMemo,
  useCallback,
} from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

export type Client = {
  id: string
  name: string
  slug: string
  url: string
  adminName: string
  logo?: string
  primaryColor?: string
  secondaryColor?: string
  status: 'Ativo' | 'Inativo'
  modules: string[]
  packageAlertDays: number
}

export type Profile = {
  id: string
  client_id?: string
  name: string
  email: string
  role: 'Master' | 'Administrador' | 'Gestor' | 'Operacional'
  accessible_menus: string[]
  authorized_plants: string[]
}

interface AppContextType {
  clients: Client[]
  isLoadingClients: boolean
  profile: Profile | null
  isLoadingProfile: boolean
  activeClient: Client | null
  activePlant?: string
  selectedMasterClient: string | 'all'
  setSelectedMasterClient: (id: string | 'all') => void
  selectedPlant: string | 'all'
  setSelectedPlant: (id: string | 'all') => void
  addClient: (client: Omit<Client, 'id' | 'url' | 'packageAlertDays'>) => Promise<boolean>
  updateClient: (id: string, data: Partial<Omit<Client, 'id' | 'url'>>) => Promise<boolean>
  deleteClient: (id: string) => Promise<boolean>
  reloadProfile: () => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const PROFILE_CACHE_PREFIX = 'aurea_cached_profile_'

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(true)

  // Tenta restaurar do cache local para render imediato sem flash de estado vazio
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      if (typeof window !== 'undefined' && user?.id) {
        const cached = localStorage.getItem(`${PROFILE_CACHE_PREFIX}${user.id}`)
        if (cached) return JSON.parse(cached)
      }
    } catch {
      // ignore
    }
    return null
  })
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true)
  const [activeClient, setActiveClient] = useState<Client | null>(null)
  const [selectedMasterClient, setSelectedMasterClient] = useState<string | 'all'>('all')
  const [selectedPlant, setSelectedPlant] = useState<string | 'all'>('all')

  const fetchProfileWithRetry = useCallback(
    async (userId: string, retries = 3): Promise<Profile | null> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle()

          if (error) {
            console.warn(
              `[AppContext] Tentativa ${attempt} ao buscar profile falhou:`,
              error.message,
            )
            if (attempt < retries) {
              await new Promise((res) => setTimeout(res, attempt * 400))
              continue
            }
            return null
          }

          if (data) {
            const parsedMenus = Array.isArray(data.accessible_menus)
              ? (data.accessible_menus as string[])
              : typeof data.accessible_menus === 'string'
                ? (() => {
                    try {
                      const parsed = JSON.parse(data.accessible_menus)
                      return Array.isArray(parsed) ? parsed : []
                    } catch {
                      return []
                    }
                  })()
                : []
            const rawMenus = Array.from(new Set(parsedMenus.filter(Boolean)))

            const parsedPlants = Array.isArray(data.authorized_plants)
              ? (data.authorized_plants as string[])
              : typeof data.authorized_plants === 'string'
                ? (() => {
                    try {
                      const parsed = JSON.parse(data.authorized_plants)
                      return Array.isArray(parsed) ? parsed : []
                    } catch {
                      return []
                    }
                  })()
                : []
            const rawPlants = Array.from(new Set(parsedPlants.filter(Boolean)))

            const loadedProfile: Profile = {
              ...(data as any),
              accessible_menus: rawMenus,
              authorized_plants: rawPlants,
            }

            try {
              localStorage.setItem(
                `${PROFILE_CACHE_PREFIX}${userId}`,
                JSON.stringify(loadedProfile),
              )
            } catch {
              // ignore
            }

            return loadedProfile
          }
          return null
        } catch (err) {
          console.warn(`[AppContext] Exceção tentativa ${attempt} ao buscar profile:`, err)
          if (attempt < retries) {
            await new Promise((res) => setTimeout(res, attempt * 400))
          }
        }
      }
      return null
    },
    [],
  )

  const reloadProfile = useCallback(async () => {
    if (!user) return
    setIsLoadingProfile(true)
    const loaded = await fetchProfileWithRetry(user.id, 2)
    if (loaded) {
      setProfile(loaded)
    }
    setIsLoadingProfile(false)
  }, [user, fetchProfileWithRetry])

  useEffect(() => {
    let mounted = true
    if (user) {
      // Carrega cache imediato se houver
      try {
        const cached = localStorage.getItem(`${PROFILE_CACHE_PREFIX}${user.id}`)
        if (cached && mounted) {
          setProfile(JSON.parse(cached))
        }
      } catch {
        // ignore
      }

      setIsLoadingProfile(true)
      fetchProfileWithRetry(user.id, 3).then((loaded) => {
        if (!mounted) return
        if (loaded) {
          setProfile(loaded)
        } else {
          // Se falhou todas as tentativas mas temos cache, mantém o cache
          setProfile((prev) => {
            if (prev) return prev
            try {
              const cached = localStorage.getItem(`${PROFILE_CACHE_PREFIX}${user.id}`)
              return cached ? JSON.parse(cached) : null
            } catch {
              return null
            }
          })
        }
        setIsLoadingProfile(false)
      })
    } else {
      setProfile(null)
      setIsLoadingProfile(false)
      setActiveClient(null)
      setClients([])
    }
    return () => {
      mounted = false
    }
  }, [user, fetchProfileWithRetry])

  useEffect(() => {
    const clientIdToFetch =
      profile?.role === 'Master' && selectedMasterClient !== 'all'
        ? selectedMasterClient
        : profile?.client_id

    if (clientIdToFetch) {
      supabase
        .from('clients')
        .select('*')
        .eq('id', clientIdToFetch)
        .single()
        .then(({ data }) => {
          if (data) {
            setActiveClient({
              id: data.id,
              name: data.name,
              slug: data.url_slug,
              url: `${window.location.origin}/${data.url_slug}`,
              adminName: data.admin_name,
              logo: data.logo_url || undefined,
              primaryColor: data.primary_color || undefined,
              secondaryColor: data.secondary_color || undefined,
              status: data.status as 'Ativo' | 'Inativo',
              modules: (data.modules as string[]) || [],
              packageAlertDays: (data as any).package_alert_days ?? 3,
            })
          }
        })
    } else {
      setActiveClient(null)
    }
  }, [profile, selectedMasterClient])

  const fetchClients = useCallback(async () => {
    setIsLoadingClients(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    if (data && !error) {
      setClients(
        data.map((d) => ({
          id: d.id,
          name: d.name,
          slug: d.url_slug,
          url: `${window.location.origin}/${d.url_slug}`,
          adminName: d.admin_name,
          logo: d.logo_url || undefined,
          primaryColor: d.primary_color || undefined,
          secondaryColor: d.secondary_color || undefined,
          status: d.status as 'Ativo' | 'Inativo',
          modules: (d.modules as string[]) || [],
          packageAlertDays: (d as any).package_alert_days ?? 3,
        })),
      )
    }
    setIsLoadingClients(false)
  }, [])

  useEffect(() => {
    if (user && profile?.role === 'Master') fetchClients()
  }, [user, profile])

  const addClient = useCallback(
    async (client: Omit<Client, 'id' | 'url' | 'packageAlertDays'>) => {
      const { data, error } = await supabase
        .from('clients')
        .insert([
          {
            name: client.name,
            url_slug: client.slug,
            admin_name: client.adminName,
            logo_url: client.logo,
            primary_color: client.primaryColor,
            secondary_color: client.secondaryColor,
            status: client.status,
            modules: client.modules,
          },
        ])
        .select()
        .single()
      if (data && !error) {
        await fetchClients()
        return true
      }
      return false
    },
    [fetchClients],
  )

  const updateClient = useCallback(
    async (id: string, data: Partial<Omit<Client, 'id' | 'url'>>) => {
      const payload: any = {
        name: data.name,
        url_slug: data.slug,
        admin_name: data.adminName,
        logo_url: data.logo,
        primary_color: data.primaryColor,
        secondary_color: data.secondaryColor,
        status: data.status,
        modules: data.modules,
        package_alert_days: data.packageAlertDays,
      }
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])
      const { error } = await supabase.from('clients').update(payload).eq('id', id)
      if (!error) {
        await fetchClients()
        return true
      }
      return false
    },
    [fetchClients],
  )

  const deleteClient = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (!error) {
        await fetchClients()
        return true
      }
      return false
    },
    [fetchClients],
  )

  const contextValue = useMemo(
    () => ({
      clients,
      isLoadingClients,
      profile,
      isLoadingProfile,
      activeClient,
      activePlant: selectedPlant !== 'all' ? selectedPlant : undefined,
      selectedMasterClient,
      setSelectedMasterClient,
      selectedPlant,
      setSelectedPlant,
      addClient,
      updateClient,
      deleteClient,
      reloadProfile,
    }),
    [
      clients,
      isLoadingClients,
      profile,
      isLoadingProfile,
      activeClient,
      selectedMasterClient,
      selectedPlant,
      addClient,
      updateClient,
      deleteClient,
      reloadProfile,
    ],
  )

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
}

export const useAppStore = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppStore must be used within AppProvider')
  return context
}
