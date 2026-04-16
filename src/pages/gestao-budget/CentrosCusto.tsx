import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Search, DollarSign } from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export default function CentrosCusto() {
  const { profile } = useAppStore()
  const { toast } = useToast()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [form, setForm] = useState({ code: '', name: '' })

  const fetchItems = async () => {
    const clientId = profile?.client_id || (profile?.role === 'Master' ? null : undefined)

    // Evita loop de loading caso os dados do perfil ainda estejam carregando
    if (clientId === undefined) return

    setLoading(true)
    let query = supabase.from('budget_cost_centers').select('*').order('name')

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query

    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message })
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (profile) {
      fetchItems()
    }
  }, [profile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const clientId = profile?.client_id

    if (!clientId && profile?.role !== 'Master') {
      toast({ variant: 'destructive', title: 'Erro', description: 'Cliente não identificado.' })
      return
    }

    if (!form.name) {
      toast({ variant: 'destructive', title: 'Erro', description: 'O nome é obrigatório.' })
      return
    }

    if (!clientId) {
      toast({
        variant: 'destructive',
        title: 'Atenção',
        description: 'Você precisa estar vinculado a um cliente para salvar centros de custo.',
      })
      return
    }

    setIsSaving(true)
    const payload = { client_id: clientId, code: form.code, name: form.name }

    if (selectedItem) {
      const { error } = await supabase
        .from('budget_cost_centers')
        .update(payload)
        .eq('id', selectedItem.id)

      setIsSaving(false)

      if (error) toast({ variant: 'destructive', title: 'Erro', description: error.message })
      else {
        toast({ title: 'Centro de Custo atualizado' })
        setIsDialogOpen(false)
        fetchItems()
      }
    } else {
      const { error } = await supabase.from('budget_cost_centers').insert([payload])

      setIsSaving(false)

      if (error) toast({ variant: 'destructive', title: 'Erro', description: error.message })
      else {
        toast({ title: 'Centro de Custo cadastrado' })
        setIsDialogOpen(false)
        fetchItems()
      }
    }
  }

  const handleDelete = async () => {
    if (!selectedItem) return
    const { error } = await supabase.from('budget_cost_centers').delete().eq('id', selectedItem.id)
    if (error) toast({ variant: 'destructive', title: 'Erro', description: error.message })
    else {
      toast({ title: 'Removido com sucesso' })
      setIsDeleteDialogOpen(false)
      fetchItems()
    }
  }

  const openEdit = (item: any) => {
    setSelectedItem(item)
    setForm({ code: item.code || '', name: item.name })
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
            <DollarSign className="h-6 w-6 text-brand-vividBlue" />
            Centros de Custo (Budget)
          </h1>
          <p className="text-gray-500 mt-1">
            Gerencie os centros de custo para alocação orçamentária.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedItem(null)
            setForm({ code: '', name: '' })
            setIsDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Novo Centro de Custo
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
                <TableHead>Nome do Centro de Custo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.code || '-'}</TableCell>
                    <TableCell>{item.name}</TableCell>
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
              {selectedItem ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Código (Opcional)</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Ex: CC-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do Centro de Custo</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Administração"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o centro de custo <strong>{selectedItem?.name}</strong>
              ?
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
