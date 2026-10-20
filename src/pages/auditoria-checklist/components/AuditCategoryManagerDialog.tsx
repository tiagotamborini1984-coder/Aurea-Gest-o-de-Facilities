import { useState, useEffect, useCallback, useId } from 'react'
import {
  AuditQuestionCategory,
  auditCategoryService,
} from '@/services/audit-categories'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Palette,
  Tag,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { normalizeMatch } from '@/lib/string-utils'

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#f97316', // orange
  '#64748b', // slate
]

interface AuditCategoryManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string | undefined
  onCategoriesChanged?: () => void
}

export function AuditCategoryManagerDialog({
  open,
  onOpenChange,
  clientId,
  onCategoriesChanged,
}: AuditCategoryManagerDialogProps) {
  const [categories, setCategories] = useState<AuditQuestionCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Creation state
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')

  // Edit inline state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#3b82f6')

  const newColorPickerId = useId()
  const editColorPickerId = useId()

  const loadCategories = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const data = await auditCategoryService.listCategories(clientId, true)
      setCategories(data)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao carregar categorias de auditoria')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    if (open) {
      loadCategories()
      setNewName('')
      setNewColor('#3b82f6')
      setEditingId(null)
    }
  }, [open, loadCategories])

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!clientId) {
      toast.error('Cliente não selecionado')
      return
    }
    const trimmed = newName.trim()
    if (!trimmed) {
      toast.error('Informe o nome da categoria')
      return
    }

    const exists = categories.some((c) => normalizeMatch(c.name, trimmed))
    if (exists) {
      toast.error('Já existe uma categoria cadastrada com este nome')
      return
    }

    setSaving(true)
    try {
      await auditCategoryService.createCategory({
        client_id: clientId,
        name: trimmed,
        color: newColor || '#3b82f6',
        is_active: true,
      })
      toast.success('Categoria criada com sucesso')
      setNewName('')
      await loadCategories()
      onCategoriesChanged?.()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao criar categoria')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (cat: AuditQuestionCategory) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color || '#3b82f6')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditColor('#3b82f6')
  }

  const handleSaveEdit = async (cat: AuditQuestionCategory) => {
    const trimmed = editName.trim()
    if (!trimmed) {
      toast.error('Informe o nome da categoria')
      return
    }

    const exists = categories.some(
      (c) => c.id !== cat.id && normalizeMatch(c.name, trimmed),
    )
    if (exists) {
      toast.error('Já existe outra categoria com este nome')
      return
    }

    setSaving(true)
    try {
      await auditCategoryService.updateCategory(cat.id, {
        name: trimmed,
        color: editColor,
      })
      toast.success('Categoria atualizada')
      cancelEdit()
      await loadCategories()
      onCategoriesChanged?.()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao atualizar categoria')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (cat: AuditQuestionCategory) => {
    try {
      await auditCategoryService.updateCategory(cat.id, {
        is_active: !cat.is_active,
      })
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: !c.is_active } : c)),
      )
      toast.success(
        !cat.is_active ? 'Categoria ativada' : 'Categoria inativada',
      )
      onCategoriesChanged?.()
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao alterar status da categoria')
      loadCategories()
    }
  }

  const handleDelete = async (cat: AuditQuestionCategory) => {
    try {
      const count = await auditCategoryService.getLinkedQuestionsCount(cat.id)
      if (count > 0) {
        toast.error(
          `Esta categoria está vinculada a ${count} pergunta(s). Desvincule as perguntas antes de excluir ou inative-a.`,
        )
        return
      }

      if (
        !window.confirm(
          `Deseja realmente excluir a categoria "${cat.name}"? Esta ação não pode ser desfeita.`,
        )
      ) {
        return
      }

      await auditCategoryService.deleteCategory(cat.id)
      toast.success('Categoria excluída com sucesso')
      await loadCategories()
      onCategoriesChanged?.()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao excluir categoria')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Tag className="w-5 h-5 text-primary" />
            Categorias de Perguntas de Auditoria
          </DialogTitle>
          <DialogDescription>
            Cadastre nomes livres para categorizar os itens avaliados nas auditorias.
            As cores definidas serão usadas nos gráficos dos relatórios.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 space-y-6 py-2">
          {/* Creation form */}
          <div className="p-4 bg-muted/40 rounded-lg border space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Nova Categoria
            </Label>
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full space-y-1">
                <span className="text-xs text-muted-foreground">Nome da categoria (livre)</span>
                <Input
                  placeholder="Ex: DO - Documental, LOJA - Salão, Higienização..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={saving}
                  className="bg-background"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Palette className="w-3 h-3" /> Cor
                </span>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={newColorPickerId}
                    className="w-10 h-9 rounded-md border cursor-pointer flex items-center justify-center p-1 bg-background"
                    title="Selecionar cor"
                  >
                    <span
                      className="w-full h-full rounded"
                      style={{ backgroundColor: newColor }}
                    />
                  </label>
                  <input
                    id={newColorPickerId}
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="sr-only"
                  />
                  <div className="hidden sm:flex items-center gap-1">
                    {PRESET_COLORS.slice(0, 5).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className={`w-6 h-6 rounded-full border transition-transform ${
                          newColor.toLowerCase() === c.toLowerCase()
                            ? 'scale-125 ring-2 ring-primary ring-offset-1'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={saving || !newName.trim()} className="w-full sm:w-auto">
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Cadastrar
              </Button>
            </form>
          </div>

          {/* Categories List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Categorias Cadastradas ({categories.length})
              </h4>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Carregando categorias...
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border rounded-lg border-dashed text-center p-4">
                <AlertCircle className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhuma categoria cadastrada ainda.
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Crie categorias como preferir (ex: Higiene, Salão, Estrutura, EPIs) para
                  agrupar as perguntas das suas auditorias.
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Cor</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-28 text-center">Status</TableHead>
                      <TableHead className="w-28 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat) => {
                      const isEditing = editingId === cat.id
                      return (
                        <TableRow key={cat.id}>
                          <TableCell>
                            {isEditing ? (
                              <div>
                                <label
                                  htmlFor={`${editColorPickerId}-${cat.id}`}
                                  className="w-7 h-7 rounded-md border cursor-pointer flex items-center justify-center p-0.5"
                                >
                                  <span
                                    className="w-full h-full rounded"
                                    style={{ backgroundColor: editColor }}
                                  />
                                </label>
                                <input
                                  id={`${editColorPickerId}-${cat.id}`}
                                  type="color"
                                  value={editColor}
                                  onChange={(e) => setEditColor(e.target.value)}
                                  className="sr-only"
                                />
                              </div>
                            ) : (
                              <span
                                className="inline-block w-6 h-6 rounded-md border shadow-sm"
                                style={{ backgroundColor: cat.color || '#3b82f6' }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit(cat)
                                    if (e.key === 'Escape') cancelEdit()
                                  }}
                                  className="h-8"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  {cat.name}
                                </span>
                                {!cat.is_active && (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    Inativa
                                  </Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Switch
                                checked={cat.is_active}
                                onCheckedChange={() => handleToggleActive(cat)}
                                title={cat.is_active ? 'Inativar' : 'Ativar'}
                              />
                              <span className="text-xs text-muted-foreground w-12 text-left">
                                {cat.is_active ? 'Ativa' : 'Inativa'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleSaveEdit(cat)}
                                  disabled={saving}
                                  title="Salvar"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500"
                                  onClick={cancelEdit}
                                  disabled={saving}
                                  title="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => startEdit(cat)}
                                  title="Editar"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDelete(cat)}
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
