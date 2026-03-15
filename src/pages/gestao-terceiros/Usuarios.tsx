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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useToast } from '@/hooks/use-toast'
import { logAudit } from '@/services/audit'
import { useAuth } from '@/hooks/use-auth'

export default function Usuarios() {
  const [usersList, setUsersList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { profile } = useAppStore()
  const { user } = useAuth()
  const { toast } = useToast()

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Operacional' })

  const fetchUsers = async () => {
    if (!profile?.client_id) return
    const { data } = await supabase.from('profiles').select('*').eq('client_id', profile.client_id)
    setUsersList(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [profile])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          ...form,
          client_id: profile?.client_id,
          accessible_menus: [],
          authorized_plants: [],
        },
      })

      if (error) throw error

      toast({ title: 'Usuário criado com sucesso' })
      if (user && profile)
        logAudit(
          profile.client_id,
          user.id,
          'Criação de Usuário',
          `Email: ${form.email} | Nível: ${form.role}`,
        )
      setIsOpen(false)
      setForm({ name: '', email: '', password: '', role: 'Operacional' })
      fetchUsers()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar usuário',
        description: err.message || 'Verifique se as funções Edge estão rodando.',
      })
    } finally {
      setIsAdding(false)
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

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand-blue hover:bg-brand-blue/90 text-white">
              <Plus className="mr-2 h-4 w-4" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Senha Temporária</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={6}
                  required
                />
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
                    <SelectItem value="Administrador">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full mt-4" disabled={isAdding}>
                {isAdding ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null} Salvar Usuário
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-brand-light overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-blue" />
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
                        u.role === 'Master'
                          ? 'bg-brand-graphite text-white'
                          : u.role === 'Administrador'
                            ? 'bg-brand-blue text-white'
                            : 'bg-muted'
                      }
                    >
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-brand-blue hover:bg-brand-blue/10"
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
    </div>
  )
}
