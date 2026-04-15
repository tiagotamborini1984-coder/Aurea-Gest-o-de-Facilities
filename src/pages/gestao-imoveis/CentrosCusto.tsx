import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, Building2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useToast } from '@/hooks/use-toast'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const formSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
})

type CostCenter = {
  id: string
  name: string
  created_at: string
}

export default function CentrosCusto() {
  const { activeClient } = useAppStore()
  const { toast } = useToast()
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  })

  const fetchCostCenters = async () => {
    if (!activeClient?.id) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('property_cost_centers')
        .select('*')
        .eq('client_id', activeClient.id)
        .order('name')

      if (error) throw error
      setCostCenters(data || [])
    } catch (error) {
      toast({ title: 'Erro ao buscar centros de custo', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCostCenters()
  }, [activeClient?.id])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!activeClient?.id) return
    try {
      if (editingId) {
        const { error } = await supabase
          .from('property_cost_centers')
          .update({ name: values.name })
          .eq('id', editingId)
        if (error) throw error
        toast({ title: 'Centro de custo atualizado com sucesso!' })
      } else {
        const { error } = await supabase
          .from('property_cost_centers')
          .insert({ client_id: activeClient.id, name: values.name })
        if (error) throw error
        toast({ title: 'Centro de custo criado com sucesso!' })
      }
      setIsDialogOpen(false)
      fetchCostCenters()
    } catch (error) {
      toast({ title: 'Erro ao salvar centro de custo', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      const { error } = await supabase.from('property_cost_centers').delete().eq('id', deletingId)
      if (error) throw error
      toast({ title: 'Centro de custo excluído com sucesso!' })
      fetchCostCenters()
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Pode haver hóspedes vinculados a este centro de custo.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setDeletingId(null)
    }
  }

  const openEdit = (cc: CostCenter) => {
    setEditingId(cc.id)
    form.reset({ name: cc.name })
    setIsDialogOpen(true)
  }

  const openCreate = () => {
    setEditingId(null)
    form.reset({ name: '' })
    setIsDialogOpen(true)
  }

  const confirmDelete = (id: string) => {
    setDeletingId(id)
    setIsDeleteDialogOpen(true)
  }

  const filteredData = costCenters.filter((cc) =>
    cc.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8 text-brand-vividBlue" />
            Centros de Custo
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie os centros de custo para locação</p>
        </div>
        <Button onClick={openCreate} className="bg-brand-vividBlue hover:bg-brand-vividBlue/90">
          <Plus className="mr-2 h-4 w-4" /> Novo Centro de Custo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Lista de Centros de Custo</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      Nenhum centro de custo encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((cc) => (
                    <TableRow key={cc.id}>
                      <TableCell className="font-medium">{cc.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(cc)}>
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => confirmDelete(cc.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Centro de Custo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Diretoria, TI, Comercial..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-brand-vividBlue hover:bg-brand-vividBlue/90">
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o centro de custo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
