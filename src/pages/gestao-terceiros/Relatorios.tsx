import { useState } from 'react'
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
import { Download, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useMasterData } from '@/hooks/use-master-data'
import { exportToCSV } from '@/lib/export'
import { format, subDays } from 'date-fns'

export default function Relatorios() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reportType, setReportType] = useState('colaboradores')
  const { toast } = useToast()
  const { employees, plants } = useMasterData()

  const generateMockData = () => {
    if (reportType === 'colaboradores') {
      return employees
        .map((e) => ({
          Nome: e.name,
          Planta: plants.find((p) => p.id === e.plant_id)?.name || 'N/A',
          Empresa: e.company_name,
          Presencas: Math.floor(Math.random() * 25) + 5,
          Faltas: Math.floor(Math.random() * 5),
        }))
        .map((d) => ({
          ...d,
          Taxa: ((d.Presencas / (d.Presencas + d.Faltas)) * 100).toFixed(1) + '%',
        }))
    }
    return []
  }

  const handleExportCSV = () => {
    const data = generateMockData()
    if (data.length > 0) {
      exportToCSV(`relatorio_${reportType}_${dateFrom}_${dateTo}.csv`, data)
      toast({ title: 'Exportado com sucesso' })
    }
  }

  const data = generateMockData()

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
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button onClick={() => toast({ title: 'Gerando PDF...' })}>
            <FileText className="h-4 w-4 mr-2" /> PDF
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
              <SelectItem value="locais">Por Local</SelectItem>
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
              <TableHead>Colaborador</TableHead>
              <TableHead>Planta</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Presenças (Simulado)</TableHead>
              <TableHead>Taxa de Presença</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Sem dados para exibir.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.Nome}</TableCell>
                  <TableCell>{row.Planta}</TableCell>
                  <TableCell>{row.Empresa}</TableCell>
                  <TableCell>{row.Presencas}</TableCell>
                  <TableCell className="text-green-600 font-medium">{row.Taxa}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
