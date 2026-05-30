import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { Edit, Plus, ShieldAlert, Trash2, Users } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const MODULE_GROUPS = [
  {
    key: 'Gestão de Terceiros',
    sub: [
      'Lançamentos',
      'Treinamentos',
      'Relatórios',
      'Dashboard Gestor',
      'BI Dashboard',
      'Email Reports',
    ],
  },
  {
    key: 'Limpeza e Jardinagem',
    sub: [
      'Limpeza e Jardinagem:Mapa Operacional',
      'Limpeza e Jardinagem:Áreas',
      'Limpeza e Jardinagem:Cronograma',
      'Limpeza e Jardinagem:Dashboard',
      'Limpeza e Jardinagem:Relatórios',
    ],
  },
  {
    key: 'Gestão de Tarefas',
    sub: [
      'Gestão de Tarefas:Painel de Chamados',
      'Gestão de Tarefas:Tipos de Chamado',
      'Gestão de Tarefas:Status',
      'Gestão de Tarefas:Relatórios',
    ],
  },
  {
    key: 'Organograma e Fluxos',
    sub: [
      'Organograma e Fluxos:Organograma',
      'Organograma e Fluxos:Cadastros',
      'Organograma e Fluxos:Fluxogramas',
    ],
  },
  {
    key: 'Auditoria e Checklist',
    sub: [
      'Auditoria e Checklist:Nova Auditoria',
      'Auditoria e Checklist:Auditorias Criadas',
      'Auditoria e Checklist:Auditorias Realizadas',
      'Auditoria e Checklist:Dashboard',
    ],
  },
  {
    key: 'Gestão de Acidentes',
    sub: [
      'Gestão de Acidentes:Dashboard',
      'Gestão de Acidentes:Novo Registro',
      'Gestão de Acidentes:Histórico',
    ],
  },
  {
    key: 'Gestão da Manutenção',
    sub: [
      'Gestão da Manutenção:Dashboard',
      'Gestão da Manutenção:Painel de Chamados',
      'Gestão da Manutenção:Planejamento (Agenda)',
      'Gestão da Manutenção:Manutenção Preventiva',
      'Gestão da Manutenção:Cadastros',
    ],
  },
  {
    key: 'Gestão de Budget',
    sub: [
      'Gestão de Budget:Dashboard',
      'Gestão de Budget:Lançamentos',
      'Gestão de Budget:Centros de Custo',
      'Gestão de Budget:Contas Contábeis',
    ],
  },
  {
    key: 'Gestão de Lockers',
    sub: [
      'Gestão de Lockers:Dashboard',
      'Gestão de Lockers:Mapa de Ocupação',
      'Gestão de Lockers:Lockers',
      'Gestão de Lockers:Colaboradores',
    ],
  },
  { key: 'Gestão de Documentos', sub: [] },
  {
    key: 'Gestão de Imóveis',
    sub: [
      'Gestão de Imóveis:Dashboard',
      'Gestão de Imóveis:Mapa de Ocupação',
      'Gestão de Imóveis:Imóveis',
      'Gestão de Imóveis:Hóspedes',
      'Gestão de Imóveis:Centros de Custo',
      'Gestão de Imóveis:Relatórios',
    ],
  },
  {
    key: 'Gestão de Encomendas',
    sub: [
      'Gestão de Encomendas:Painel',
      'Gestão de Encomendas:Tipos de Embalagem',
      'Gestão de Encomendas:Configurações',
    ],
  },
  {
    key: 'Cadastros',
    sub: [
      'Cadastros:Plantas',
      'Cadastros:Locais',
      'Cadastros:Empresas',
      'Cadastros:Funções',
      'Cadastros:Colaboradores',
      'Cadastros:Equipamentos',
      'Cadastros:Treinamentos',
      'Cadastros:Quadro Contratado',
      'Cadastros:Book de Metas',
    ],
  },
  { key: 'Dashboard Estratégico', sub: [] },
  { key: 'Book de Metas', sub: [] },
]

export default function Usuarios() {
  const { profile, activeClient, selectedMasterClient } = useAppStore()
  const { toast } = useToast()

  const [users, setUsers] = useState<any[]>([])
  const [clientsDict, setClientsDict] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Operacional',
    accessible_menus: [] as string[],
    force_password_change: true,
  })

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      let q = supabase.from('profiles').select('*').order('created_at', { ascending: false })

      if (profile?.role !== 'Master') {
        if (activeClient?.id) q = q.eq('client_id', activeClient.id)
      } else if (activeClient?.id && selectedMasterClient !== 'all') {
        q = q.eq('client_id', activeClient.id)
      }

      const { data, error } = await q
      if (error) throw error
      setUsers(data || [])

      const { data: cData } = await supabase.from('clients').select('id, name, modules')
      const dict: any = {}
      cData?.forEach((c) => {
        dict[c.id] = c
      })
      setClientsDict(dict)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar usuários',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [activeClient?.id, profile?.role, selectedMasterClient])

  const availableRoles =
    profile?.role === 'Master'
      ? ['Master', 'Administrador', 'Gestor', 'Operacional']
      : ['Administrador', 'Gestor', 'Operacional']

  const openNew = () => {
    if (!activeClient?.id && profile?.role === 'Master' && selectedMasterClient === 'all') {
      toast({
        title: 'Atenção',
        description: 'Selecione um cliente específico no topo da página para criar um usuário.',
        variant: 'destructive',
      })
      return
    }

    setEditingId(null)
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Operacional',
      accessible_menus: [],
      force_password_change: true,
    })
    setIsDialogOpen(true)
  }

  const openEdit = (u: any) => {
    setEditingId(u.id)
    setFormData({
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role || 'Operacional',
      accessible_menus: u.accessible_menus || [],
      force_password_change: u.force_password_change || false,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return
    setIsLoading(true)
    try {
      const { error } = await supabase.functions.invoke('delete-user', { body: { userId: id } })
      if (error) throw error
      toast({ title: 'Usuário excluído com sucesso' })
      fetchUsers()
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (editingId) {
        const { error } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            role: formData.role,
            accessible_menus: formData.accessible_menus,
            force_password_change: formData.force_password_change,
          })
          .eq('id', editingId)

        if (error) throw error

        if (formData.password) {
          const { error: pwdErr } = await supabase.functions.invoke('update-user-password', {
            body: { userId: editingId, password: formData.password },
          })
          if (pwdErr) throw pwdErr
        }
        toast({ title: 'Usuário atualizado com sucesso' })
      } else {
        const { error } = await supabase.functions.invoke('create-user', {
          body: {
            ...formData,
            client_id: activeClient?.id,
          },
        })
        if (error) throw error
        toast({ title: 'Usuário criado com sucesso' })
      }
      setIsDialogOpen(false)
      fetchUsers()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheck = (key: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      accessible_menus: checked
        ? [...(prev.accessible_menus || []), key]
        : (prev.accessible_menus || []).filter((k) => k !== key),
    }))
  }

  // Determine allowed modules based on the client of the user being created/edited
  const targetClientId = editingId
    ? users.find((u) => u.id === editingId)?.client_id
    : activeClient?.id
  const targetClient = targetClientId ? clientsDict[targetClientId] : null
  const allowedModules = targetClient?.modules || []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/10 rounded-lg">
            <Users className="h-6 w-6 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestão de Usuários</h1>
            <p className="text-sm text-gray-500">Cadastre e gerencie os acessos do sistema</p>
          </div>
        </div>
        <Button onClick={openNew} className="shadow-md hover:shadow-lg transition-all">
          <Plus className="h-4 w-4 mr-2" /> Novo Usuário
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              {profile?.role === 'Master' && <TableHead>Cliente</TableHead>}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell className="font-medium text-gray-900">{u.name}</TableCell>
                  <TableCell className="text-gray-600">{u.email}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'px-2.5 py-1 text-xs font-medium rounded-full',
                        u.role === 'Master'
                          ? 'bg-purple-100 text-purple-700'
                          : u.role === 'Administrador'
                            ? 'bg-blue-100 text-blue-700'
                            : u.role === 'Gestor'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-700',
                      )}
                    >
                      {u.role}
                    </span>
                  </TableCell>
                  {profile?.role === 'Master' && (
                    <TableCell className="text-gray-500 text-sm">
                      {u.role === 'Master' ? 'Global' : clientsDict[u.client_id]?.name || '-'}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(u)}
                      className="h-8 w-8 text-brand-primary hover:text-brand-vividBlue hover:bg-brand-primary/10"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {u.id !== profile?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(u.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 ml-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-gray-50/50">
            <DialogTitle className="text-xl text-brand-deepBlue">
              {editingId ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <label className="text-sm font-semibold text-gray-700">Nome Completo</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: João Silva"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-sm font-semibold text-gray-700">Email</label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingId}
                  className="disabled:bg-gray-100"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                  <span>Senha</span>
                  {editingId && (
                    <span className="text-[10px] font-normal text-gray-500">
                      (Opcional: deixe em branco para manter)
                    </span>
                  )}
                </label>
                <Input
                  type="password"
                  required={!editingId}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-sm font-semibold text-gray-700">Perfil de Acesso</label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2 pb-2">
              <Checkbox
                id="force_pwd"
                checked={formData.force_password_change}
                onCheckedChange={(c) => setFormData({ ...formData, force_password_change: !!c })}
              />
              <label
                htmlFor="force_pwd"
                className="text-sm font-medium text-gray-700 cursor-pointer select-none"
              >
                Exigir alteração de senha no próximo login
              </label>
            </div>

            {formData.role !== 'Master' && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Módulos e Menus Acessíveis
                  </h3>
                  <p className="text-xs text-gray-500">
                    Selecione as áreas que este usuário poderá visualizar e interagir.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MODULE_GROUPS.map((g) => {
                    const isAllowed = !targetClientId || allowedModules.includes(g.key)
                    const hasSelectedItems =
                      (formData.accessible_menus || []).includes(g.key) ||
                      g.sub.some((s) => (formData.accessible_menus || []).includes(s))

                    if (!isAllowed && !hasSelectedItems) return null

                    return (
                      <div
                        key={g.key}
                        className={cn(
                          'p-4 rounded-lg border transition-colors',
                          !isAllowed
                            ? 'opacity-75 bg-red-50/40 border-red-200'
                            : 'bg-white hover:border-brand-primary/40',
                        )}
                      >
                        <label className="flex items-start space-x-3 cursor-pointer group">
                          <Checkbox
                            className="mt-0.5"
                            checked={(formData.accessible_menus || []).includes(g.key)}
                            disabled={!isAllowed}
                            onCheckedChange={(checked) => handleCheck(g.key, !!checked)}
                          />
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-gray-900 group-hover:text-brand-primary transition-colors">
                              {g.key}
                            </span>
                            {!isAllowed && (
                              <span className="text-[10px] text-red-500 font-medium flex items-center mt-1">
                                <ShieldAlert className="w-3 h-3 mr-1" /> Módulo inativo no cliente
                              </span>
                            )}
                          </div>
                        </label>

                        {g.sub.length > 0 && (
                          <div className="pl-7 space-y-2.5 mt-3 border-l-2 ml-1.5 border-gray-100">
                            {g.sub.map((s) => (
                              <label
                                key={s}
                                className="flex items-center space-x-2.5 text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors"
                              >
                                <Checkbox
                                  checked={(formData.accessible_menus || []).includes(s)}
                                  disabled={!isAllowed}
                                  onCheckedChange={(checked) => handleCheck(s, !!checked)}
                                />
                                <span>{s.split(':').pop() || s}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t mt-8">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="w-24"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-32 shadow-md hover:shadow-lg transition-all"
              >
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
