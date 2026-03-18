import { useState, useMemo } from 'react'
import { useMasterData } from '@/hooks/use-master-data'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Package, Search, Plus, Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useHasAccess } from '@/hooks/use-has-access'
import { Navigate } from 'react-router-dom'

export default function TiposEncomenda() {
  const { profile } = useAppStore()
  const { packageTypes, refetch, loading } = useMasterData()
  const { toast } = useToast()
  const hasAccess = useHasAccess('Encomendas')

  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState('')

  const filteredTypes = useMemo(() => {
    return packageTypes.filter((t) => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [packageTypes, searchTerm])

  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !profile?.client_id) return
    setIsSubmitting(true)

    try {
      const { error } = await supabase.from('package_types').insert({
        client_id: profile.client_id,
        name,
      })
      if (error) throw error
      toast({
        title: 'Tipo de embalagem criado com sucesso',
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      setIsModalOpen(false)
      setName('')
      refetch()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('package_types').delete().eq('id', id)
    if (!error) {
      toast({ title: 'Removido com sucesso' })
      refetch()
    } else {
      toast({ title: 'Erro ao remover', variant: 'destructive' })
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-deepBlue/10 p-2.5 rounded-xl border border-brand-deepBlue/20 shadow-sm">
            <Package className="h-6 w-6 text-brand-deepBlue" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Tipos de Embalagem
            </h2>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Categorias de pacotes e correspondências.
            </p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="tech">
          <Plus className="w-4 h-4 mr-2" /> Novo Tipo
        </Button>
      </div>

      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center px-3 gap-2">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-gray-100">
            <TableRow>
              <TableHead className="font-semibold text-slate-600">Nome do Tipo</TableHead>
              <TableHead className="font-semibold text-slate-600 text-right pr-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-deepBlue" />
                </TableCell>
              </TableRow>
            ) : filteredTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-10 text-muted-foreground">
                  Nenhum tipo encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredTypes.map((t) => (
                <TableRow key={t.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-700">{t.name}</TableCell>
                  <TableCell className="text-right pr-6">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(t.id)}
                      className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Tipo de Embalagem</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex: Caixa Pequena"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="tech" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
