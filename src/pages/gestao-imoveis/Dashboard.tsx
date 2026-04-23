import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import { Building, DollarSign, Users, Percent, CalendarIcon, MapPin, Home } from 'lucide-react'
import { format, differenceInDays, startOfMonth, endOfMonth, parseISO, max, min } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/AppContext'
import { GLOBAL_CHART_COLORS } from '@/lib/color-utils'

type DateRange = {
  from: Date | undefined
  to?: Date | undefined
}

export default function DashboardImoveis() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })

  const [selectedCity, setSelectedCity] = useState<string>('all')
  const [selectedProperty, setSelectedProperty] = useState<string>('all')

  const [properties, setProperties] = useState<any[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const { activeClient } = useAppStore()

  const [metrics, setMetrics] = useState({
    faturamento: 0,
    reservas: 0,
    ocupacao: 0,
    ticketMedio: 0,
  })

  const [chartData, setChartData] = useState<any[]>([])
  const [chartTitle, setChartTitle] = useState('Faturamento por Cidade')
  const [rankingCity, setRankingCity] = useState<any[]>([])
  const [rankingCostCenter, setRankingCostCenter] = useState<any[]>([])

  // Derived state for filters
  const cities = useMemo(() => {
    const uniqueCities = new Set(properties.map((p) => p.city).filter(Boolean))
    return Array.from(uniqueCities).sort()
  }, [properties])

  const filteredProperties = useMemo(() => {
    if (selectedCity === 'all') return properties
    return properties.filter((p) => p.city === selectedCity)
  }, [properties, selectedCity])

  useEffect(() => {
    if (activeClient) {
      loadBaseData()
    }
  }, [activeClient])

  useEffect(() => {
    if (dateRange.from && dateRange.to && activeClient) {
      loadReservations()
    }
  }, [dateRange, activeClient])

  useEffect(() => {
    calculateMetrics()
  }, [reservations, selectedCity, selectedProperty, properties, dateRange])

  async function loadBaseData() {
    if (!activeClient) return

    const { data: propsData } = await supabase
      .from('properties')
      .select('id, name, city, property_rooms(id)')
      .eq('client_id', activeClient.id)

    if (propsData) {
      setProperties(propsData)
    }
  }

  async function loadReservations() {
    if (!dateRange.from || !dateRange.to || !activeClient) return
    setLoading(true)

    const startDateStr = format(dateRange.from, 'yyyy-MM-dd')
    const endDateStr = format(dateRange.to, 'yyyy-MM-dd')

    const { data: resData } = await supabase
      .from('property_reservations')
      .select(`
        *,
        properties(id, city, name),
        property_guests(id, cost_center_id, property_cost_centers(id, name))
      `)
      .eq('client_id', activeClient.id)
      .lte('check_in_date', endDateStr)
      .gte('check_out_date', startDateStr)

    if (resData) {
      setReservations(resData)
    }
    setLoading(false)
  }

  function calculateMetrics() {
    if (!dateRange.from || !dateRange.to) return

    const periodStart = dateRange.from
    const periodEnd = dateRange.to
    const periodDays = Math.max(1, differenceInDays(periodEnd, periodStart) + 1)

    const validRooms = new Set(
      properties.flatMap((p) => p.property_rooms?.map((r: any) => r.id) || []),
    )

    // Apply filters to reservations and deduplicate
    const uniqueResIds = new Set()
    const filteredRes = reservations.filter((r) => {
      if (uniqueResIds.has(r.id)) return false

      if (r.status === 'Cancelada' || r.status === 'Pendente') return false
      if (!validRooms.has(r.room_id)) return false

      const resStart = parseISO(r.check_in_date)
      const resEnd = parseISO(r.check_out_date)
      const validStart = max([resStart, periodStart])
      const validEnd = min([resEnd, periodEnd])

      const occupiedNights = differenceInDays(validEnd, validStart)

      if (occupiedNights < 0) return false
      if (occupiedNights === 0 && r.check_in_date !== r.check_out_date) return false

      const propCity = Array.isArray(r.properties) ? r.properties[0]?.city : r.properties?.city
      const cityMatch = selectedCity === 'all' || propCity === selectedCity
      const propMatch = selectedProperty === 'all' || r.property_id === selectedProperty

      if (cityMatch && propMatch) {
        uniqueResIds.add(r.id)
        return true
      }
      return false
    })

    // Active rooms count based on filters for occupancy calculation
    const activeRoomsCount = properties
      .filter(
        (p) =>
          (selectedCity === 'all' || p.city === selectedCity) &&
          (selectedProperty === 'all' || p.id === selectedProperty),
      )
      .reduce((acc, p) => acc + (p.property_rooms?.length || 0), 0)

    const totalPossibleNights = Math.max(1, activeRoomsCount * periodDays)

    let totalFaturamento = 0
    let totalOccupiedNights = 0

    const cityStats: Record<
      string,
      { faturamento: number; occupiedNights: number; roomCount: number }
    > = {}
    const costCenterStats: Record<string, { occupiedNights: number; name: string }> = {}
    const chartStats: Record<string, number> = {}

    const isShowingProperties = selectedCity !== 'all'

    // Initialize city stats for correct denominator
    properties.forEach((p) => {
      if (
        (selectedCity === 'all' || p.city === selectedCity) &&
        (selectedProperty === 'all' || p.id === selectedProperty)
      ) {
        if (!cityStats[p.city]) {
          cityStats[p.city] = { faturamento: 0, occupiedNights: 0, roomCount: 0 }
        }
        cityStats[p.city].roomCount += p.property_rooms?.length || 0
      }
    })

    filteredRes.forEach((r) => {
      totalFaturamento += Number(r.total_amount || 0)

      // Calculate exact occupied days within the selected period
      const resStart = parseISO(r.check_in_date)
      const resEnd = parseISO(r.check_out_date)
      const validStart = max([resStart, periodStart])
      const validEnd = min([resEnd, periodEnd])

      const occupiedNights = Math.max(0, differenceInDays(validEnd, validStart))
      totalOccupiedNights += occupiedNights

      const propCity = Array.isArray(r.properties) ? r.properties[0]?.city : r.properties?.city
      const propName = Array.isArray(r.properties) ? r.properties[0]?.name : r.properties?.name
      const city = propCity || 'Outros'

      if (cityStats[city]) {
        cityStats[city].faturamento += Number(r.total_amount || 0)
        cityStats[city].occupiedNights += occupiedNights
      }

      const guestData = Array.isArray(r.property_guests) ? r.property_guests[0] : r.property_guests
      const costCenterId = guestData?.cost_center_id
      const ccData = Array.isArray(guestData?.property_cost_centers)
        ? guestData?.property_cost_centers[0]
        : guestData?.property_cost_centers
      const costCenterName = ccData?.name || 'Sem Centro de Custo'

      const ccKey = costCenterId || 'unassigned'
      if (!costCenterStats[ccKey]) {
        costCenterStats[ccKey] = { occupiedNights: 0, name: costCenterName }
      }
      costCenterStats[ccKey].occupiedNights += occupiedNights

      // Dynamic Chart Stats
      const chartKey = isShowingProperties ? propName || 'Desconhecido' : city
      chartStats[chartKey] = (chartStats[chartKey] || 0) + Number(r.total_amount || 0)
    })

    // Set Main Metrics
    setMetrics({
      faturamento: totalFaturamento,
      reservas: filteredRes.length,
      ocupacao: Math.min(100, Math.round((totalOccupiedNights / totalPossibleNights) * 100)),
      ticketMedio: filteredRes.length > 0 ? totalFaturamento / filteredRes.length : 0,
    })

    // Process Chart Data
    const chart = Object.entries(chartStats)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)

    setChartData(chart)
    setChartTitle(isShowingProperties ? 'Faturamento por Imóvel' : 'Faturamento por Cidade')

    // Process Ranking Cidade
    const rankCity = Object.entries(cityStats)
      .map(([city, stats]) => {
        const possibleNights = Math.max(1, stats.roomCount * periodDays)
        const rate = Math.min(100, Math.round((stats.occupiedNights / possibleNights) * 100))
        return { name: city, rate }
      })
      .filter((item) => item.rate > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5) // Top 5
    setRankingCity(rankCity)

    // Process Ranking Centro de Custo
    const rankCC = Object.values(costCenterStats)
      .map((stats) => {
        const rate = Math.min(100, Math.round((stats.occupiedNights / totalPossibleNights) * 100))
        return { name: stats.name, rate, nights: stats.occupiedNights }
      })
      .filter((item) => item.rate > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5) // Top 5
    setRankingCostCenter(rankCC)
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard de Imóveis</h1>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[260px] justify-start text-left font-normal bg-background',
                  !dateRange.from && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                    </>
                  ) : (
                    format(dateRange.from, 'dd/MM/yyyy')
                  )
                ) : (
                  <span>Selecione o período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => {
                  if (range) setDateRange(range)
                }}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Select
            value={selectedCity}
            onValueChange={(val) => {
              setSelectedCity(val)
              setSelectedProperty('all') // Reset property when city changes
            }}
          >
            <SelectTrigger className="w-[180px] bg-background">
              <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Todas as Cidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Cidades</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[200px] bg-background">
              <Home className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Todos os Imóveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Imóveis</SelectItem>
              {filteredProperties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {metrics.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reservas (Período)
            </CardTitle>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.reservas}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Médio
            </CardTitle>
            <Building className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {metrics.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Ocupação Global
            </CardTitle>
            <Percent className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.ocupacao}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Principal */}
        <Card className="lg:col-span-2 shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">{chartTitle}</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {chartData.length > 0 ? (
              <ChartContainer
                config={{ value: { label: 'Faturamento', color: 'hsl(var(--primary))' } }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 30, right: 20, left: 20, bottom: 20 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(val) => `R$ ${val.toLocaleString('pt-BR')}`}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                      <LabelList
                        dataKey="value"
                        position="top"
                        offset={10}
                        className="fill-foreground text-[11px] font-medium"
                        formatter={(val: number) =>
                          `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        }
                      />
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={GLOBAL_CHART_COLORS[index % GLOBAL_CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/50 rounded-lg border border-dashed">
                <Building className="w-10 h-10 mb-2 opacity-20" />
                <p>Sem dados financeiros para o período e filtros selecionados.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rankings */}
        <div className="space-y-6">
          <Card className="shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">
                Top Ocupação por Cidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rankingCity.length > 0 ? (
                rankingCity.map((item, idx) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: GLOBAL_CHART_COLORS[idx % GLOBAL_CHART_COLORS.length],
                          }}
                        />
                        {item.name}
                      </span>
                      <span className="text-muted-foreground font-semibold">{item.rate}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${item.rate}%`,
                          backgroundColor: GLOBAL_CHART_COLORS[idx % GLOBAL_CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-center text-muted-foreground py-4">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground">
                Top Ocupação por Centro de Custo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rankingCostCenter.length > 0 ? (
                rankingCostCenter.map((item, idx) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground flex items-center gap-2 truncate pr-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: GLOBAL_CHART_COLORS[idx % GLOBAL_CHART_COLORS.length],
                          }}
                        />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="text-muted-foreground font-semibold shrink-0">
                        {item.rate}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${item.rate}%`,
                          backgroundColor: GLOBAL_CHART_COLORS[idx % GLOBAL_CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-center text-muted-foreground py-4">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
