import { useState, useEffect } from 'react'
import { CheckSquare, Plus, Search, Edit2, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'
import { useToast } from '@/hooks/use-toast'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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

export default function TiposChamado() {
  const { profile } = useAppStore()
  const hasAccess = useHasAccess('Gestão de Tarefas')
  const { toast } = useToast()

  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState({ id: '', name: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchData = async () => {
    if (!profile) return
    setLoading(true)
    try {
      const { data: records, error } = await supabase
        .from('task_types')
        .select('*')
        .eq('client_id', profile.client_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setData(records || [])
    } catch (err: any) {
      toast({ title: 'Erro ao buscar dados', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile) fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  const filteredData = data.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleOpenForm = (item?: any) => {
    if (item) {
      setFormData({ id: item.id, name: item.name })
    } else {
      setFormData({ id: '', name: '' })
    }
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor preencha o nome.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      if (formData.id) {
        const { error } = await supabase
          .from('task_types')
          .update({ name: formData.name })
          .eq('id', formData.id)
        if (error) throw error
        toast({ title: 'Sucesso', description: 'Tipo atualizado com sucesso.' })
      } else {
        const { error } = await supabase
          .from('task_types')
          .insert({ name: formData.name, client_id: profile.client_id })
        if (error) throw error
        toast({ title: 'Sucesso', description: 'Tipo criado com sucesso.' })
      }
      setIsFormOpen(false)
      fetchData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.from('task_types').delete().eq('id', deleteId)
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Tipo removido com sucesso.' })
      setDeleteId(null)
      fetchData()
    } catch (err: any) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500 bg-background text-foreground">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <CheckSquare className="h-8 w-8 text-primary" />
            Tipos de Chamado
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os tipos de chamados disponíveis para o sistema.
          </p>
        </div>
        <Button onClick={() => handleOpenForm()} className="w-full md:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Novo Tipo
        </Button>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/40">
          <CardTitle className="text-card-foreground text-lg flex items-center gap-2">
            Lista de Tipos
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Todos os tipos de chamados cadastrados.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border bg-card">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border hover:bg-muted/50">
                  <TableHead className="text-muted-foreground font-semibold">Nome</TableHead>
                  <TableHead className="text-right text-muted-foreground font-semibold w-[100px]">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-32 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-32 text-center text-muted-foreground">
                      Nenhum tipo encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-border hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenForm(item)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(item.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">
              {formData.id ? 'Editar Tipo de Chamado' : 'Novo Tipo de Chamado'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-foreground">
                Nome do Tipo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Manutenção Elétrica"
                className="bg-background border-input text-foreground focus-visible:ring-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              className="border-input text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-card-foreground">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir este tipo de chamado? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-input text-foreground hover:bg-accent hover:text-accent-foreground">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
