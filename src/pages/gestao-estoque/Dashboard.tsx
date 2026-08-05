import { useState, useEffect, useMemo, useCallback } from 'react'
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
  ClipboardList,
} from 'lucide-react'
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { PlantRankingCard } from '@/components/gestao-estoque/PlantRankingCard'
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
import { formatCurrency, cn } from '@/lib/utils'
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
  const [plantsLoading, setPlantsLoading] = useState(false)
  const [plantsError, setPlantsError] = useState<string | null>(null)
  const [requestsRanking, setRequestsRanking] = useState<any[]>([])
  const [requestsRankingLoading, setRequestsRankingLoading] = useState(false)
  const [requestsRankingError, setRequestsRankingError] = useState<string | null>(null)
  const [valueRanking, setValueRanking] = useState<any[]>([])
  const [valueRankingLoading, setValueRankingLoading] = useState(false)
  const [valueRankingError, setValueRankingError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })
  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [excludedCategories, setExcludedCategories] = useState<string[]>([])
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set())

  const loadData = async () => {
    if (!activeClient) return
    setLoading(true)
    setError(null)
    try {
      const [reqs, prods, cats] = await Promise.all([
        inventoryService.getRequests(activeClient.id),
        inventoryService.getProducts(activeClient.id, false),
        inventoryService.getCategories(activeClient.id),
      ])
      setRequests(reqs)
      setProducts(prods)
      setCategories(cats)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do dashboard')
      toast.error('Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadPlantValues = async () => {
    if (!activeClient) return
    setPlantsLoading(true)
    setPlantsError(null)
    try {
      const pv = await inventoryService.getPlantInventoryValue(activeClient.id)
      setPlantsValue(pv)
    } catch (err: any) {
      setPlantsError(err.message || 'Erro ao carregar valores por planta')
    } finally {
      setPlantsLoading(false)
    }
  }

  const loadRequestsRanking = async () => {
    if (!activeClient) return
    setRequestsRankingLoading(true)
    setRequestsRankingError(null)
    try {
      const data = await inventoryService.getRequestCountByPlant(activeClient.id)
      setRequestsRanking(data)
    } catch (err: any) {
      setRequestsRankingError(err.message || 'Erro ao carregar ranking de pedidos')
    } finally {
      setRequestsRankingLoading(false)
    }
  }

  const loadValueRanking = async () => {
    if (!activeClient) return
    setValueRankingLoading(true)
    setValueRankingError(null)
    try {
      const data = await inventoryService.getRequestValueByPlant(activeClient.id)
      setValueRanking(data)
    } catch (err: any) {
      setValueRankingError(err.message || 'Erro ao carregar ranking de valores')
    } finally {
      setValueRankingLoading(false)
    }
  }

  useEffect(() => {
    if (activeClient) {
      loadData()
      loadPlantValues()
      loadRequestsRanking()
      loadValueRanking()
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

  const visibleCategoryBreakdown = useMemo(
    () => categoryBreakdown.filter((c) => !excludedCategories.includes(c.category)),
    [categoryBreakdown, excludedCategories],
  )

  const toggleCategoryExclusion = (category: string) => {
    setExcludedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const visibleCategoryBreakdown = useMemo(
    () => categoryBreakdown.filter((c) => !excludedCategories.has(c.category)),
    [categoryBreakdown, excludedCategories],
  )

  const toggleCategoryExclusion = useCallback((category: string) => {
    setExcludedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }, [])

  const deliveredRequests = filteredRequests.filter((r) => r.status === 'Entregue')
  const pendingRequests = filteredRequests.filter((r) => r.status === 'Pendente')

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
        <CardContent>
          {categoryBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-slate-500">
              Nenhuma categoria encontrada.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {categoryBreakdown.map((cat) => {
                  const isExcluded = excludedCategories.has(cat.category)
                  return (
                    <button
                      key={cat.category}
                      onClick={() => toggleCategoryExclusion(cat.category)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all duration-200',
                        isExcluded
                          ? 'bg-slate-100 text-slate-400 border-slate-200 line-through hover:bg-slate-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
                      )}
                    >
                      {cat.category}
                      <span className="text-[10px] opacity-70">({cat.count})</span>
                    </button>
                  )
                })}
              </div>
              {excludedCategories.size > 0 && (
                <button
                  onClick={() => setExcludedCategories(new Set())}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline mb-3"
                >
                  Mostrar todas as categorias
                </button>
              )}
              <div className="h-[300px]">
                {visibleCategoryBreakdown.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    Todas as categorias foram excluídas. Clique em uma categoria acima para
                    reativá-la.
                  </div>
                ) : (
                  <ChartContainer
                    config={{ count: { label: 'Produtos', color: 'hsl(var(--primary))' } }}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={visibleCategoryBreakdown} margin={{ left: 20, right: 20 }}>
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
                          {visibleCategoryBreakdown.map((_, index) => (
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
              </div>
            </>
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
          {plantsLoading ? (
            <div className="flex items-center justify-center py-10 gap-3">
              <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
              <span className="text-sm text-slate-500">Carregando valores por planta...</span>
            </div>
          ) : plantsError ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="p-2 bg-red-100 text-red-600 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm text-red-600">{plantsError}</p>
              <Button onClick={loadPlantValues} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlantRankingCard
          title="Ranking de Pedidos por Planta"
          icon={<ClipboardList className="w-5 h-5 text-blue-600" />}
          accentColor="#3b82f6"
          data={requestsRanking.map((p) => ({ ...p, value: p.totalRequests }))}
          loading={requestsRankingLoading}
          error={requestsRankingError}
          onRetry={loadRequestsRanking}
          valueLabel="Pedidos"
          emptyMessage="Nenhuma planta com pedidos encontrada."
        />
        <PlantRankingCard
          title="Ranking de Valores por Planta"
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          accentColor="#10b981"
          data={valueRanking.map((p) => ({ ...p, value: p.totalValue }))}
          loading={valueRankingLoading}
          error={valueRankingError}
          onRetry={loadValueRanking}
          formatValue={formatCurrency}
          valueLabel="Valor Total"
          emptyMessage="Nenhuma planta com valores encontrada."
        />
      </div>
    </div>
  )
}
