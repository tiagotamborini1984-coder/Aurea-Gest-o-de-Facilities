import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '@/store/AppContext'
import { inventoryService } from '@/services/inventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Filter,
  DollarSign,
  Building2,
  Layers,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { addDays, isWithinInterval, parseISO } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1',
]

export default function DashboardEstoque() {
  const { activeClient } = useAppStore()
  const [requests, setRequests] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [plantsValue, setPlantsValue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })
  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [selectedArea, setSelectedArea] = useState<string>('all')

  const loadData = async () => {
    if (!activeClient) return
    setLoading(true)
    setError(null)
    try {
      const [reqs, prods, cats, pv] = await Promise.all([
        inventoryService.getRequests(activeClient.id),
        inventoryService.getProducts(activeClient.id, false),
        inventoryService.getCategories(activeClient.id),
        inventoryService.getPlantInventoryValue(activeClient.id),
      ])
      setRequests(reqs)
      setProducts(prods)
      setCategories(cats)
      setPlantsValue(pv)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do dashboard')
      toast.error('Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeClient) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [activeClient])

  const plantsList = useMemo(() => {
    const map = new Map()
    requests.forEach((r) => {
      if (r.plant?.id) map.set(r.plant.id, r.plant)
    })
    return Array.from(map.values())
  }, [requests])

  const areasList = useMemo(() => {
    const map = new Map()
    requests.forEach((r) => {
      if (r.area?.id && (selectedPlant === 'all' || r.plant?.id === selectedPlant)) {
        map.set(r.area.id, r.area)
      }
    })
    return Array.from(map.values())
  }, [requests, selectedPlant])

  useEffect(() => {
    setSelectedArea('all')
  }, [selectedPlant])

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchPlant = selectedPlant === 'all' || req.plant?.id === selectedPlant
      const matchArea = selectedArea === 'all' || req.area?.id === selectedArea

      let matchDate = true
      if (dateRange?.from && req.created_at) {
        const reqDate = parseISO(req.created_at)
        if (dateRange.to) {
          matchDate = isWithinInterval(reqDate, {
            start: dateRange.from,
            end: addDays(dateRange.to, 1),
          })
        } else {
          matchDate = reqDate >= dateRange.from
        }
      }

      return matchPlant && matchArea && matchDate
    })
  }, [requests, selectedPlant, selectedArea, dateRange])

  const activeProducts = useMemo(() => products.filter((p) => p.is_active !== false), [products])

  const totalCatalogValue = useMemo(
    () => activeProducts.reduce((sum, p) => sum + (p.item_value || 0), 0),
    [activeProducts],
  )

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    activeProducts.forEach((p) => {
      const cat = p.category?.trim() || 'Sem Categoria'
      map[cat] = (map[cat] || 0) + 1
    })
    return Object.keys(map)
      .map((category) => ({ category, count: map[category] }))
      .sort((a, b) => b.count - a.count)
  }, [activeProducts])

  const deliveredRequests = filteredRequests.filter((r) => r.status === 'Entregue')
  const pendingRequests = filteredRequests.filter((r) => r.status === 'Pendente')

  const consumptionByAreaMap: Record<string, number> = {}
  deliveredRequests.forEach((req) => {
    const areaName = req.area?.name || 'Não Informado'
    consumptionByAreaMap[areaName] = (consumptionByAreaMap[areaName] || 0) + (req.total_items || 0)
  })

  const chartData = Object.keys(consumptionByAreaMap)
    .map((area) => ({ area, total: consumptionByAreaMap[area] }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  const topValueProducts = useMemo(
    () =>
      [...activeProducts]
        .filter((p) => p.item_value != null && p.item_value > 0)
        .sort((a, b) => (b.item_value || 0) - (a.item_value || 0))
        .slice(0, 8),
    [activeProducts],
  )

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard de Estoque</h1>
          <p className="text-slate-500">Métricas e acompanhamento de consumo</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-500">Carregando dados do dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard de Estoque</h1>
          <p className="text-slate-500">Métricas e acompanhamento de consumo</p>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="p-3 bg-red-100 text-red-600 rounded-full">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Erro ao carregar dashboard</h3>
                <p className="text-sm text-slate-500 mt-1">{error}</p>
              </div>
              <Button onClick={loadData} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard de Estoque</h1>
        <p className="text-slate-500">Métricas e acompanhamento de consumo</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filtros:</span>
          </div>
          <Select value={selectedPlant} onValueChange={setSelectedPlant}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="Todas as Plantas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Plantas</SelectItem>
              {plantsList.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedArea}
            onValueChange={setSelectedArea}
            disabled={selectedPlant === 'all' && areasList.length === 0}
          >
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="Todas as Áreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Áreas</SelectItem>
              {areasList.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Produtos Ativos</p>
              <h3 className="text-2xl font-bold">{activeProducts.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Categorias</p>
              <h3 className="text-2xl font-bold">{categoryBreakdown.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Valor do Catálogo</p>
              <h3 className="text-xl font-bold">{formatCurrency(totalCatalogValue)}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pedidos Entregues</p>
              <h3 className="text-2xl font-bold">{deliveredRequests.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pedidos Pendentes</p>
              <h3 className="text-2xl font-bold">{pendingRequests.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Itens Consumidos</p>
              <h3 className="text-2xl font-bold">
                {deliveredRequests.reduce((acc, req) => acc + (req.total_items || 0), 0)}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-cyan-100 text-cyan-600 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total de Pedidos</p>
              <h3 className="text-2xl font-bold">{filteredRequests.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Produtos por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {categoryBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              Nenhuma categoria encontrada.
            </div>
          ) : (
            <ChartContainer
              config={{ count: { label: 'Produtos', color: 'hsl(var(--primary))' } }}
              className="h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBreakdown} margin={{ left: 20, right: 20 }}>
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {categoryBreakdown.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Valor Consumido por Planta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[350px] overflow-auto">
            {plantsValue.length === 0 && (
              <div className="text-center py-10 text-slate-500">
                Nenhuma planta cadastrada para este cliente.
              </div>
            )}
            {plantsValue.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.code ? `${p.code}` : ''}
                      {p.city ? `${p.code ? ' · ' : ''}${p.city}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-700">
                    {formatCurrency(p.totalValue || 0)}
                  </p>
                  <p className="text-xs text-slate-500">Valor Entregue</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Áreas por Consumo (Itens)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                Nenhum pedido entregue no período selecionado.
              </div>
            ) : (
              <ChartContainer
                config={{ total: { label: 'Itens Consumidos', color: 'hsl(var(--primary))' } }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" />
                    <YAxis dataKey="area" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="var(--color-total)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos com Maior Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-auto">
              {topValueProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center">
                        <Package className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.category || 'Sem categoria'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-700 font-bold text-lg">
                      {formatCurrency(p.item_value || 0)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.unit_of_measure ? `/ ${p.unit_of_measure}` : ''}
                    </p>
                  </div>
                </div>
              ))}
              {topValueProducts.length === 0 && (
                <div className="text-center py-10 text-slate-500">
                  Nenhum produto com valor cadastrado.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
