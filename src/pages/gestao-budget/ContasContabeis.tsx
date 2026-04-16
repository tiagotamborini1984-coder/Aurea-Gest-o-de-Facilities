import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Search, BookOpen } from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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

export default function ContasContabeis() {
  const { profile } = useAppStore()
  const { toast } = useToast()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)

  const [form, setForm] = useState({ code: '', name: '', type: 'Despesa' })

  const fetchData = async () => {
    if (!profile?.client_id) return
    setLoading(true)

    const accountsRes = await supabase
      .from('budget_accounts')
      .select('*')
      .eq('client_id', profile.client_id)
      .order('name')

    if (accountsRes.error) {
      toast({ variant: 'destructive', title: 'Erro', description: accountsRes.error.message })
    } else {
      setItems(accountsRes.data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [profile?.client_id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.type || !profile?.client_id) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
      })
      return
    }

    if (form.code) {
      const { data: existing } = await supabase
        .from('budget_accounts')
        .select('id')
        .eq('client_id', profile.client_id)
        .eq('code', form.code)
        .maybeSingle()

      if (existing && existing.id !== selectedItem?.id) {
        toast({
          variant: 'destructive',
          title: 'Código duplicado',
          description: 'Já existe uma conta contábil com este código.',
        })
        return
      }
    }

    const payload = {
      client_id: profile.client_id,
      code: form.code || null,
      name: form.name,
      type: form.type,
    }

    if (selectedItem) {
      const { error } = await supabase
        .from('budget_accounts')
        .update(payload)
        .eq('id', selectedItem.id)
      if (error) {
        toast({ variant: 'destructive', title: 'Erro', description: error.message })
      } else {
        toast({ title: 'Conta Contábil atualizada' })
        setIsDialogOpen(false)
        fetchData()
      }
    } else {
      const { error } = await supabase.from('budget_accounts').insert([payload])
      if (error) {
        toast({ variant: 'destructive', title: 'Erro', description: error.message })
      } else {
        toast({ title: 'Conta Contábil cadastrada' })
        setIsDialogOpen(false)
        fetchData()
      }
    }
  }

  const handleDelete = async () => {
    if (!selectedItem) return
    const { error } = await supabase.from('budget_accounts').delete().eq('id', selectedItem.id)
    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message })
    } else {
      toast({ title: 'Removida com sucesso' })
      setIsDeleteDialogOpen(false)
      fetchData()
    }
  }

  const openEdit = (item: any) => {
    setSelectedItem(item)
    setForm({
      code: item.code || '',
      name: item.name,
      type: item.type || 'Despesa',
    })
    setIsDialogOpen(true)
  }

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.code?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-brand-vividBlue" />
            Contas Contábeis (Budget)
          </h1>
          <p className="text-gray-500 mt-1">
            Gerencie as contas globalmente para uso em todos os centros de custo.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedItem(null)
            setForm({ code: '', name: '', type: 'Despesa' })
            setIsDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Nova Conta
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Cadastros</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome da Conta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.code || '-'}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedItem(item)
                          setIsDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? 'Editar Conta Contábil' : 'Nova Conta Contábil'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código (Opcional)</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="Ex: 3.1.01"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receita">Receita</SelectItem>
                    <SelectItem value="Despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome da Conta *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Material de Limpeza"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta <strong>{selectedItem?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
