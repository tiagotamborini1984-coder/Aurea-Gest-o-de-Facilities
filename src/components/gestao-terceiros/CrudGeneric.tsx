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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2, Edit2, Search, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/AppContext'
import { cn } from '@/lib/utils'

export type FieldDef = {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'toggle'
  options?: { value: string; label: string }[]
  render?: (val: any, item: any) => React.ReactNode
  required?: boolean
}

export function CrudGeneric({
  title,
  subtitle,
  tableName,
  icon: Icon,
  fields,
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
    setIsModalOpen(true)
  }

  const openEdit = (item: any) => {
    setForm({ ...item })
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    for (const field of fields) {
      if (field.required !== false && field.type !== 'toggle') {
        const val = form[field.name]
        if (val === undefined || val === null || val === '') {
          toast({ title: `O campo ${field.label} é obrigatório`, variant: 'destructive' })
          return
        }
      }
    }

    setIsSubmitting(true)
    let success = false
    if (editingItem) {
      success = await onUpdate(editingItem.id, form)
    } else {
      success = await onAdd(form)
    }

    if (success) {
      toast({ title: `${title} salvo com sucesso` })
      setIsModalOpen(false)
      setForm({})
      setEditingItem(null)
      load()
    } else {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
    setIsSubmitting(false)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    const { error } = await supabase.from(tableName).delete().eq('id', itemToDelete)
    if (!error) {
      toast({ title: 'Removido com sucesso' })
      if (onRemove) onRemove(itemToDelete)
      load()
    } else {
      toast({
        title: 'Erro ao remover. Verifique se há registros dependentes.',
        variant: 'destructive',
      })
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

  const groupedData = groupBy
    ? filteredData.reduce(
        (acc, item) => {
          const key = groupBy(item) || 'Sem Categoria'
          if (!acc[key]) acc[key] = []
          acc[key].push(item)
          return acc
        },
        {} as Record<string, any[]>,
      )
    : { 'Todos os Registros': filteredData }

  const groupedKeys = Object.keys(groupedData).sort()

  const getPlantName = (item: any) => {
    if (tableName === 'plants') return item.city || ''
    if (item.plant_id && plants) {
      return plants.find((p: any) => p.id === item.plant_id)?.name || ''
    }
    return ''
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-brand-graphite">{title}</h2>
          {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
        </div>
        <Button
          onClick={openAdd}
          style={{ backgroundColor: activeClient?.primaryColor || '#22c55e' }}
          className="text-white hover:opacity-90 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo {title.endsWith('s') ? title.slice(0, -1) : title}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 w-full flex items-center px-3 gap-2 sm:border-r border-gray-100">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={`Buscar ${title.toLowerCase()}...`}
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

      <div className="space-y-8 animate-fade-in">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground bg-white rounded-xl border border-gray-100 border-dashed">
            Nenhum registro encontrado.
          </div>
        ) : (
          groupedKeys.map((groupName) => {
            const items = groupedData[groupName]
            return (
              <div key={groupName} className="space-y-4">
                {groupBy && (
                  <div className="flex items-center gap-3 px-1">
                    {Icon && (
                      <Icon
                        className="w-5 h-5"
                        style={{ color: activeClient?.secondaryColor || '#22c55e' }}
                      />
                    )}
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-700">
                      {groupName}
                    </h4>
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-600 rounded-md px-2 py-0.5 border-0"
                    >
                      {items.length}
                    </Badge>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className={cn(
                        'p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-gray-50/50',
                        index !== items.length - 1 && 'border-b border-gray-50',
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-full flex flex-shrink-0 items-center justify-center"
                          style={{
                            backgroundColor: activeClient?.secondaryColor
                              ? `${activeClient.secondaryColor}15`
                              : '#f0fdf4',
                          }}
                        >
                          {Icon && (
                            <Icon
                              className="w-6 h-6"
                              style={{ color: activeClient?.secondaryColor || '#22c55e' }}
                            />
                          )}
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-900 uppercase text-sm mb-0.5">
                            {item.name || item.type || title}
                          </h5>
                          <p className="text-xs text-muted-foreground font-medium">
                            {getPlantName(item)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t sm:border-0 pt-4 sm:pt-0 border-gray-100">
                        <Badge
                          className="text-white rounded-md font-medium px-3 py-1 border-0"
                          style={{
                            backgroundColor:
                              item.is_active !== false
                                ? activeClient?.primaryColor || '#22c55e'
                                : '#94a3b8',
                          }}
                        >
                          {item.is_active !== false ? 'Ativo' : 'Inativo'}
                        </Badge>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="p-2 text-gray-400 hover:text-gray-900 transition-colors bg-white hover:bg-gray-100 rounded-full border border-gray-100 shadow-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemToDelete(item.id)}
                            className="p-2 text-red-400 hover:text-red-600 transition-colors bg-white hover:bg-red-50 rounded-full border border-gray-100 shadow-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-brand-graphite">
              {editingItem ? 'Editar' : 'Adicionar'}{' '}
              {title.endsWith('s') ? title.slice(0, -1) : title}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((f: FieldDef) => (
                <div
                  key={f.name}
                  className={cn(
                    'space-y-2',
                    f.type === 'toggle'
                      ? 'col-span-1 sm:col-span-2 flex flex-row items-center justify-between border border-gray-200 rounded-lg p-3 shadow-sm'
                      : '',
                  )}
                >
                  {f.type !== 'toggle' && (
                    <label className="text-sm font-medium text-gray-700">
                      {f.label} {f.required !== false && <span className="text-red-500">*</span>}
                    </label>
                  )}
                  {(f.type === 'text' || f.type === 'number') && (
                    <Input
                      type={f.type}
                      value={form[f.name] ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [f.name]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                        })
                      }
                    />
                  )}
                  {f.type === 'select' && (
                    <Select
                      value={form[f.name] === null ? 'none' : form[f.name]?.toString() || 'none'}
                      onValueChange={(v) => setForm({ ...form, [f.name]: v === 'none' ? null : v })}
                    >
                      <SelectTrigger className="w-full bg-white h-10">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-muted-foreground">
                          Nenhum / Não se aplica
                        </SelectItem>
                        {f.options?.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {f.type === 'toggle' && (
                    <>
                      <div className="space-y-0.5">
                        <label className="text-sm font-medium text-gray-700">{f.label}</label>
                      </div>
                      <Switch
                        checked={form[f.name] || false}
                        onCheckedChange={(v) => setForm({ ...form, [f.name]: v })}
                        style={{
                          backgroundColor: form[f.name] ? activeClient?.primaryColor : undefined,
                        }}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                style={{ backgroundColor: activeClient?.primaryColor || '#22c55e' }}
                className="text-white hover:opacity-90"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingItem ? 'Salvar Alterações' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente este registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
