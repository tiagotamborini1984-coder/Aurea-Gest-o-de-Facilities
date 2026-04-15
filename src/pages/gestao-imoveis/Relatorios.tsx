import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format, parseISO, endOfMonth } from 'date-fns'
import { FileText, Download, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function RelatoriosImoveis() {
  const { activeClient } = useAppStore()

  const [reservations, setReservations] = useState<any[]>([])
  const [costCenters, setCostCenters] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [cities, setCities] = useState<string[]>([])

  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all')
  const [selectedCity, setSelectedCity] = useState<string>('all')
  const [selectedProperty, setSelectedProperty] = useState<string>('all')

  useEffect(() => {
    if (activeClient) {
      loadFilters()
    }
  }, [activeClient])

  useEffect(() => {
    if (activeClient) {
      loadData()
    }
  }, [activeClient, selectedMonth, selectedCostCenter, selectedCity, selectedProperty])

  async function loadFilters() {
    if (!activeClient) return

    const [ccRes, propRes] = await Promise.all([
      supabase
        .from('property_cost_centers')
        .select('*')
        .eq('client_id', activeClient.id)
        .order('name'),
      supabase.from('properties').select('*').eq('client_id', activeClient.id).order('name'),
    ])

    if (ccRes.data) setCostCenters(ccRes.data)
    if (propRes.data) {
      setProperties(propRes.data)
      const uniqueCities = Array.from(
        new Set(propRes.data.map((p: any) => p.city).filter(Boolean)),
      ) as string[]
      setCities(uniqueCities.sort())
    }
  }

  async function loadData() {
    let query = supabase
      .from('property_reservations')
      .select(
        '*, properties!inner(id, name, city), property_rooms(name), property_guests!inner(id, name, cost_center_id, property_cost_centers(name))',
      )
      .eq('client_id', activeClient?.id)
      .order('check_in_date', { ascending: false })

    if (selectedMonth) {
      const start = `${selectedMonth}-01`
      const endDate = endOfMonth(parseISO(start))
      const end = format(endDate, 'yyyy-MM-dd')

      query = query.gte('check_in_date', start)
      query = query.lte('check_in_date', end)
    }

    if (selectedProperty !== 'all') {
      query = query.eq('property_id', selectedProperty)
    }

    if (selectedCity !== 'all') {
      query = query.eq('properties.city', selectedCity)
    }

    if (selectedCostCenter !== 'all') {
      if (selectedCostCenter === 'none') {
        query = query.is('property_guests.cost_center_id', null)
      } else {
        query = query.eq('property_guests.cost_center_id', selectedCostCenter)
      }
    }

    const { data } = await query
    if (data) setReservations(data)
  }

  const totalAmount = useMemo(() => {
    return reservations.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0)
  }, [reservations])

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800">
          <FileText className="h-8 w-8 text-primary" /> Relatório Financeiro
        </h1>
        <Button variant="outline" className="shadow-sm">
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Mês de Entrada</Label>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Cidade</Label>
          <Select
            value={selectedCity}
            onValueChange={(val) => {
              setSelectedCity(val)
              setSelectedProperty('all')
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas as cidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cidades</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Imóvel</Label>
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os imóveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os imóveis</SelectItem>
              {properties
                .filter((p) => selectedCity === 'all' || p.city === selectedCity)
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Centro de Custo</Label>
          <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os centros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os centros</SelectItem>
              <SelectItem value="none">Geral / Sem centro</SelectItem>
              {costCenters.map((cc) => (
                <SelectItem key={cc.id} value={cc.id}>
                  {cc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary-foreground/20 rounded-full">
                <DollarSign className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-foreground/80">
                  Valor Total Filtrado
                </p>
                <h3 className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    totalAmount,
                  )}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-0 ring-1 ring-slate-200">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg text-slate-700">Histórico de Reservas e Ocupação</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="font-semibold">Imóvel</TableHead>
                  <TableHead className="font-semibold">Quarto</TableHead>
                  <TableHead className="font-semibold">Hóspede</TableHead>
                  <TableHead className="font-semibold">Centro de Custo</TableHead>
                  <TableHead className="font-semibold">Período</TableHead>
                  <TableHead className="text-right font-semibold">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-medium text-slate-800">
                      {r.properties?.name}
                      <div className="text-xs text-slate-500 font-normal">{r.properties?.city}</div>
                    </TableCell>
                    <TableCell className="text-slate-600">{r.property_rooms?.name}</TableCell>
                    <TableCell className="text-slate-600">{r.property_guests?.name}</TableCell>
                    <TableCell>
                      <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded-md text-xs">
                        {r.property_guests?.property_cost_centers?.name || 'Geral'}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {format(new Date(r.check_in_date), 'dd/MM/yy')} até{' '}
                      {format(new Date(r.check_out_date), 'dd/MM/yy')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      R${' '}
                      {Number(r.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
                {reservations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      Nenhuma reserva encontrada no período selecionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
