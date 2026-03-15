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
}

export type ThirdParty = {
  id: string
  name: string
  cnpj: string
  status: 'Regularizado' | 'Pendente' | 'Inativo'
  contractEnd: string
  services: string
}

interface AppContextType {
  clients: Client[]
  isLoadingClients: boolean
  addClient: (client: Omit<Client, 'id' | 'url'>) => Promise<boolean>
  updateClient: (id: string, data: Partial<Omit<Client, 'id' | 'url'>>) => Promise<boolean>
  deleteClient: (id: string) => Promise<boolean>
  thirdParties: ThirdParty[]
  addThirdParty: (tp: Omit<ThirdParty, 'id'>) => void
}

const defaultThirdParties: ThirdParty[] = [
  {
    id: '1',
    name: 'CleanService Limpeza',
    cnpj: '12.345.678/0001-90',
    status: 'Regularizado',
    contractEnd: '2027-12-31',
    services: 'Limpeza Predial',
  },
]

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>(defaultThirdParties)

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
        })),
      )
    }
    setIsLoadingClients(false)
  }

  useEffect(() => {
    if (user) {
      fetchClients()
    } else {
      setClients([])
    }
  }, [user])

  const addClient = async (client: Omit<Client, 'id' | 'url'>) => {
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
      setClients((prev) => [
        {
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
        },
        ...prev,
      ])
      return true
    }
    console.error('Error adding client:', error)
    return false
  }

  const updateClient = async (id: string, data: Partial<Omit<Client, 'id' | 'url'>>) => {
    const updatePayload: any = {}
    if (data.name !== undefined) updatePayload.name = data.name
    if (data.slug !== undefined) updatePayload.url_slug = data.slug
    if (data.adminName !== undefined) updatePayload.admin_name = data.adminName
    if (data.logo !== undefined) updatePayload.logo_url = data.logo
    if (data.primaryColor !== undefined) updatePayload.primary_color = data.primaryColor
    if (data.secondaryColor !== undefined) updatePayload.secondary_color = data.secondaryColor
    if (data.status !== undefined) updatePayload.status = data.status
    if (data.modules !== undefined) updatePayload.modules = data.modules

    const { error } = await supabase.from('clients').update(updatePayload).eq('id', id)

    if (!error) {
      setClients((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, ...data, url: data.slug ? `${window.location.origin}/${data.slug}` : c.url }
            : c,
        ),
      )
      return true
    }
    console.error('Error updating client:', error)
    return false
  }

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (!error) {
      setClients((prev) => prev.filter((c) => c.id !== id))
      return true
    }
    console.error('Error deleting client:', error)
    return false
  }

  const addThirdParty = (tp: Omit<ThirdParty, 'id'>) => {
    setThirdParties((prev) => [{ ...tp, id: Math.random().toString(36).substr(2, 9) }, ...prev])
  }

  return (
    <AppContext.Provider
      value={{
        clients,
        isLoadingClients,
        addClient,
        updateClient,
        deleteClient,
        thirdParties,
        addThirdParty,
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
