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
import { Download, FileText, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useMasterData } from '@/hooks/use-master-data'
import { exportToCSV } from '@/lib/export'
import { format, subDays } from 'date-fns'
import { supabase } from '@/lib/supabase/client'

export default function Relatorios() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reportType, setReportType] = useState('colaboradores')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { employees, equipment, plants } = useMasterData()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('*')
        .gte('date', dateFrom)
        .lte('date', dateTo)

      const safeLogs = logs || []

      if (reportType === 'colaboradores') {
        const mapped = employees
          .map((e) => {
            const empLogs = safeLogs.filter((l) => l.reference_id === e.id && l.type === 'staff')
            const presencas = empLogs.filter((l) => l.status).length
            const faltas = empLogs.length - presencas
            const taxa =
              empLogs.length > 0 ? ((presencas / empLogs.length) * 100).toFixed(1) + '%' : '0%'
            return {
              Nome: e.name,
              Planta: plants.find((p) => p.id === e.plant_id)?.name || 'N/A',
              Empresa: e.company_name,
              Lançamentos: empLogs.length,
              Presenças: presencas,
              Faltas: faltas,
              Taxa: taxa,
            }
          })
          .filter((m) => m.Lançamentos > 0)
        setData(mapped)
      } else if (reportType === 'equipamentos') {
        const mapped = equipment
          .map((e) => {
            const eqLogs = safeLogs.filter((l) => l.reference_id === e.id && l.type === 'equipment')
            const presencas = eqLogs.filter((l) => l.status).length
            const taxa =
              eqLogs.length > 0 ? ((presencas / eqLogs.length) * 100).toFixed(1) + '%' : '0%'
            return {
              Equipamento: e.name,
              Planta: plants.find((p) => p.id === e.plant_id)?.name || 'N/A',
              Tipo: e.type,
              Lançamentos: eqLogs.length,
              Disponível: presencas,
              Indisponível: eqLogs.length - presencas,
              Taxa_Disponibilidade: taxa,
            }
          })
          .filter((m) => m.Lançamentos > 0)
        setData(mapped)
      } else {
        setData([])
      }
      setLoading(false)
    }

    if (plants.length > 0) {
      fetchData()
    }
  }, [dateFrom, dateTo, reportType, employees, equipment, plants])

  const handleExportCSV = () => {
    if (data.length > 0) {
      exportToCSV(`relatorio_${reportType}_${dateFrom}_${dateTo}.csv`, data)
      toast({ title: 'Exportado com sucesso' })
    }
  }

  const columns = data.length > 0 ? Object.keys(data[0]) : []

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Relatórios Analíticos
          </h2>
          <p className="text-muted-foreground mt-1">Extraia dados consolidados da operação.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={data.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button onClick={handleExportCSV} disabled={data.length === 0}>
            <FileText className="h-4 w-4 mr-2" /> PDF / CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Tipo de Relatório</label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="colaboradores">Por Colaborador</SelectItem>
              <SelectItem value="equipamentos">Por Equipamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">De</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Até</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col}>{col.replace(/_/g, ' ')}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={Math.max(columns.length, 1)} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-blue" />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={Math.max(columns.length, 1)}
                  className="text-center py-8 text-muted-foreground"
                >
                  Sem dados para exibir no período selecionado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell
                      key={col}
                      className={col.includes('Taxa') ? 'text-green-600 font-medium' : ''}
                    >
                      {row[col]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
