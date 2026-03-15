import React, { createContext, useContext, useState, ReactNode } from 'react'

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
  addClient: (client: Omit<Client, 'id'>) => void
  updateClient: (id: string, data: Partial<Client>) => void
  deleteClient: (id: string) => void
  thirdParties: ThirdParty[]
  addThirdParty: (tp: Omit<ThirdParty, 'id'>) => void
  isAuthenticated: boolean
  login: (u: string, p: string) => Promise<boolean>
  logout: () => void
}

const baseUrl = window.location.origin

const defaultClients: Client[] = [
  {
    id: '1',
    name: 'TechCorp S.A.',
    slug: 'techcorp',
    url: `${baseUrl}/techcorp`,
    adminName: 'Carlos Silva',
    logo: 'https://img.usecurling.com/i?q=technology&color=blue',
    primaryColor: '#2563eb',
    secondaryColor: '#0ea5e9',
    status: 'Ativo',
    modules: ['Gestão de Terceiros', 'Manutenção'],
  },
  {
    id: '2',
    name: 'GlobalFac Services',
    slug: 'globalfac',
    url: `${baseUrl}/globalfac`,
    adminName: 'Marina Costa',
    logo: 'https://img.usecurling.com/i?q=global&color=cyan',
    primaryColor: '#0891b2',
    secondaryColor: '#10b981',
    status: 'Ativo',
    modules: ['Gestão de Terceiros'],
  },
]

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
  const [clients, setClients] = useState<Client[]>(defaultClients)
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>(defaultThirdParties)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('auth') === 'true'
  })

  const addClient = (client: Omit<Client, 'id'>) => {
    setClients((prev) => [{ ...client, id: Math.random().toString(36).substr(2, 9) }, ...prev])
  }

  const updateClient = (id: string, data: Partial<Client>) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
  }

  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id))
  }

  const addThirdParty = (tp: Omit<ThirdParty, 'id'>) => {
    setThirdParties((prev) => [{ ...tp, id: Math.random().toString(36).substr(2, 9) }, ...prev])
  }

  const login = async (u: string, p: string) => {
    return new Promise<boolean>((resolve) => {
      setTimeout(() => {
        if (u && p.length >= 4) {
          setIsAuthenticated(true)
          localStorage.setItem('auth', 'true')
          resolve(true)
        } else {
          resolve(false)
        }
      }, 800)
    })
  }

  const logout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('auth')
  }

  return (
    <AppContext.Provider
      value={{
        clients,
        addClient,
        updateClient,
        deleteClient,
        thirdParties,
        addThirdParty,
        isAuthenticated,
        login,
        logout,
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
