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
import { Plus, Edit2, Trash2, Tag, Search } from 'lucide-react'
import { toast } from 'sonner'
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

export default function Produtos() {
  const { activeClient, profile } = useAppStore()
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
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
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const clientId = activeClient?.id || profile?.client_id

  useEffect(() => {
    if (clientId) {
      loadProducts()
      loadCategories()
    }
  }, [clientId])

  const loadProducts = () => {
    if (!clientId) return
    inventoryService.getProducts(clientId).then(setProducts)
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
        item_value: selectedProduct.item_value || 0,
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

  const handleSave = async () => {
    if (!clientId) {
      return toast.error('Erro: Cliente não identificado no perfil')
    }
    if (!formData.name.trim()) return toast.error('Nome é obrigatório')
    if (formData.item_value < 0) return toast.error('Valor do item não pode ser negativo')

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
        ...formData,
        image_url: imageUrl,
        sds_url: sdsUrl,
      }

      if (editingId) {
        productPayload.id = editingId
      }

      await inventoryService.saveProduct(productPayload)
      toast.success('Produto salvo com sucesso')
      setFormModalOpen(false)
      loadProducts()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar produto')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      try {
        await inventoryService.deleteProduct(id)
        toast.success('Excluído com sucesso')
        loadProducts()
      } catch (err: any) {
        toast.error(err.message || 'Erro ao excluir')
      }
    }
  }

  const filteredProducts = products.filter((p) => {
    const mCategory = categoryFilter === 'all' || normalizeMatch(p.category, categoryFilter)
    if (!search.trim()) return mCategory
    return (
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

      <div className="flex flex-col sm:flex-row gap-3 w-full">
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
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-slate-100" />
                      )}
                      <div>
                        <p className="font-medium">{p.name}</p>
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
                      </div>{' '}
                    </div>
                  </TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      p.item_value || 0,
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openForm(p)}>
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
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
                type="number"
                step="0.01"
                min="0"
                value={formData.item_value}
                onChange={(e) => setFormData({ ...formData, item_value: Number(e.target.value) })}
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
    </div>
  )
}
