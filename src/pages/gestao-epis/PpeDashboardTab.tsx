import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { Package, TrendingUp, AlertTriangle, HandCoins, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { ppeService } from '@/services/ppe'
import { toast } from 'sonner'

interface PpeDashboardTabProps {
  startDate: string
  endDate: string
  plantId: string
}

export function PpeDashboardTab({ startDate, endDate, plantId }: PpeDashboardTabProps) {
  const { activeClient, profile } = useAppStore()
  const [items, setItems] = useState<any[]>([])
  const [loans, setLoans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const clientId = activeClient?.id || profile?.client_id

  useEffect(() => {
    if (!clientId) {
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([
      ppeService.getItems(clientId, plantId),
      ppeService.getLoanTrends(clientId, startDate, endDate, plantId),
    ])
      .then(([itemsData, loansData]) => {
        setItems(itemsData)
        setLoans(loansData)
      })
      .catch(() => {
        toast.error('Erro ao carregar dados do dashboard')
      })
      .finally(() => setLoading(false))
  }, [clientId, startDate, endDate, profile, plantId])

  const stats = useMemo(() => {
    const totalItems = items.length
    const totalStock = items.reduce((s, i) => s + (i.current_stock || 0), 0)
    const totalQuantity = items.reduce((s, i) => s + (i.total_quantity || 0), 0)
    const activeLoans = loans.filter((l) => l.status === 'Emprestado').length
    const lowStock = items
      .filter((i) => i.current_stock <= Math.max(5, (i.total_quantity || 0) * 0.2))
      .sort((a, b) => (a.current_stock || 0) - (b.current_stock || 0))
    return { totalItems, totalStock, totalQuantity, activeLoans, lowStock }
  }, [items, loans])

  const chartData = useMemo(() => {
    const grouped: Record<string, { date: string; count: number; quantity: number }> = {}
    loans.forEach((loan) => {
      const d = new Date(loan.loan_date)
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      if (!grouped[key]) grouped[key] = { date: key, count: 0, quantity: 0 }
      grouped[key].count++
      grouped[key].quantity += loan.quantity || 0
    })
    return Object.values(grouped)
  }, [loans])

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total de EPIs</p>
              <h3 className="text-2xl font-bold">{stats.totalItems}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Estoque Atual</p>
              <h3 className="text-2xl font-bold">{stats.totalStock}</h3>
              <p className="text-xs text-slate-400">de {stats.totalQuantity} total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
              <HandCoins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Empréstimos Ativos</p>
              <h3 className="text-2xl font-bold">{stats.activeLoans}</h3>
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
              <h3 className="text-2xl font-bold">{stats.lowStock.length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Empréstimos no Período</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                {plantId !== 'all'
                  ? 'Nenhum empréstimo encontrado para esta unidade no período'
                  : 'Nenhum empréstimo no período selecionado'}
              </div>
            ) : (
              <ChartContainer
                config={{ count: { label: 'Empréstimos' } }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Itens com Estoque Baixo</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.lowStock.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
                Nenhum item com estoque baixo
              </div>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-auto">
                {stats.lowStock.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{item.name}</p>
                      <p className="text-xs text-slate-400">
                        {item.plants?.name || '-'} • CA: {item.ca_number || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{item.current_stock}</p>
                      <p className="text-xs text-slate-400">de {item.total_quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
