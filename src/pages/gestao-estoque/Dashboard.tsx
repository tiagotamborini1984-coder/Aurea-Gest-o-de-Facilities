import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '@/store/AppContext'
import { inventoryService } from '@/services/inventory'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Filter,
  DollarSign,
  Layers,
  Loader2,
  AlertCircle,
  RefreshCw,
  ClipboardList,
} from 'lucide-react'
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
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export default function DashboardEstoque() {
  const { activeClient } = useAppStore()
  const [requests, setRequests] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
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

  const loadData = async () => {
    if (!activeClient) return
    setLoading(true)
    setError(null)
    try {
      const [reqs, prods] = await Promise.all([
        inventoryService.getRequests(activeClient.id),
        inventoryService.getProducts(activeClient.id, false),
      ])
      setRequests(reqs)
      setProducts(prods)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do dashboard')
      toast.error('Erro ao carregar dashboard')
    } finally {
      setLoading(false)
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
