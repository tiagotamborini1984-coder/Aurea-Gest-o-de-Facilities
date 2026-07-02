import { useState, useEffect, useCallback } from 'react'
import { inventoryService } from '@/services/inventory'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Edit2, Trash2, Plus, Check, X } from 'lucide-react'
import { toast } from 'sonner'

interface CategoryManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string | undefined
  onCategoriesChanged: () => void
}

export function CategoryManagerDialog({
  open,
  onOpenChange,
  clientId,
  onCategoriesChanged,
}: CategoryManagerDialogProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const loadCategories = useCallback(async () => {
    if (!clientId) return
    try {
      const data = await inventoryService.getCategories(clientId)
      setCategories(data)
    } catch {
      toast.error('Erro ao carregar categorias')
    }
  }, [clientId])

  useEffect(() => {
    if (open) loadCategories()
  }, [open, loadCategories])

  const handleAdd = async () => {
    if (!clientId) return
    if (!newName.trim()) return toast.error('Nome é obrigatório')
    const exists = categories.some((c) => c.name.toLowerCase() === newName.trim().toLowerCase())
    if (exists) return toast.error('Categoria já existe')
    try {
      await inventoryService.saveCategory({ client_id: clientId, name: newName.trim() })
      toast.success('Categoria criada')
      setNewName('')
      loadCategories()
      onCategoriesChanged()
    } catch {
      toast.error('Erro ao criar categoria')
    }
  }

  const handleSaveEdit = async () => {
    if (!clientId || !editingId) return
    if (!editName.trim()) return toast.error('Nome é obrigatório')
    const category = categories.find((c) => c.id === editingId)
    if (!category) return
    const exists = categories.some(
      (c) => c.id !== editingId && c.name.toLowerCase() === editName.trim().toLowerCase(),
    )
    if (exists) return toast.error('Categoria já existe')
    try {
      await inventoryService.saveCategory({
        id: editingId,
        client_id: clientId,
        name: editName.trim(),
        oldName: category.name,
      })
      toast.success('Categoria atualizada')
      setEditingId(null)
      setEditName('')
      loadCategories()
      onCategoriesChanged()
    } catch {
      toast.error('Erro ao atualizar categoria')
    }
  }

  const handleDelete = async (category: any) => {
    if (!clientId) return
    try {
      const count = await inventoryService.getCategoryProductCount(clientId, category.name)
      const msg =
        count > 0
          ? `Existem ${count} produto(s) usando esta categoria. Deseja excluir mesmo assim?`
          : 'Tem certeza que deseja excluir esta categoria?'
      if (!window.confirm(msg)) return
      await inventoryService.deleteCategory(category.id)
      toast.success('Categoria excluída')
      loadCategories()
      onCategoriesChanged()
    } catch {
      toast.error('Erro ao excluir categoria')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nova categoria..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-auto">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-2 p-2 rounded-md border border-slate-200"
              >
                {editingId === cat.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                      className="h-8"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={handleSaveEdit}
                    >
                      <Check className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">{cat.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingId(cat.id)
                        setEditName(cat.name)
                      }}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleDelete(cat)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </Button>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-center text-sm text-slate-500 py-4">
                Nenhuma categoria cadastrada.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
