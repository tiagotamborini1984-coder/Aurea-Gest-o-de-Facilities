import { useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { useMasterData } from '@/hooks/use-master-data'
import { useAppStore } from '@/store/AppContext'
import { useHasAccess } from '@/hooks/use-has-access'
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Briefcase, Loader2, Plus, Edit2, Trash2, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function CadastrosFuncoes() {
  const { profile } = useAppStore()
  const hasAccess = useHasAccess('Cadastros:Funções')
  const { functions, trainings, functionRequiredTrainings, refetch, loading } = useMasterData()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({ name: '', description: '' })
  const [selectedTrainings, setSelectedTrainings] = useState<string[]>([])

  const filteredData = useMemo(() => {
    return functions.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [functions, searchTerm])

  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  const openAdd = () => {
    setEditingId(null)
    setForm({ name: '', description: '' })
    setSelectedTrainings([])
    setIsModalOpen(true)
  }

  const openEdit = (item: any) => {
    setEditingId(item.id)
    setForm({ name: item.name, description: item.description || '' })
    const reqTrainings = functionRequiredTrainings
      .filter((frt) => frt.function_id === item.id)
      .map((frt) => frt.training_id)
    setSelectedTrainings(reqTrainings)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('functions').delete().eq('id', id)
    if (!error) {
      toast({ title: 'Função removida com sucesso' })
      refetch()
    } else {
      toast({ title: 'Erro ao remover função', variant: 'destructive' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !profile?.client_id) return
    setIsSubmitting(true)

    try {
      const { data: funcData, error: funcError } = await supabase
        .from('functions')
        .upsert({
          id: editingId || undefined,
          client_id: profile.client_id,
          name: form.name,
          description: form.description,
        })
        .select()
        .single()

      if (funcError) throw funcError

      await supabase
        .from('function_required_trainings' as any)
        .delete()
        .eq('function_id', funcData.id)

      if (selectedTrainings.length > 0) {
        const payload = selectedTrainings.map((tId) => ({
          client_id: profile.client_id,
          function_id: funcData.id,
          training_id: tId,
        }))
        const { error: frtError } = await supabase
          .from('function_required_trainings' as any)
          .insert(payload)
        if (frtError) throw frtError
      }

      toast({
        title: `Função ${editingId ? 'atualizada' : 'criada'} com sucesso!`,
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      refetch()
      setIsModalOpen(false)
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleTraining = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedTrainings([...selectedTrainings, id])
    } else {
      setSelectedTrainings(selectedTrainings.filter((t) => t !== id))
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-deepBlue/10 p-2.5 rounded-xl border border-brand-deepBlue/20 shadow-sm">
            <Briefcase className="h-6 w-6 text-brand-deepBlue" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Funções</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Cargos e mapeamento de treinamentos obrigatórios
            </p>
          </div>
        </div>
        <Button onClick={openAdd} variant="tech">
          <Plus className="w-4 h-4 mr-2" /> Nova Função
        </Button>
      </div>

      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center px-3 gap-2">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Buscar funções..."
          className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-gray-100">
            <TableRow>
              <TableHead className="font-semibold text-slate-600">Nome</TableHead>
              <TableHead className="font-semibold text-slate-600">Descrição</TableHead>
              <TableHead className="font-semibold text-slate-600">Treinamentos Req.</TableHead>
              <TableHead className="font-semibold text-slate-600 text-right pr-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-deepBlue" />
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  Nenhuma função encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => {
                const reqCount = functionRequiredTrainings.filter(
                  (frt) => frt.function_id === item.id,
                ).length
                return (
                  <TableRow key={item.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-700">{item.name}</TableCell>
                    <TableCell className="text-slate-600 max-w-md truncate">
                      {item.description || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                        {reqCount} {reqCount === 1 ? 'Treinamento' : 'Treinamentos'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(item)}
                          className="text-slate-600 hover:text-brand-deepBlue hover:bg-slate-100"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Função' : 'Nova Função'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Nome da Função *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b pb-2">
                <Label className="text-base font-semibold">Treinamentos Obrigatórios</Label>
                <span className="text-xs text-muted-foreground">
                  Selecione os requisitos da função
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {trainings.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    Nenhum treinamento cadastrado no catálogo.
                  </p>
                ) : (
                  trainings.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start space-x-3 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                    >
                      <Checkbox
                        id={`t-${t.id}`}
                        checked={selectedTrainings.includes(t.id)}
                        onCheckedChange={(c) => toggleTraining(t.id, c as boolean)}
                        className="mt-0.5"
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label htmlFor={`t-${t.id}`} className="font-medium cursor-pointer text-sm">
                          {t.name}
                        </Label>
                        {t.description && (
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
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
