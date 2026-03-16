import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { CreateUserDialog } from './components/CreateUserDialog'
import { EditUserDialog } from './components/EditUserDialog'

export default function Usuarios() {
  const [usersList, setUsersList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const { profile } = useAppStore()

  const fetchUsers = async () => {
    if (!profile?.client_id) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('client_id', profile.client_id)
      .order('created_at', { ascending: false })
    setUsersList(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [profile])

  const handleEditClick = (user: any) => {
    setSelectedUser(user)
    setEditOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestão de Usuários</h2>
          <p className="text-muted-foreground mt-1">
            Controle de acessos e permissões granulares por cliente.
          </p>
        </div>
        <Button
          className="bg-brand-vividBlue hover:bg-brand-vividBlue/90 text-white"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-brand-light overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Nível de Acesso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-vividBlue" />
                </TableCell>
              </TableRow>
            ) : usersList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              usersList.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-brand-graphite">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        u.role === 'Administrador' || u.role === 'Master'
                          ? 'bg-brand-vividBlue text-white border-brand-vividBlue'
                          : u.role === 'Gestor'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-slate-100 text-slate-600'
                      }
                    >
                      {u.role === 'Master' ? 'Administrador' : u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-brand-vividBlue hover:bg-brand-vividBlue/10"
                      onClick={() => handleEditClick(u)}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={fetchUsers} />
      <EditUserDialog
        userToEdit={selectedUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={fetchUsers}
      />
    </div>
  )
}
