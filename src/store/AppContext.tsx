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
  {
    id: '3',
    name: 'InnovateX LTDA',
    slug: 'innovatex',
    url: `${baseUrl}/innovatex`,
    adminName: 'Roberto Alves',
    logo: 'https://img.usecurling.com/i?q=innovation&color=gray',
    primaryColor: '#475569',
    secondaryColor: '#94a3b8',
    status: 'Inativo',
    modules: ['Limpeza', 'Manutenção'],
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
  {
    id: '2',
    name: 'SecurGuard Vigilância',
    cnpj: '98.765.432/0001-10',
    status: 'Pendente',
    contractEnd: '2026-06-30',
    services: 'Segurança Patrimonial',
  },
  {
    id: '3',
    name: 'FixIt Manutenção',
    cnpj: '45.678.901/0001-23',
    status: 'Regularizado',
    contractEnd: '2028-01-15',
    services: 'Manutenção Elétrica',
  },
  {
    id: '4',
    name: 'GreenSpace Paisagismo',
    cnpj: '11.222.333/0001-44',
    status: 'Inativo',
    contractEnd: '2024-05-20',
    services: 'Jardinagem',
  },
]

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [clients, setClients] = useState<Client[]>(defaultClients)
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>(defaultThirdParties)

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

  return (
    <AppContext.Provider
      value={{ clients, addClient, updateClient, deleteClient, thirdParties, addThirdParty }}
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
