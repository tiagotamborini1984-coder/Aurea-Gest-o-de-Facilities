import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react'

const MENUS = [
  'Dashboard Gestor',
  'Lançamentos',
  'Treinamentos',
  'Relatórios',
  'BI Dashboard',
  'Email Reports',
  'Limpeza e Jardinagem',
  'Gestão de Tarefas',
  'Organograma e Fluxos',
  'Auditoria e Checklist',
  'Gestão de Acidentes',
  'Gestão da Manutenção',
  'Gestão de Budget',
  'Gestão de Lockers',
  'Gestão de Documentos',
  'Gestão de Imóveis',
  'Gestão de Encomendas',
  'Book de Metas',
  'Cadastros',
  'Usuários',
  'Dashboard Estratégico',
  'Log de Auditoria',
]

export default function Usuarios() {
  const { activeClient, profile } = useAppStore()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Operacional',
    accessible_menus: [] as string[],
  })
  const { toast } = useToast()

  const fetchUsers = async () => {
    if (!profile) return
    setLoading(true)
    let q = supabase.from('profiles').select('*').order('name')
    if (profile.role !== 'Master' && activeClient) q = q.eq('client_id', activeClient.id)
    const { data } = await q
    if (data) setUsers(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [activeClient, profile])

  const save = async () => {
    try {
      if (editing) {
        const { error } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            role: formData.role,
            accessible_menus: formData.accessible_menus,
          })
          .eq('id', editing.id)
        if (error) throw error
        toast({ title: 'Usuário atualizado' })
      } else {
        const { error } = await supabase.functions.invoke('create-user', {
          body: { ...formData, client_id: activeClient?.id },
        })
        if (error) throw error
        toast({ title: 'Usuário criado' })
      }
      setIsOpen(false)
      fetchUsers()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este usuário?')) return
    try {
      const { error } = await supabase.functions.invoke('delete-user', { body: { userId: id } })
      if (error) throw error
      toast({ title: 'Usuário excluído' })
      fetchUsers()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const openForm = (u?: any) => {
    setEditing(u || null)
    setFormData(
      u
        ? {
            name: u.name,
            email: u.email,
            password: '',
            role: u.role,
            accessible_menus: u.accessible_menus || [],
          }
        : { name: '', email: '', password: '', role: 'Operacional', accessible_menus: [] },
    )
    setIsOpen(true)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Gestão de Usuários</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openForm()}>
              <Plus className="w-4 h-4 mr-2" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar' : 'Novo'} Usuário</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  disabled={!!editing}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              {!editing && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Perfil</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Operacional">Operacional</option>
                  <option value="Gestor">Gestor</option>
                  <option value="Administrador">Administrador</option>
                  {profile?.role === 'Master' && <option value="Master">Master</option>}
                </select>
              </div>
              <div className="col-span-2 space-y-2 mt-2">
                <label className="text-sm font-medium border-b pb-1 block">Menus Acessíveis</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {MENUS.map((mod) => (
                    <div key={mod} className="flex items-center space-x-2">
                      <Checkbox
                        id={`m-${mod}`}
                        checked={formData.accessible_menus.includes(mod)}
                        onCheckedChange={(c) => {
                          setFormData({
                            ...formData,
                            accessible_menus: c
                              ? [...formData.accessible_menus, mod]
                              : formData.accessible_menus.filter((m) => m !== mod),
                          })
                        }}
                      />
                      <label
                        htmlFor={`m-${mod}`}
                        className="text-sm cursor-pointer truncate"
                        title={mod}
                      >
                        {mod}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button onClick={save} className="w-full mt-4">
              Salvar
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {u.role}
                    </span>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openForm(u)}>
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
