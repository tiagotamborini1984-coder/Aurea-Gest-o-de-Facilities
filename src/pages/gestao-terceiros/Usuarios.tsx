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
import { Plus, Loader2, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { CreateUserDialog } from './components/CreateUserDialog'
import { EditUserDialog } from './components/EditUserDialog'
import { useHasAccess } from '@/hooks/use-has-access'
import { Navigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { logAudit } from '@/services/audit'
import { useAuth } from '@/hooks/use-auth'

export default function Usuarios() {
  const [usersList, setUsersList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userToDelete, setUserToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { profile } = useAppStore()
  const { user: authUser } = useAuth()
  const hasAccess = useHasAccess('Usuários')
  const { toast } = useToast()

  const fetchUsers = async () => {
    let query = supabase
      .from('profiles')
      .select('*, clients(name)')
      .order('created_at', { ascending: false })

    if (profile?.role === 'Master') {
      if (selectedMasterClient !== 'all') {
        query = query.eq('client_id', selectedMasterClient)
      }
    } else {
      if (!profile?.client_id) return
      query = query.eq('client_id', profile.client_id)
    }

    const { data } = await query
    setUsersList(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [profile])

  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  const handleEditClick = (user: any) => {
    setSelectedUser(user)
    setEditOpen(true)
  }

  const canDeleteUser = (targetUser: any) => {
    if (!profile) return false
    if (targetUser.id === profile.id) return false // cannot delete self
    if (profile.role === 'Master') {
      return targetUser.role !== 'Master'
    }
    if (profile.role === 'Administrador') {
      return (
        targetUser.client_id === profile.client_id &&
        !['Master', 'Administrador'].includes(targetUser.role)
      )
    }
    return false
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id },
      })
      if (error) throw new Error(error.message)

      toast({
        title: 'Usuário excluído',
        description: 'O usuário foi removido com sucesso.',
        className: 'bg-green-50 text-green-900 border-green-200',
      })

      if (authUser && profile) {
        logAudit(
          profile.client_id || userToDelete.client_id,
          authUser.id,
          'Exclusão de Usuário',
          `Usuário excluído: ${userToDelete.email} | Nível: ${userToDelete.role}`,
        )
      }

      fetchUsers()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err.message || 'Ocorreu um erro ao excluir o usuário.',
      })
    } finally {
      setIsDeleting(false)
      setUserToDelete(null)
    }
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-gray-200">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold text-slate-800">Nome</TableHead>
              <TableHead className="font-semibold text-slate-800">E-mail</TableHead>
              {profile?.role === 'Master' && (
                <TableHead className="font-semibold text-slate-800">Empresa</TableHead>
              )}
              <TableHead className="font-semibold text-slate-800">Nível de Acesso</TableHead>
              <TableHead className="font-semibold text-slate-800 text-right pr-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={profile?.role === 'Master' ? 5 : 4}
                  className="text-center py-8"
                >
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-vividBlue" />
                </TableCell>
              </TableRow>
            ) : usersList.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={profile?.role === 'Master' ? 5 : 4}
                  className="text-center py-8 text-slate-600"
                >
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              usersList.map((u) => (
                <TableRow key={u.id} className="hover:bg-slate-50 border-gray-100">
                  <TableCell className="font-medium text-brand-graphite">{u.name}</TableCell>
                  <TableCell className="text-slate-600">{u.email}</TableCell>
                  {profile?.role === 'Master' && (
                    <TableCell className="text-slate-600">{u.clients?.name || '-'}</TableCell>
                  )}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        u.role === 'Administrador' || u.role === 'Master'
                          ? 'bg-brand-vividBlue text-white border-brand-vividBlue'
                          : u.role === 'Gestor'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                      }
                    >
                      {u.role === 'Master' ? 'Administrador' : u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-brand-vividBlue hover:bg-brand-vividBlue/10 hover:text-brand-vividBlue"
                        onClick={() => handleEditClick(u)}
                      >
                        Editar
                      </Button>
                      {canDeleteUser(u) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setUserToDelete(u)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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

      <AlertDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && !isDeleting && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.name}</strong> (
              {userToDelete?.email})? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteConfirm()
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
