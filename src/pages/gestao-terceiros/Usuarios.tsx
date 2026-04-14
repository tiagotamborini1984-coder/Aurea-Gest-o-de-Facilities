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
import { useHasAccess } from '@/hooks/use-has-access'
import { Navigate } from 'react-router-dom'

export default function Usuarios() {
  const [usersList, setUsersList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)

  const { profile } = useAppStore()
  const hasAccess = useHasAccess('Usuários')

  const fetchUsers = async () => {
    let query = supabase
      .from('profiles')
      .select('*, clients(name)')
      .order('created_at', { ascending: false })

    if (profile?.role !== 'Master') {
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-brand-vividBlue hover:bg-brand-vividBlue/10 hover:text-brand-vividBlue"
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
