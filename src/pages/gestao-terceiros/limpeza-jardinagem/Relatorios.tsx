import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Download, Printer, Loader2 } from 'lucide-react'
import { useMasterData } from '@/hooks/use-master-data'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { format, subDays } from 'date-fns'
import { exportToCSV } from '@/lib/export'
import { Badge } from '@/components/ui/badge'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'

export default function RelatoriosLJ() {
  const { profile } = useAppStore()
  const { plants } = useMasterData()
  const hasAccess = useHasAccess('Limpeza e Jardinagem')
  const [plantId, setPlantId] = useState('all')
  const [serviceType, setServiceType] = useState('all')
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return
      setLoading(true)
      let q = supabase
        .from('cleaning_gardening_schedules')
        .select('*, areas:area_id(name, type)')
        .eq('client_id', profile.client_id)
        .gte('activity_date', dateFrom)
        .lte('activity_date', dateTo)
        .order('activity_date', { ascending: false })
        .order('start_time', { ascending: true })

      if (plantId !== 'all') q = q.eq('plant_id', plantId)
      const res = await q

      let filtered = res.data || []
      if (serviceType !== 'all') filtered = filtered.filter((s) => s.areas?.type === serviceType)

      setData(filtered)
      setLoading(false)
    }
    fetchData()
  }, [profile, plantId, serviceType, dateFrom, dateTo])

  const handleExport = () => {
    if (data.length === 0) return
    const exportData = data.map((s) => ({
      Data: s.activity_date.split('-').reverse().join('/'),
      Hora: s.start_time.substring(0, 5),
      Planta: plants.find((p) => p.id === s.plant_id)?.name || '-',
      Área: s.areas?.name,
      Serviço: s.areas?.type === 'cleaning' ? 'Limpeza' : 'Jardinagem',
      Atividade: s.description,
      Status: s.status,
      Justificativa: s.justification || '',
    }))
    exportToCSV(`Relatorio_Limpeza_Jardinagem_${format(new Date(), 'yyyyMMdd')}.csv`, exportData)
  }

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-fade-in print:max-w-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Relatório de Atividades
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Extrato detalhado de agendamentos e execuções.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.print()}
            disabled={data.length === 0}
            className="border-gray-300"
          >
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
          <Button variant="tech" onClick={handleExport} disabled={data.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Exportar Excel
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm print:hidden">
        <div className="space-y-1.5">
          <Label className="text-xs">De</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-36"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Até</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-36"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Planta</Label>
          <Select value={plantId} onValueChange={setPlantId}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Plantas</SelectItem>
              {plants.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Serviço</Label>
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cleaning">Limpeza</SelectItem>
              <SelectItem value="gardening">Jardinagem</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <Table className="print:text-xs">
          <TableHeader className="bg-slate-50 border-b border-gray-200 print:bg-transparent">
            <TableRow>
              <TableHead className="font-semibold text-slate-800 print:text-black">
                Data/Hora
              </TableHead>
              <TableHead className="font-semibold text-slate-800 print:text-black">
                Planta/Área
              </TableHead>
              <TableHead className="font-semibold text-slate-800 print:text-black">
                Serviço
              </TableHead>
              <TableHead className="font-semibold text-slate-800 print:text-black">
                Atividade
              </TableHead>
              <TableHead className="font-semibold text-slate-800 print:text-black">
                Status
              </TableHead>
              <TableHead className="font-semibold text-slate-800 print:text-black">
                Justificativa
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-deepBlue" />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Sem dados para exibir.
                </TableCell>
              </TableRow>
            ) : (
              data.map((s) => (
                <TableRow key={s.id} className="hover:bg-slate-50 border-gray-100 print:border-b">
                  <TableCell className="font-medium whitespace-nowrap">
                    {s.activity_date.split('-').reverse().join('/')}{' '}
                    <span className="text-slate-500 font-normal ml-1">
                      {s.start_time.substring(0, 5)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-800">{s.areas?.name}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {plants.find((p) => p.id === s.plant_id)?.code || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {s.areas?.type === 'cleaning' ? 'Limpeza' : 'Jardinagem'}
                  </TableCell>
                  <TableCell
                    className="text-slate-700 max-w-[250px] truncate"
                    title={s.description}
                  >
                    {s.description}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        s.status === 'Realizado'
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : s.status === 'Não Realizado'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200 print:border-black print:text-black'
                      }
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="text-xs text-slate-500 max-w-[200px] truncate"
                    title={s.justification}
                  >
                    {s.justification || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
