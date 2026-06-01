import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useCrud } from '@/hooks/use-crud'
import { useMasterData } from '@/hooks/use-master-data'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Edit2, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/AppContext'

export default function Usuarios() {
  const { profile, selectedMasterClient } = useAppStore()
  const { data: users, loading, fetchAll: fetchUsers } = useCrud<any>('profiles')
  const { plants } = useMasterData()
  const { toast } = useToast()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Operacional',
    authorized_plants: [] as string[],
  })
  const [submitting, setSubmitting] = useState(false)

  const roles =
    profile?.role === 'Master'
      ? ['Master', 'Administrador', 'Gestor', 'Operacional']
      : ['Administrador', 'Gestor', 'Operacional']

  const handleOpenDialog = (user?: any) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        role: user.role || 'Operacional',
        authorized_plants: Array.isArray(user.authorized_plants) ? user.authorized_plants : [],
      })
    } else {
      setEditingUser(null)
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'Operacional',
        authorized_plants: [],
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    let targetClientId = profile?.client_id
    if (profile?.role === 'Master' && selectedMasterClient !== 'all') {
      targetClientId = selectedMasterClient
    }

    try {
      if (editingUser) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            role: formData.role,
            authorized_plants: formData.authorized_plants,
          })
          .eq('id', editingUser.id)

        if (profileError) throw profileError

        if (formData.password) {
          const { error: pwdError } = await supabase.functions.invoke('update-user-password', {
            body: { userId: editingUser.id, password: formData.password },
          })
          if (pwdError) throw pwdError
        }
      } else {
        const { error: createError } = await supabase.functions.invoke('create-user', {
          body: {
            email: formData.email,
            password: formData.password,
            name: formData.name,
            role: formData.role,
            authorized_plants: formData.authorized_plants,
            client_id: targetClientId,
          },
        })
        if (createError) throw createError
      }

      toast({
        title: 'Sucesso',
        description: `Usuário ${editingUser ? 'atualizado' : 'criado'} com sucesso.`,
      })
      setIsDialogOpen(false)
      fetchUsers()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao salvar o usuário',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      })
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Usuário excluído com sucesso.' })
      fetchUsers()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir usuário',
        variant: 'destructive',
      })
    }
  }

  const togglePlant = (plantId: string) => {
    setFormData((prev) => ({
      ...prev,
      authorized_plants: prev.authorized_plants.includes(plantId)
        ? prev.authorized_plants.filter((id) => id !== plantId)
        : [...prev.authorized_plants, plantId],
    }))
  }

  if (loading)
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Usuários
        </h1>
        <Button onClick={() => handleOpenDialog()} className="shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Novo Usuário
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Nível de Acesso</TableHead>
                <TableHead>Plantas Autorizadas</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: any) => (
                <TableRow
                  key={user.id}
                  className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                >
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                    {user.name}
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {Array.isArray(user.authorized_plants) && user.authorized_plants.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.authorized_plants.map((pid: string) => {
                          const plant = plants.find((p) => p.id === pid)
                          return plant ? (
                            <Badge
                              key={pid}
                              variant="outline"
                              className="text-[10px] font-normal px-1.5 py-0"
                            >
                              {plant.name}
                            </Badge>
                          ) : null
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Todas / Padrão</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-primary"
                        onClick={() => handleOpenDialog(user)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-destructive"
                        onClick={() => handleDelete(user.id)}
                        disabled={user.id === profile?.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                required
                placeholder="João da Silva"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                disabled={!!editingUser}
                placeholder="joao@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{editingUser ? 'Nova Senha (opcional)' : 'Senha'}</Label>
              <Input
                id="password"
                type="password"
                required={!editingUser}
                minLength={6}
                placeholder={
                  editingUser ? 'Deixe em branco para manter a atual' : 'Mínimo 6 caracteres'
                }
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Nível de Acesso</Label>
              <Select
                value={formData.role}
                onValueChange={(val) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-2">
              <Label>Plantas Autorizadas</Label>
              <ScrollArea className="h-[140px] w-full rounded-md border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="space-y-3">
                  {plants.length > 0 ? (
                    plants.map((plant) => (
                      <div key={plant.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`plant-${plant.id}`}
                          checked={formData.authorized_plants.includes(plant.id)}
                          onCheckedChange={() => togglePlant(plant.id)}
                          className="mt-0.5"
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={`plant-${plant.id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {plant.name}
                          </label>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">
                      Nenhuma planta disponível no momento.
                    </p>
                  )}
                </div>
              </ScrollArea>
              <p className="text-[11px] text-slate-500 leading-tight">
                Selecione as plantas que este usuário poderá acessar. Se nenhuma for selecionada, o
                usuário terá acesso padrão conforme seu nível.
              </p>
            </div>

            <DialogFooter className="pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
