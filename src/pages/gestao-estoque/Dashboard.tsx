import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/AppContext'
import { inventoryService } from '@/services/inventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

export default function DashboardEstoque() {
  const { activeClient } = useAppStore()
  const [requests, setRequests] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    if (activeClient) {
      inventoryService.getRequests(activeClient.id).then(setRequests)
      inventoryService.getProducts(activeClient.id).then(setProducts)
    }
  }, [activeClient])

  const lowStockProducts = products.filter((p) => p.current_stock <= p.minimum_stock)
  const deliveredRequests = requests.filter((r) => r.status === 'Entregue')

  const consumptionByAreaMap: Record<string, number> = {}
  deliveredRequests.forEach((req) => {
    const areaName = req.area?.name || 'Não Informado'
    consumptionByAreaMap[areaName] = (consumptionByAreaMap[areaName] || 0) + (req.total_items || 0)
  })

  const chartData = Object.keys(consumptionByAreaMap)
    .map((area) => ({
      area,
      total: consumptionByAreaMap[area],
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard de Estoque</h1>
        <p className="text-slate-500">Métricas e acompanhamento de consumo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total de Produtos</p>
              <h3 className="text-2xl font-bold">{products.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Estoque Baixo</p>
              <h3 className="text-2xl font-bold">{lowStockProducts.length}</h3>
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
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total de Itens Saídos</p>
              <h3 className="text-2xl font-bold">
                {deliveredRequests.reduce((acc, req) => acc + (req.total_items || 0), 0)}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Áreas por Consumo (Itens)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos com Estoque Crítico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-auto">
              {lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100"
                >
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-200" />
                    )}
                    <div>
                      <p className="font-medium text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-red-600 font-bold text-lg">{p.current_stock}</p>
                    <p className="text-xs text-slate-500">Mínimo: {p.minimum_stock}</p>
                  </div>
                </div>
              ))}
              {lowStockProducts.length === 0 && (
                <div className="text-center py-10 text-slate-500">
                  Nenhum produto com estoque crítico.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
