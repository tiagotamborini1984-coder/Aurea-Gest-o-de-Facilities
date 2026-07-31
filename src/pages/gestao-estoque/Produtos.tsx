import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/AppContext'
import { inventoryService } from '@/services/inventory'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Edit2, Archive, Tag, Search, History, Power } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { normalizeIncludes, normalizeMatch } from '@/lib/string-utils'
import { CategoryManagerDialog } from '@/components/gestao-estoque/CategoryManagerDialog'
import { cn } from '@/lib/utils'

export default function Produtos() {
  const { activeClient, profile } = useAppStore()
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all')
  const [reactivateTarget, setReactivateTarget] = useState<string | null>(null)

  const [formData, setFormData] = useState<{
    name: string
    category: string
    description: string
    unit_of_measure: string
    fs_code: string
    supply_code: string
    item_value: string | number
  }>({
    name: '',
    category: '',
    description: '',
    unit_of_measure: 'UN',
    fs_code: '',
    supply_code: '',
    item_value: 0,
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [sdsFile, setSdsFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null)

  const clientId = activeClient?.id || profile?.client_id
  const editingProduct = editingId ? products.find((p) => p.id === editingId) : null
  const isEditingInactive = editingProduct?.is_active === false

  useEffect(() => {
    if (clientId) {
      loadProducts()
      loadCategories()
    }
  }, [clientId, statusFilter])

  const loadProducts = () => {
    if (!clientId) return
    inventoryService.getProducts(clientId, true).then(setProducts)
  }

  const loadCategories = () => {
    if (!clientId) return
    inventoryService.getCategories(clientId).then(setCategories)
  }

  const openForm = (selectedProduct?: any) => {
    if (selectedProduct?.id) {
      setEditingId(selectedProduct.id)
      setFormData({
        name: selectedProduct.name || '',
        category: selectedProduct.category || '',
        description: selectedProduct.description || '',
        unit_of_measure: selectedProduct.unit_of_measure || 'UN',
        fs_code: selectedProduct.fs_code || '',
        supply_code: selectedProduct.supply_code || '',
        item_value: selectedProduct.item_value ?? 0,
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        category: '',
        description: '',
        unit_of_measure: 'UN',
        fs_code: '',
        supply_code: '',
        item_value: 0,
      })
    }
    setImageFile(null)
    setSdsFile(null)
    setFormModalOpen(true)
  }

  const parseNumericValue = (value: string | number): number => {
    if (typeof value === 'number') return value
    if (!value) return 0
    const normalized = String(value).replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(normalized)
    return isNaN(parsed) ? 0 : parsed
  }

  const handleSave = async () => {
    if (!clientId) {
      return toast.error('Erro: Cliente não identificado no perfil')
    }
    if (!formData.name.trim()) return toast.error('Nome é obrigatório')

    const parsedItemValue = parseNumericValue(formData.item_value)
    if (parsedItemValue < 0) return toast.error('Valor do item não pode ser negativo')

    const trimmedFs = formData.fs_code?.trim().toLowerCase()
    if (trimmedFs) {
      const existingWithFs = products.find(
        (p) =>
          p.id !== editingId &&
          p.is_active !== false &&
          p.fs_code?.trim().toLowerCase() === trimmedFs,
      )
      if (existingWithFs) {
        return toast.error('Já existe um produto ativo com este Código FS. Use um código único.')
      }
    }

    const trimmedSupply = formData.supply_code?.trim().toLowerCase()
    if (trimmedSupply) {
      const existingWithSupply = products.find(
        (p) =>
          p.id !== editingId &&
          p.is_active !== false &&
          p.supply_code?.trim().toLowerCase() === trimmedSupply,
      )
      if (existingWithSupply) {
        return toast.error(
          'Já existe um produto ativo com este Código Supply. Use um código único.',
        )
      }
    }

    setIsSaving(true)
    try {
      let imageUrl = editingId ? products.find((p) => p.id === editingId)?.image_url : null
      let sdsUrl = editingId ? products.find((p) => p.id === editingId)?.sds_url : null

      if (imageFile) {
        imageUrl = await inventoryService.uploadFile(
          'product-images',
          imageFile,
          `${clientId}/${Date.now()}-${imageFile.name}`,
        )
      }
      if (sdsFile) {
        sdsUrl = await inventoryService.uploadFile(
          'product-documents',
          sdsFile,
          `${clientId}/${Date.now()}-${sdsFile.name}`,
        )
      }

      const productPayload: any = {
        client_id: clientId,
        name: formData.name.trim(),
        category: formData.category || null,
        description: formData.description || null,
        unit_of_measure: formData.unit_of_measure || 'UN',
        fs_code: formData.fs_code?.trim() || null,
        supply_code: formData.supply_code?.trim() || null,
        item_value: parsedItemValue,
        image_url: imageUrl,
        sds_url: sdsUrl,
      }

      if (editingId) {
        productPayload.id = editingId
      }

      await inventoryService.saveProduct(productPayload)
      toast.success(editingId ? 'Produto atualizado com sucesso' : 'Produto criado com sucesso')
      setFormModalOpen(false)
      loadProducts()
    } catch (err: any) {
      const message = err?.message || err?.error || 'Erro ao salvar produto'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    try {
      await inventoryService.archiveProduct(archiveTarget)
      toast.success('Produto arquivado com sucesso')
      setArchiveTarget(null)
      loadProducts()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao arquivar produto')
      setArchiveTarget(null)
    }
  }

  const handleReactivate = async () => {
    if (!reactivateTarget) return
    setIsReactivating(true)
    try {
      await inventoryService.reactivateProduct(reactivateTarget)
      toast.success('Produto reativado com sucesso')
      setReactivateTarget(null)
      if (formModalOpen && editingId === reactivateTarget) {
        setFormModalOpen(false)
      }
      loadProducts()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reativar produto')
      setReactivateTarget(null)
    } finally {
      setIsReactivating(false)
    }
  }

  const filteredProducts = products.filter((p) => {
    const mStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.is_active !== false) ||
      (statusFilter === 'inactive' && p.is_active === false)
    const mCategory = categoryFilter === 'all' || normalizeMatch(p.category, categoryFilter)
    if (!search.trim()) return mStatus && mCategory
    return (
      mStatus &&
      mCategory &&
      (normalizeIncludes(p.name, search) ||
        normalizeIncludes(p.supply_code, search) ||
        normalizeIncludes(p.fs_code, search) ||
        normalizeIncludes(p.category, search))
    )
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cadastro de Produtos</h1>
          <p className="text-slate-500">Gerencie os itens do estoque</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/gestao-estoque/historico-importacoes">
              <History className="w-4 h-4 mr-2" />
              Histórico de Importações
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setCategoryModalOpen(true)}>
            <Tag className="w-4 h-4 mr-2" />
            Gerenciar Categorias
          </Button>
          <Button onClick={() => openForm()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full items-start sm:items-center">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="active">Ativos</TabsTrigger>
            <TabsTrigger value="inactive">Inativos</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, código FS, código Supply ou categoria..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrar por categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Códigos</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor Unit.</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => (
                <TableRow
                  key={p.id}
                  className={cn(p.is_active === false && 'opacity-60 bg-slate-50')}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-slate-100" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{p.name}</p>
                          {p.is_active === false && (
                            <Badge variant="secondary" className="text-xs">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{p.unit_of_measure}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-slate-500 space-y-1">
                      <div>
                        <span className="font-medium">FS:</span> {p.fs_code || '-'}
                      </div>
                      <div>
                        <span className="font-medium">Supply:</span> {p.supply_code || '-'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(p.item_value || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openForm(p)}>
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </Button>
                    {p.is_active === false ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setReactivateTarget(p.id)}
                        title="Reativar"
                      >
                        <Power className="w-4 h-4 text-green-600" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => setArchiveTarget(p.id)}>
                        <Archive className="w-4 h-4 text-amber-600" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    {search.trim()
                      ? 'Nenhum produto encontrado para a busca.'
                      : 'Nenhum produto cadastrado.'}
                  </TableCell>
                </TableRow>
              )}
              {filteredProducts.length > 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-right text-xs text-slate-400 py-2">
                    {filteredProducts.length} produto(s) listado(s)
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? 'Editar Produto' : 'Novo Produto'}
              {isEditingInactive && (
                <Badge variant="secondary" className="text-xs">
                  Inativo
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label>Nome do Produto</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Código FS</Label>
              <Input
                value={formData.fs_code}
                onChange={(e) => setFormData({ ...formData, fs_code: e.target.value })}
                placeholder="Ex: FS-1001"
              />
            </div>
            <div className="space-y-2">
              <Label>Código Supply</Label>
              <Input
                value={formData.supply_code}
                onChange={(e) => setFormData({ ...formData, supply_code: e.target.value })}
                placeholder="Ex: SUP-2002"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor do item (R$)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={formData.item_value}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '')
                  setFormData({ ...formData, item_value: val as any })
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade de Medida</Label>
              <Input
                value={formData.unit_of_measure}
                onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Imagem do Produto (Opcional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label>FDS / Ficha Técnica (PDF)</Label>
              <Input
                type="file"
                accept=".pdf"
                onChange={(e) => setSdsFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormModalOpen(false)}>
              Cancelar
            </Button>
            {isEditingInactive && (
              <Button
                variant="outline"
                onClick={() => setReactivateTarget(editingId)}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                <Power className="w-4 h-4 mr-2" />
                Reativar
              </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CategoryManagerDialog
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        clientId={clientId}
        onCategoriesChanged={loadCategories}
      />

      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Este produto possui histórico de movimentações. Ele será removido da lista ativa, mas
              os dados históricos serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!reactivateTarget}
        onOpenChange={(open) => !open && setReactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reativar Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja reativar este produto? Ele voltará a aparecer na lista de
              produtos ativos e estará disponível para novas solicitações e importações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate} disabled={isReactivating}>
              {isReactivating ? 'Reativando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
