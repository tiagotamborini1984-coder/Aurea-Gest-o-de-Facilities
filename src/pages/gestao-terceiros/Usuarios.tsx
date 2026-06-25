import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useAppStore } from '@/store/AppContext'
import { CrudGeneric } from '@/components/gestao-terceiros/CrudGeneric'
import { Users } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const ALL_MENUS = [
  'Dashboard',
  'Lançamentos',
  'Treinamentos',
  'Cadastros',
  'Relatórios',
  'Configurações',
  'Auditoria',
  'Painel de Chamados',
  'Planejamento',
]

const ALL_MODULES = [
  'Gestão de Terceiros',
  'Limpeza e Jardinagem',
  'Gestão de Tarefas',
  'Auditoria e Checklist',
  'Dashboard Estratégico',
  'Organograma e Fluxos',
  'Gestão de Acidentes',
  'Gestão de Budget',
  'Gestão de Manutenção',
  'Gestão de Documentos',
  'Gestão de Lockers',
  'Gestão de Imóveis',
  'Gestão de Encomendas',
  'Gestão de Estoque',
  'BI',
]

export default function Usuarios() {
  const { profile, selectedMasterClient } = useAppStore()
  const [plants, setPlants] = useState<any[]>([])
  const [clientModules, setClientModules] = useState<string[]>([])
  const [clients, setClients] = useState<any[]>([])

  useEffect(() => {
    async function loadData() {
      if (!profile) return

      let clientId = profile.client_id
      if (profile.role === 'Master' && selectedMasterClient !== 'all') {
        clientId = selectedMasterClient
      }

      let q = supabase.from('plants').select('id, name, client_id')
      if (clientId) {
        q = q.eq('client_id', clientId)
      }
      const { data: pData } = await q
      if (pData) setPlants(pData)

      if (clientId) {
        const { data: cData } = await supabase
          .from('clients')
          .select('modules')
          .eq('id', clientId)
          .single()
        if (cData && cData.modules) {
          setClientModules(Array.isArray(cData.modules) ? cData.modules : [])
        }
      } else if (profile.role === 'Master') {
        const { data: cData } = await supabase.from('clients').select('id, name, modules')
        if (cData) setClients(cData)
        setClientModules(ALL_MODULES)
      }
    }
    loadData()
  }, [profile, selectedMasterClient])

  const fetchQuery = async () => {
    if (!profile) return []
    let q = supabase.from('profiles').select('*, clients(name)')

    if (profile.role !== 'Master') {
      q = q.eq('client_id', profile.client_id)
    } else if (selectedMasterClient !== 'all') {
      q = q.eq('client_id', selectedMasterClient)
    }

    const { data, error } = await q
    if (error) throw error
    return data || []
  }

  const handleAdd = async (form: any) => {
    if (!form.password || form.password.trim() === '') {
      return { success: false, error: { message: 'A senha é obrigatória para novos usuários.' } }
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) return { success: false, error: { message: 'Sem sessão' } }

    const payload = {
      email: form.email,
      password: form.password,
      name: form.name,
      role: form.role,
      client_id: form.client_id || profile?.client_id,
      accessible_menus: form.accessible_menus || [],
      authorized_plants: form.authorized_plants || [],
      feature_permissions: form.feature_permissions || {},
      force_password_change: form.force_password_change || false,
    }

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: { message: data.error || 'Erro ao criar usuário' } }
    }
    return { success: true }
  }

  const handleUpdate = async (id: string, form: any) => {
    const updateData: any = {
      name: form.name,
      role: form.role,
      accessible_menus: form.accessible_menus || [],
      authorized_plants: form.authorized_plants || [],
      feature_permissions: form.feature_permissions || {},
      force_password_change: form.force_password_change || false,
    }

    if (profile?.role === 'Master' && form.role !== 'Master') {
      updateData.client_id = form.client_id
    } else if (form.role === 'Master') {
      updateData.client_id = null
    }

    const { error } = await supabase.from('profiles').update(updateData).eq('id', id)
    if (error) return { success: false, error }

    if (form.password && form.password.trim() !== '') {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (token) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: id, password: form.password }),
        })
      }
    }

    return { success: true }
  }

  const handleRemove = async (id: string) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) return { success: false, error: { message: 'Sem sessão' } }

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId: id }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: { message: data.error || 'Erro ao excluir usuário' } }
    }
    return { success: true }
  }

  const roleOptions = [
    { value: 'Operacional', label: 'Operacional' },
    { value: 'Gestor', label: 'Gestor' },
    { value: 'Administrador', label: 'Administrador' },
  ]
  if (profile?.role === 'Master') {
    roleOptions.push({ value: 'Master', label: 'Master' })
  }

  const fields = [
    { name: 'name', label: 'Nome', type: 'text' as const },
    { name: 'email', label: 'E-mail', type: 'text' as const, disabled: (f: any) => !!f.id },
    {
      name: 'password',
      label: 'Senha (deixe em branco para não alterar)',
      type: 'text' as const,
      required: false,
    },
    { name: 'role', label: 'Perfil de Acesso', type: 'select' as const, options: roleOptions },
    ...(profile?.role === 'Master' && selectedMasterClient === 'all'
      ? [
          {
            name: 'client_id',
            label: 'Cliente',
            type: 'select' as const,
            options: clients.map((c: any) => ({ value: c.id, label: c.name })),
            hidden: (f: any) => f.role === 'Master',
          },
        ]
      : []),
    {
      name: 'force_password_change',
      label: 'Forçar troca de senha no próximo login?',
      type: 'toggle' as const,
    },
  ]

  const columns = [
    { header: 'Nome', accessor: 'name' },
    { header: 'E-mail', accessor: 'email' },
    { header: 'Perfil', accessor: 'role' },
    ...(profile?.role === 'Master' && selectedMasterClient === 'all'
      ? [
          {
            header: 'Cliente',
            accessor: 'clients',
            render: (item: any) => item.clients?.name || '-',
          },
        ]
      : []),
  ]

  const extraFormContent = (form: any, setForm: any) => {
    if (form.role === 'Master' || form.role === 'Administrador') {
      return (
        <div className="text-sm text-muted-foreground p-4 bg-blue-50 rounded-lg border border-blue-100 mt-4">
          Usuários com perfil Master ou Administrador têm acesso irrestrito a todos os módulos,
          menus e plantas.
        </div>
      )
    }

    const authPlants = form.authorized_plants || []

    let accModules: string[] = []
    let accMenus: string[] = []

    if (Array.isArray(form.accessible_menus)) {
      accModules = form.accessible_menus.filter((m: string) => ALL_MODULES.includes(m))
      accMenus = form.accessible_menus.filter((m: string) => ALL_MENUS.includes(m))
    } else if (form.accessible_menus && typeof form.accessible_menus === 'object') {
      accModules = form.accessible_menus.modules || []
      accMenus = form.accessible_menus.menus || []
    }

    const availablePlants = form.client_id
      ? plants.filter((p) => p.client_id === form.client_id)
      : plants

    let availableModules = clientModules
    if (form.client_id && clients.length > 0) {
      const c = clients.find((cl: any) => cl.id === form.client_id)
      if (c && c.modules) {
        availableModules = Array.isArray(c.modules) ? c.modules : []
      }
    }

    const togglePlant = (id: string) => {
      if (authPlants.includes(id)) {
        setForm({ ...form, authorized_plants: authPlants.filter((p: string) => p !== id) })
      } else {
        setForm({ ...form, authorized_plants: [...authPlants, id] })
      }
    }

    const toggleModule = (mod: string) => {
      let newModules = [...accModules]
      if (newModules.includes(mod)) {
        newModules = newModules.filter((m) => m !== mod)
      } else {
        newModules.push(mod)
      }
      setForm({ ...form, accessible_menus: [...newModules, ...accMenus] })
    }

    const toggleMenu = (menu: string) => {
      let newMenus = [...accMenus]
      if (newMenus.includes(menu)) {
        newMenus = newMenus.filter((m) => m !== menu)
      } else {
        newMenus.push(menu)
      }
      setForm({ ...form, accessible_menus: [...accModules, ...newMenus] })
    }

    const featurePerms = form.feature_permissions || {}
    const toggleFeaturePerm = (key: string) => {
      setForm({ ...form, feature_permissions: { ...featurePerms, [key]: !featurePerms[key] } })
    }

    return (
      <div className="space-y-6 pt-4 border-t border-gray-100 mt-4">
        <div>
          <h4 className="text-sm font-semibold text-brand-graphite mb-3">
            Permissões de Relatórios
          </h4>
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Filtro de Responsável (SLA de Compras)</Label>
              <p className="text-xs text-muted-foreground">
                Permitir visualizar filtro de responsável no SLA de Compras
              </p>
            </div>
            <Switch
              checked={featurePerms.can_view_purchasing_responsible_filter || false}
              onCheckedChange={() => toggleFeaturePerm('can_view_purchasing_responsible_filter')}
            />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-brand-graphite mb-3">Plantas Autorizadas</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto p-4 border border-gray-200 rounded-lg bg-gray-50/30">
            {availablePlants.map((p: any) => (
              <div key={p.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`plant-${p.id}`}
                  checked={authPlants.includes(p.id)}
                  onCheckedChange={() => togglePlant(p.id)}
                />
                <Label
                  htmlFor={`plant-${p.id}`}
                  className="font-medium cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {p.name}
                </Label>
              </div>
            ))}
            {availablePlants.length === 0 && (
              <span className="text-sm text-muted-foreground">Nenhuma planta encontrada.</span>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-brand-graphite mb-3">Módulos Permitidos</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-4 border border-gray-200 rounded-lg bg-gray-50/30">
            {availableModules.map((m) => (
              <div key={m} className="flex items-center space-x-2">
                <Checkbox
                  id={`mod-${m}`}
                  checked={accModules.includes(m)}
                  onCheckedChange={() => toggleModule(m)}
                />
                <Label
                  htmlFor={`mod-${m}`}
                  className="font-medium cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {m}
                </Label>
              </div>
            ))}
            {availableModules.length === 0 && (
              <span className="text-sm text-muted-foreground">
                Nenhum módulo disponível no cliente.
              </span>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-brand-graphite mb-3">Menus Permitidos</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-4 border border-gray-200 rounded-lg bg-gray-50/30">
            {ALL_MENUS.map((m) => (
              <div key={m} className="flex items-center space-x-2">
                <Checkbox
                  id={`menu-${m}`}
                  checked={accMenus.includes(m)}
                  onCheckedChange={() => toggleMenu(m)}
                />
                <Label
                  htmlFor={`menu-${m}`}
                  className="font-medium cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {m}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <CrudGeneric
        title="Usuários"
        singularName="Usuário"
        subtitle="Gerencie os usuários e suas permissões de acesso"
        tableName="profiles"
        icon={Users}
        fields={fields}
        columns={columns}
        fetchQuery={fetchQuery}
        onAdd={handleAdd}
        onUpdate={handleUpdate}
        onRemove={handleRemove}
        extraFormContent={extraFormContent}
      />
    </div>
  )
}
