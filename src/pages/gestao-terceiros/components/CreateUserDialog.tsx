import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { logAudit } from '@/services/audit'

const MAIN_MENUS = [
  'Dashboard Gestor',
  'Lançamentos',
  'Relatórios',
  'BI Dashboard',
  'Email Reports',
  'Log de Auditoria',
  'Usuários',
  'Gestão de Imóveis',
  'Gestão de Encomendas',
  'Limpeza e Jardinagem',
  'Gestão de Tarefas',
  'Auditoria e Checklist',
  'Gestão de Budget',
]

const CADASTROS_SUBMENUS = [
  'Plantas',
  'Locais',
  'Empresas',
  'Funções',
  'Colaboradores',
  'Equipamentos',
  'Treinamentos',
  'Quadro Contratado',
  'Book de Metas',
]

const GESTAO_TAREFAS_SUBMENUS = ['Painel de Chamados', 'Relatórios', 'Tipos de Chamado', 'Status']
const AUDITORIA_SUBMENUS = [
  'Nova Auditoria',
  'Auditorias Criadas',
  'Auditorias Realizadas',
  'Dashboard',
]
const BUDGET_SUBMENUS = ['Dashboard', 'Lançamentos', 'Centros de Custo', 'Contas Contábeis']

export function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [isAdding, setIsAdding] = useState(false)
  const { profile } = useAppStore()
  const { user } = useAuth()
  const { toast } = useToast()

  const [clients, setClients] = useState<any[]>([])
  const [clientPlants, setClientPlants] = useState<any[]>([])

  const isSuperAdmin = profile?.role === 'Master'

  useEffect(() => {
    if (isSuperAdmin) {
      supabase
        .from('clients')
        .select('id, name')
        .order('name')
        .then(({ data }) => {
          if (data) setClients(data)
        })
    }
  }, [isSuperAdmin])

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Operacional',
    client_id: profile?.client_id || '',
    accessible_menus: [] as string[],
    authorized_plants: [] as string[],
    force_password_change: true,
  })

  useEffect(() => {
    if (profile?.client_id && form.client_id === '') {
      setForm((prev) => ({ ...prev, client_id: profile.client_id! }))
    }
  }, [profile])

  useEffect(() => {
    if (form.client_id) {
      supabase
        .from('plants')
        .select('id, name')
        .eq('client_id', form.client_id)
        .order('name')
        .then(({ data }) => {
          if (data) setClientPlants(data)
        })
    } else {
      setClientPlants([])
    }
  }, [form.client_id])

  const validatePassword = (pwd: string) => {
    const minLength = 8
    const hasUpper = /[A-Z]/.test(pwd)
    const hasLower = /[a-z]/.test(pwd)
    const hasNumber = /[0-9]/.test(pwd)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    return pwd.length >= minLength && hasUpper && hasLower && hasNumber && hasSpecial
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.client_id && form.role !== 'Master') {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione uma empresa para o usuário.',
      })
      return
    }

    if (!validatePassword(form.password)) {
      toast({
        variant: 'destructive',
        title: 'Senha Inválida',
        description:
          'A senha deve conter no mínimo 8 caracteres, maiúsculas, minúsculas, números e caracteres especiais.',
      })
      return
    }

    setIsAdding(true)
    try {
      const { error } = await supabase.functions.invoke('create-user', {
        body: { ...form },
      })
      if (error) throw error
      toast({
        title: 'Usuário criado com sucesso',
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      if (user && profile)
        logAudit(
          profile.client_id || form.client_id,
          user.id,
          'Criação de Usuário',
          `Email: ${form.email} | Nível: ${form.role}`,
        )

      onOpenChange(false)
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'Operacional',
        client_id: profile?.client_id || '',
        accessible_menus: [],
        authorized_plants: [],
        force_password_change: true,
      })
      onSuccess()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar usuário', description: err.message })
    } finally {
      setIsAdding(false)
    }
  }

  const toggleMenu = (menu: string) => {
    setForm((p) => {
      let next = [...p.accessible_menus]

      if (menu.startsWith('Cadastros:') && next.includes('Cadastros')) {
        next = next.filter((m) => m !== 'Cadastros')
        CADASTROS_SUBMENUS.forEach((sub) => {
          if (`Cadastros:${sub}` !== menu) next.push(`Cadastros:${sub}`)
        })
        return { ...p, accessible_menus: next }
      }

      if (menu.startsWith('Gestão de Tarefas:') && next.includes('Gestão de Tarefas')) {
        next = next.filter((m) => m !== 'Gestão de Tarefas')
        GESTAO_TAREFAS_SUBMENUS.forEach((sub) => {
          if (`Gestão de Tarefas:${sub}` !== menu) next.push(`Gestão de Tarefas:${sub}`)
        })
        return { ...p, accessible_menus: next }
      }

      if (menu.startsWith('Auditoria e Checklist:') && next.includes('Auditoria e Checklist')) {
        next = next.filter((m) => m !== 'Auditoria e Checklist')
        AUDITORIA_SUBMENUS.forEach((sub) => {
          if (`Auditoria e Checklist:${sub}` !== menu) next.push(`Auditoria e Checklist:${sub}`)
        })
        return { ...p, accessible_menus: next }
      }

      if (menu.startsWith('Gestão de Budget:') && next.includes('Gestão de Budget')) {
        next = next.filter((m) => m !== 'Gestão de Budget')
        BUDGET_SUBMENUS.forEach((sub) => {
          if (`Gestão de Budget:${sub}` !== menu) next.push(`Gestão de Budget:${sub}`)
        })
        return { ...p, accessible_menus: next }
      }

      if (next.includes(menu)) {
        next = next.filter((m) => m !== menu)
      } else {
        next.push(menu)
      }
      return { ...p, accessible_menus: next }
    })
  }

  const togglePlant = (plantId: string) =>
    setForm((p) => ({
      ...p,
      authorized_plants: p.authorized_plants.includes(plantId)
        ? p.authorized_plants.filter((id) => id !== plantId)
        : [...p.authorized_plants, plantId],
    }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddUser} className="space-y-4 mt-4">
          {isSuperAdmin && form.role !== 'Master' && (
            <div className="space-y-2">
              <Label>Empresa (Cliente)</Label>
              <Select
                value={form.client_id || undefined}
                onValueChange={(v) => setForm({ ...form, client_id: v, authorized_plants: [] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail (Login)</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Senha Temporária</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                Mín. 8 caracteres, maiúsculas, minúsculas, números e especiais.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operacional">Operacional</SelectItem>
                  <SelectItem value="Gestor">Gestor</SelectItem>
                  {isSuperAdmin && (
                    <SelectItem value="Administrador">Administrador de Cliente</SelectItem>
                  )}
                  {isSuperAdmin && <SelectItem value="Master">Master</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          {['Gestor', 'Operacional'].includes(form.role) && (
            <div className="pt-2 animate-in fade-in space-y-4">
              <div>
                <Label className="mb-2 block">Menus Principais Acessíveis</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-md border border-slate-100">
                  {MAIN_MENUS.map((menu) => (
                    <Badge
                      key={menu}
                      variant={form.accessible_menus.includes(menu) ? 'default' : 'outline'}
                      className={`cursor-pointer hover:bg-slate-200 ${form.accessible_menus.includes(menu) ? 'bg-brand-vividBlue text-white hover:bg-brand-vividBlue/90' : ''}`}
                      onClick={() => toggleMenu(menu)}
                    >
                      {menu}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Submenus de Cadastros</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-md border border-slate-100">
                  {CADASTROS_SUBMENUS.map((menu) => {
                    const key = `Cadastros:${menu}`
                    return (
                      <Badge
                        key={key}
                        variant={
                          form.accessible_menus.includes(key) ||
                          form.accessible_menus.includes('Cadastros')
                            ? 'default'
                            : 'outline'
                        }
                        className={`cursor-pointer hover:bg-slate-200 ${form.accessible_menus.includes(key) || form.accessible_menus.includes('Cadastros') ? 'bg-brand-vividBlue text-white hover:bg-brand-vividBlue/90' : ''}`}
                        onClick={() => toggleMenu(key)}
                      >
                        {menu}
                      </Badge>
                    )
                  })}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Submenus de Gestão de Tarefas</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-md border border-slate-100">
                  {GESTAO_TAREFAS_SUBMENUS.map((menu) => {
                    const key = `Gestão de Tarefas:${menu}`
                    return (
                      <Badge
                        key={key}
                        variant={
                          form.accessible_menus.includes(key) ||
                          form.accessible_menus.includes('Gestão de Tarefas')
                            ? 'default'
                            : 'outline'
                        }
                        className={`cursor-pointer hover:bg-slate-200 ${form.accessible_menus.includes(key) || form.accessible_menus.includes('Gestão de Tarefas') ? 'bg-brand-vividBlue text-white hover:bg-brand-vividBlue/90' : ''}`}
                        onClick={() => toggleMenu(key)}
                      >
                        {menu}
                      </Badge>
                    )
                  })}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Submenus de Auditoria e Checklist</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-md border border-slate-100">
                  {AUDITORIA_SUBMENUS.map((menu) => {
                    const key = `Auditoria e Checklist:${menu}`
                    return (
                      <Badge
                        key={key}
                        variant={
                          form.accessible_menus.includes(key) ||
                          form.accessible_menus.includes('Auditoria e Checklist')
                            ? 'default'
                            : 'outline'
                        }
                        className={`cursor-pointer hover:bg-slate-200 ${form.accessible_menus.includes(key) || form.accessible_menus.includes('Auditoria e Checklist') ? 'bg-brand-vividBlue text-white hover:bg-brand-vividBlue/90' : ''}`}
                        onClick={() => toggleMenu(key)}
                      >
                        {menu}
                      </Badge>
                    )
                  })}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Submenus de Gestão de Budget</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-md border border-slate-100">
                  {BUDGET_SUBMENUS.map((menu) => {
                    const key = `Gestão de Budget:${menu}`
                    return (
                      <Badge
                        key={key}
                        variant={
                          form.accessible_menus.includes(key) ||
                          form.accessible_menus.includes('Gestão de Budget')
                            ? 'default'
                            : 'outline'
                        }
                        className={`cursor-pointer hover:bg-slate-200 ${form.accessible_menus.includes(key) || form.accessible_menus.includes('Gestão de Budget') ? 'bg-brand-vividBlue text-white hover:bg-brand-vividBlue/90' : ''}`}
                        onClick={() => toggleMenu(key)}
                      >
                        {menu}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          {form.role === 'Administrador' && (
            <div className="p-3 bg-brand-vividBlue/5 border border-brand-vividBlue/20 rounded-md text-sm text-brand-vividBlue mt-2">
              <strong>Acesso Total:</strong> Administradores de Cliente têm acesso irrestrito a
              todos os módulos da empresa selecionada.
            </div>
          )}
          {form.role === 'Master' && (
            <div className="p-3 bg-brand-vividBlue/5 border border-brand-vividBlue/20 rounded-md text-sm text-brand-vividBlue mt-2">
              <strong>Acesso Global:</strong> Usuários Master têm acesso irrestrito a todos os
              módulos e empresas do sistema.
            </div>
          )}

          {!['Administrador', 'Master'].includes(form.role) && (
            <div className="pt-2">
              <Label className="mb-2 block">Plantas Autorizadas</Label>
              <div className="flex flex-wrap gap-2">
                {clientPlants.length === 0 ? (
                  <span className="text-sm text-slate-500">Nenhuma planta encontrada.</span>
                ) : (
                  clientPlants.map((p) => (
                    <Badge
                      key={p.id}
                      variant={form.authorized_plants.includes(p.id) ? 'default' : 'outline'}
                      className={`cursor-pointer ${form.authorized_plants.includes(p.id) ? 'bg-brand-vividBlue text-white hover:bg-brand-vividBlue/90' : ''}`}
                      onClick={() => togglePlant(p.id)}
                    >
                      {p.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t mt-4">
            <span className="text-sm font-medium">Forçar troca de senha no primeiro login</span>
            <Switch
              checked={form.force_password_change}
              onCheckedChange={(v) => setForm({ ...form, force_password_change: v })}
            />
          </div>
          <Button
            type="submit"
            className="w-full mt-4 bg-brand-vividBlue hover:bg-brand-vividBlue/90 text-white"
            disabled={isAdding}
          >
            {isAdding ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null} Salvar Usuário
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
