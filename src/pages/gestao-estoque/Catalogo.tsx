import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/AppContext'
import { inventoryService } from '@/services/inventory'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ShoppingCart,
  Search,
  FileText,
  Plus,
  Minus,
  PackageOpen,
  ExternalLink,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

export default function Catalogo() {
  const { activeClient } = useAppStore()
  const { user } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Produtos de Limpeza e Higiene')

  const [cart, setCart] = useState<{ product: any; quantity: number }[]>([])
  const [selectedPlant, setSelectedPlant] = useState('')
  const [selectedArea, setSelectedArea] = useState('')
  const [responsibleName, setResponsibleName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => {
    if (activeClient) {
      loadData()
    }
  }, [activeClient])

  useEffect(() => {
    if (selectedPlant) {
      inventoryService.getAreas(selectedPlant).then((res) => {
        const uniqueAreas = Array.from(new Map(res.map((a: any) => [a.id, a])).values())
        setAreas(uniqueAreas)
      })
    } else {
      setAreas([])
    }
    setSelectedArea('')
  }, [selectedPlant])

  const loadData = async () => {
    try {
      const prods = await inventoryService.getProducts(activeClient.id)
      setProducts(prods)
      const pts = await inventoryService.getPlants(activeClient.id)
      const uniquePlants = Array.from(new Map(pts.map((p: any) => [p.id, p])).values())
      setPlants(uniquePlants)
    } catch (err) {
      toast.error('Erro ao carregar catálogo')
    }
  }

  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({})

  const getQuantity = (id: string) => selectedQuantities[id] || 1

  const updateSelectedQuantity = (id: string, delta: number) => {
    setSelectedQuantities((prev) => {
      const current = prev[id] || 1
      const next = Math.max(1, current + delta)
      return { ...prev, [id]: next }
    })
  }

  const addToCart = (product: any, qty: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)

      if (existing) {
        return prev
          .map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + qty } : item,
          )
          .filter((item) => item.quantity > 0)
      }
      return qty > 0 ? [...prev, { product, quantity: qty }] : prev
    })
    setSelectedQuantities((prev) => ({ ...prev, [product.id]: 1 }))
    toast.success('Adicionado ao carrinho')
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQ = Math.max(0, item.quantity + delta)
            return { ...item, quantity: newQ }
          }
          return item
        })
        .filter((item) => item.quantity > 0),
    )
  }

  const [assigneeId, setAssigneeId] = useState('')
  const [assignees, setAssignees] = useState<any[]>([])

  useEffect(() => {
    if (!selectedPlant || !activeClient?.id) {
      setAssignees([])
      setAssigneeId('')
      return
    }

    const fetchAssignees = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, authorized_plants')
        .eq('client_id', activeClient.id)

      if (data) {
        const authorized = data.filter((p) => {
          if (!p.authorized_plants || !Array.isArray(p.authorized_plants)) return false
          return p.authorized_plants.includes(selectedPlant)
        })
        setAssignees(authorized)
      }
    }

    fetchAssignees()
  }, [selectedPlant, activeClient?.id])

  const submitRequest = async () => {
    if (!selectedPlant || !selectedArea) {
      toast.error('Selecione a planta e a área')
      return
    }
    if (!responsibleName.trim()) {
      toast.error('Informe o nome do responsável pelo material')
      return
    }
    if (!assigneeId) {
      toast.error('Selecione o responsável pelo processamento')
      return
    }
    if (cart.length === 0) return

    setIsSubmitting(true)
    try {
      const requestData = {
        client_id: activeClient.id,
        plant_id: selectedPlant,
        requester_id: user?.id,
        area_id: selectedArea,
        status: 'Pendente',
        total_items: cart.reduce((acc, item) => acc + item.quantity, 0),
        processed_by: assigneeId,
        responsible_name: responsibleName.trim(),
      }
      const itemsData = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }))

      await inventoryService.submitRequest(requestData, itemsData)
      toast.success('Pedido enviado com sucesso!')
      setCart([])
      setCartOpen(false)
      setSelectedPlant('')
      setSelectedArea('')
      setResponsibleName('')
      setAssigneeId('')
    } catch (err) {
      toast.error('Erro ao enviar pedido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean)),
  ) as string[]

  const tabCategories = [
    'Produtos de Limpeza e Higiene',
    ...categories.filter((c) => c !== 'Produtos de Limpeza e Higiene'),
  ]

  const filtered = products.filter((p) => {
    const mSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const mCat = p.category === activeCategory
    return mSearch && mCat
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catálogo de Produtos</h1>
          <p className="text-slate-500">Solicite materiais e itens de estoque</p>
        </div>

        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetTrigger asChild>
            <Button className="relative">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Carrinho
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col h-full w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Meu Pedido</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-auto py-4 px-1 flex flex-col gap-6">
              <div className="space-y-4 pb-6 border-b border-slate-200">
                <div className="space-y-2">
                  <Label>Planta / Local *</Label>
                  <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a planta" />
                    </SelectTrigger>
                    <SelectContent>
                      {plants.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Área / Departamento *</Label>
                  <Select
                    value={selectedArea}
                    onValueChange={setSelectedArea}
                    disabled={!selectedPlant}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a área" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Responsável pelo Material *</Label>
                  <Input
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                    placeholder="Nome do responsável"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Responsável pelo Processamento *
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    disabled={!selectedPlant}
                  >
                    <option value="">
                      {selectedPlant ? 'Selecione o responsável...' : 'Selecione a planta primeiro'}
                    </option>
                    {assignees.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="text-center text-slate-500 py-10">Seu carrinho está vazio</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-slate-800 text-sm">Itens do Pedido</h3>
                    <Button
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2 text-xs"
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja esvaziar o carrinho?')) {
                          setCart([])
                        }
                      }}
                    >
                      Esvaziar carrinho
                    </Button>
                  </div>
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.product.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(item.product.item_value)}{' '}
                          {item.product.unit_of_measure ? `/ ${item.product.unit_of_measure}` : ''}
                        </p>
                        <p className="text-xs font-medium text-slate-700 mt-0.5">
                          Subtotal: {formatCurrency((item.product.item_value ?? 0) * item.quantity)}
                        </p>
                      </div>{' '}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => updateQuantity(item.product.id, -1)}
                        >
                          {' '}
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <SheetFooter className="mt-auto pt-4 border-t border-slate-200 gap-3">
              {cart.length > 0 && (
                <div className="flex justify-between items-center w-full px-1 pb-2">
                  <span className="text-sm font-medium text-slate-600">Total do Pedido</span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(
                      cart.reduce(
                        (acc, item) => acc + (item.product.item_value ?? 0) * item.quantity,
                        0,
                      ),
                    )}
                  </span>
                </div>
              )}
              <Button
                disabled={
                  cart.length === 0 ||
                  !selectedPlant ||
                  !selectedArea ||
                  !responsibleName.trim() ||
                  isSubmitting
                }
                onClick={submitRequest}
                className="w-full"
              >
                {isSubmitting ? 'Enviando...' : 'Confirmar Pedido'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar produtos..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto p-1 gap-1 bg-slate-100">
          {tabCategories.map((cat) => (
            <TabsTrigger
              key={cat}
              value={cat}
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-600 rounded-md"
            >
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabCategories.map((cat) => {
          const tabFiltered = products.filter((p) => {
            const mSearch = p.name.toLowerCase().includes(search.toLowerCase())
            const mCat = p.category === cat
            return mSearch && mCat
          })
          return (
            <TabsContent key={cat} value={cat} className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {tabFiltered.map((product) => (
                  <Card
                    key={product.id}
                    className="overflow-hidden flex flex-col hover:border-brand-vividBlue transition-colors"
                  >
                    <div className="aspect-square bg-slate-100 relative">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <PackageOpen className="w-16 h-16" />
                        </div>
                      )}
                    </div>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base leading-tight">{product.name}</CardTitle>
                          {product.sds_url && product.sds_url.trim() !== '' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50 flex-shrink-0"
                                  asChild
                                >
                                  <a href={product.sds_url} target="_blank" rel="noreferrer">
                                    <FileText className="w-4 h-4" />
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver FDS/SDS</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{product.category}</p>
                        {product.fs_code && (
                          <p className="text-xs text-slate-400 mt-0.5">FS: {product.fs_code}</p>
                        )}
                        {product.supply_code && (
                          <p className="text-xs text-slate-400">Supply: {product.supply_code}</p>
                        )}
                        {product.unit_of_measure && (
                          <p className="text-xs text-slate-400">Un: {product.unit_of_measure}</p>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex-1">
                      <p className="text-sm text-slate-600 line-clamp-2 mt-2">
                        {product.description}
                      </p>
                      <p className="text-base font-semibold text-slate-800 mt-2">
                        {product.item_value != null
                          ? formatCurrency(product.item_value)
                          : 'Valor não informado'}
                      </p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                      <div className="flex items-center justify-between w-full border border-slate-200 rounded-md p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateSelectedQuantity(product.id, -1)}
                          disabled={getQuantity(product.id) <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          value={getQuantity(product.id)}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1
                            setSelectedQuantities((prev) => ({
                              ...prev,
                              [product.id]: Math.max(1, val),
                            }))
                          }}
                          className="h-8 w-16 text-center text-sm p-0 mx-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateSelectedQuantity(product.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button
                        onClick={() => addToCart(product, getQuantity(product.id))}
                        className="w-full"
                        variant="outline"
                      >
                        Adicionar
                      </Button>
                      {product.sds_url && product.sds_url.trim() !== '' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'w-full text-blue-700 border-blue-200 bg-blue-50/50',
                            'hover:bg-blue-100 hover:text-blue-800 hover:border-blue-300',
                            'transition-colors duration-200',
                          )}
                          asChild
                        >
                          <a href={product.sds_url} target="_blank" rel="noreferrer">
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            Ver FDS
                            <ExternalLink className="w-3 h-3 ml-1.5 text-blue-400" />
                          </a>
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
                {tabFiltered.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-500">
                    Nenhum produto disponível nesta categoria.
                  </div>
                )}
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
