import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
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
  activeClient: Client | null
  selectedMasterClient: string | 'all'
  setSelectedMasterClient: (id: string | 'all') => void
  addClient: (client: Omit<Client, 'id' | 'url' | 'packageAlertDays'>) => Promise<boolean>
  updateClient: (id: string, data: Partial<Omit<Client, 'id' | 'url'>>) => Promise<boolean>
  deleteClient: (id: string) => Promise<boolean>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeClient, setActiveClient] = useState<Client | null>(null)
  const [selectedMasterClient, setSelectedMasterClient] = useState<string | 'all'>('all')

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data as Profile)
        })
    } else {
      setProfile(null)
      setActiveClient(null)
      setClients([])
    }
  }, [user])

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

  const fetchClients = async () => {
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
  }

  useEffect(() => {
    if (user && profile?.role === 'Master') fetchClients()
  }, [user, profile])

  const addClient = async (client: Omit<Client, 'id' | 'url' | 'packageAlertDays'>) => {
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
  }

  const updateClient = async (id: string, data: Partial<Omit<Client, 'id' | 'url'>>) => {
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
  }

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (!error) {
      await fetchClients()
      return true
    }
    return false
  }

  return (
    <AppContext.Provider
      value={{
        clients,
        isLoadingClients,
        profile,
        activeClient,
        selectedMasterClient,
        setSelectedMasterClient,
        addClient,
        updateClient,
        deleteClient,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useAppStore = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppStore must be used within AppProvider')
  return context
}
