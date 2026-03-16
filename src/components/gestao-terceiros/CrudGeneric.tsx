import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Trash2, Edit2, Search, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/AppContext'
import { cn } from '@/lib/utils'

export type FieldDef = {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'toggle'
  options?: { value: string; label: string }[] | ((form: any) => { value: string; label: string }[])
  required?: boolean
  hidden?: (form: any) => boolean
  disabled?: (form: any) => boolean
  onChangeReset?: string[]
}

export type ColumnDef = {
  header: string
  accessor: string
  render?: (item: any) => React.ReactNode
}

export function CrudGeneric({
  title,
  singularName,
  subtitle,
  tableName,
  icon: Icon,
  fields,
  columns,
  fetchQuery,
  onAdd,
  onUpdate,
  onRemove,
  plantField,
  searchFields,
  groupBy,
  plants,
}: any) {
  const { activeClient } = useAppStore()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<any>({})
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetchQuery()
    setData(res || [])
    setLoading(false)
  }, [fetchQuery])

  useEffect(() => {
    load()
  }, [load])

  const openAdd = () => {
    setForm({})
    setEditingItem(null)
    setFormErrors({})
    setIsModalOpen(true)
  }
  const openEdit = (item: any) => {
    setForm({ ...item })
    setEditingItem(item)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      toast({
        title: 'Sessão expirada',
        description: 'Sua sessão expirou. Por favor, faça login novamente para salvar.',
        variant: 'destructive',
      })
      return
    }

    const errors: Record<string, boolean> = {}
    let hasError = false

    for (const field of fields) {
      if (field.hidden && field.hidden(form)) continue
      if (field.required !== false && field.type !== 'toggle') {
        const val = form[field.name]
        if (val === undefined || val === null || val === '') {
          errors[field.name] = true
          hasError = true
        }
      }
    }

    if (hasError) {
      const missingFields = fields
        .filter((f: FieldDef) => errors[f.name])
        .map((f: FieldDef) => f.label)
        .join(', ')
      setFormErrors(errors)
      toast({
        title: 'Campos obrigatórios ausentes',
        description: `Por favor, preencha: ${missingFields}`,
        variant: 'destructive',
      })
      return
    }

    setFormErrors({})
    setIsSubmitting(true)

    try {
      const payload = { ...form }
      for (const field of fields) {
        if (field.hidden && field.hidden(form)) {
          payload[field.name] = null
        }
      }

      const result = editingItem ? await onUpdate(editingItem.id, payload) : await onAdd(payload)

      const success = typeof result === 'boolean' ? result : result?.success
      const errorObj = typeof result === 'boolean' ? null : result?.error

      const itemName = singularName || title
      const itemNameLower = singularName ? singularName.toLowerCase() : title.toLowerCase()

      if (success) {
        toast({
          title: `${itemName} ${editingItem ? 'atualizado' : 'salvo'} com sucesso!`,
          className: 'bg-green-50 text-green-900 border-green-200',
        })
        setIsModalOpen(false)
        load()
      } else {
        toast({
          title: `Erro ao salvar o ${itemNameLower}.`,
          description: errorObj?.message || 'Por favor, verifique os dados e tente novamente.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro inesperado',
        description: err.message || 'Falha ao processar a requisição.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    const { error } = await supabase.from(tableName).delete().eq('id', itemToDelete)
    if (!error) {
      toast({ title: 'Removido com sucesso' })
      if (onRemove) onRemove(itemToDelete)
      load()
    } else {
      toast({ title: 'Erro ao remover. Verifique as dependências.', variant: 'destructive' })
    }
    setItemToDelete(null)
  }

  const filteredData = data.filter((item) => {
    const matchesPlant =
      selectedPlant === 'all' || !plantField || item[plantField] === selectedPlant
    const matchesSearch =
      !searchFields ||
      searchFields.length === 0 ||
      searchTerm === '' ||
      searchFields.some((field: string) =>
        String(item[field] || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      )
    return matchesPlant && matchesSearch
  })

  const getPlantName = (item: any) => {
    if (tableName === 'plants') return item.city || ''
    if (item.plant_id && plants) return plants.find((p: any) => p.id === item.plant_id)?.name || ''
    return ''
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-brand-graphite">{title}</h2>
          {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
        </div>
        <Button onClick={openAdd} variant="tech" className="shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Novo Registro
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 w-full flex items-center px-3 gap-2 sm:border-r border-gray-100">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {plantField && plants && plants.length > 0 && (
          <div className="w-full sm:w-72">
            <Select value={selectedPlant} onValueChange={setSelectedPlant}>
              <SelectTrigger className="border-0 shadow-none focus:ring-0 bg-transparent h-10">
                <SelectValue placeholder="Selecione a planta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Plantas</SelectItem>
                {plants.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="animate-fade-in">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground bg-white rounded-xl border border-gray-100 border-dashed">
            Nenhum registro encontrado.
          </div>
        ) : columns ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-gray-100">
                <TableRow>
                  {columns.map((col: ColumnDef, idx: number) => (
                    <TableHead key={idx} className="font-semibold text-slate-600">
                      {col.header}
                    </TableHead>
                  ))}
                  <TableHead className="font-semibold text-slate-600 text-right pr-6">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50">
                    {columns.map((col: ColumnDef, idx: number) => (
                      <TableCell key={idx} className="py-3 text-slate-700">
                        {col.render ? col.render(item) : item[col.accessor]}
                      </TableCell>
                    ))}
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-brand-deepBlue bg-white hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col divide-y divide-gray-50">
            {filteredData.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex flex-shrink-0 items-center justify-center bg-gray-50">
                    {Icon && <Icon className="w-6 h-6 text-gray-500" />}
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900 text-sm mb-0.5">
                      {item.name || item.type || title}
                    </h5>
                    <p className="text-xs text-muted-foreground font-medium">
                      {getPlantName(item)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                  <Badge
                    className="text-white px-3 py-1 border-0"
                    style={{
                      backgroundColor:
                        item.is_active !== false
                          ? activeClient?.primaryColor || '#1e3a8a'
                          : '#94a3b8',
                    }}
                  >
                    {item.is_active !== false ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="p-2 text-gray-400 hover:text-brand-deepBlue bg-white border border-gray-100 rounded-full shadow-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemToDelete(item.id)}
                      className="p-2 text-gray-400 hover:text-red-600 bg-white border border-gray-100 rounded-full shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar' : 'Adicionar'} Registro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((f: FieldDef) => {
                if (f.hidden && f.hidden(form)) return null
                return (
                  <div
                    key={f.name}
                    className={cn(
                      'space-y-2',
                      f.type === 'toggle'
                        ? 'col-span-1 sm:col-span-2 flex items-center justify-between border border-gray-200 p-3 rounded-lg'
                        : f.type === 'textarea'
                          ? 'col-span-1 sm:col-span-2'
                          : '',
                    )}
                  >
                    {f.type !== 'toggle' && (
                      <label
                        className={cn('text-sm font-medium', formErrors[f.name] && 'text-red-500')}
                      >
                        {f.label} {f.required !== false && <span className="text-red-500">*</span>}
                      </label>
                    )}
                    {(f.type === 'text' || f.type === 'number') && (
                      <Input
                        type={f.type}
                        value={form[f.name] ?? ''}
                        onChange={(e) => {
                          setForm({
                            ...form,
                            [f.name]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                          })
                          if (formErrors[f.name]) setFormErrors({ ...formErrors, [f.name]: false })
                        }}
                        className={cn(
                          formErrors[f.name] && 'border-red-500 focus-visible:ring-red-500',
                        )}
                        disabled={f.disabled ? f.disabled(form) : false}
                      />
                    )}
                    {f.type === 'textarea' && (
                      <Textarea
                        value={form[f.name] ?? ''}
                        onChange={(e) => {
                          setForm({ ...form, [f.name]: e.target.value })
                          if (formErrors[f.name]) setFormErrors({ ...formErrors, [f.name]: false })
                        }}
                        className={cn(
                          'resize-none',
                          formErrors[f.name] && 'border-red-500 focus-visible:ring-red-500',
                        )}
                        rows={3}
                        disabled={f.disabled ? f.disabled(form) : false}
                      />
                    )}
                    {f.type === 'select' && (
                      <Select
                        value={form[f.name] === null ? 'none' : form[f.name]?.toString() || 'none'}
                        onValueChange={(v) => {
                          const newValue = v === 'none' ? null : v
                          const newForm = { ...form, [f.name]: newValue }
                          if (f.onChangeReset) {
                            f.onChangeReset.forEach((field) => {
                              newForm[field] = null
                            })
                          }
                          setForm(newForm)
                          if (formErrors[f.name]) setFormErrors({ ...formErrors, [f.name]: false })
                        }}
                        disabled={f.disabled ? f.disabled(form) : false}
                      >
                        <SelectTrigger
                          className={cn(
                            'w-full bg-white h-10',
                            formErrors[f.name] && 'border-red-500 focus:ring-red-500',
                          )}
                        >
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-muted-foreground">
                            Nenhum / Não aplicável
                          </SelectItem>
                          {(typeof f.options === 'function' ? f.options(form) : f.options)?.map(
                            (o: any) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    {f.type === 'toggle' && (
                      <>
                        <label className="text-sm font-medium">{f.label}</label>
                        <Switch
                          checked={form[f.name] || false}
                          onCheckedChange={(v) => setForm({ ...form, [f.name]: v })}
                          disabled={f.disabled ? f.disabled(form) : false}
                        />
                      </>
                    )}
                  </div>
                )
              })}
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
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>Ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
