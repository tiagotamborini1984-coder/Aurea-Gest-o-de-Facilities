import { useState, useEffect, useMemo } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { FileSpreadsheet, Loader2, Printer } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useMasterData } from '@/hooks/use-master-data'
import { exportToCSV } from '@/lib/export'
import { format, subDays } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function Relatorios() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 14), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedPlants, setSelectedPlants] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('colaborador')
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const { toast } = useToast()
  const { plants, employees, locations, equipment, contracted } = useMasterData()

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .gte('date', dateFrom)
        .lte('date', dateTo)
      setLogs(data || [])
      setLoading(false)
    }
    if (plants.length > 0) fetchLogs()
  }, [dateFrom, dateTo, plants])

  const reportData = useMemo(() => {
    const validLogs = logs.filter(
      (l) => selectedPlants.length === 0 || selectedPlants.includes(l.plant_id),
    )
    const validDates = new Set(validLogs.map((l) => l.date))
    const validDays = Math.max(1, validDates.size)

    let result: any[] = []

    if (activeTab === 'colaborador') {
      const targets = employees.filter(
        (e) => selectedPlants.length === 0 || selectedPlants.includes(e.plant_id),
      )
      result = targets.map((emp) => {
        const eLogs = validLogs.filter((l) => l.type === 'staff' && l.reference_id === emp.id)
        const pres = eLogs.filter((l) => l.status).length
        const faltas = eLogs.filter((l) => !l.status).length
        const mPres = pres / validDays
        const mFaltas = faltas / validDays
        const cont = 1
        return {
          Entidade: emp.name,
          'Média Presenças': mPres,
          'Média Faltas': mFaltas,
          Contratado: cont,
          'Taxa Presença': (mPres / cont) * 100,
          Absenteísmo: (mFaltas / cont) * 100,
        }
      })
    } else if (activeTab === 'local') {
      const targets = locations.filter(
        (l) => selectedPlants.length === 0 || selectedPlants.includes(l.plant_id),
      )
      result = targets.map((loc) => {
        const empIds = employees.filter((e) => e.location_id === loc.id).map((e) => e.id)
        const eLogs = validLogs.filter((l) => l.type === 'staff' && empIds.includes(l.reference_id))
        const pres = eLogs.filter((l) => l.status).length
        const faltas = eLogs.filter((l) => !l.status).length
        const mPres = pres / validDays
        const mFaltas = faltas / validDays
        const cont = contracted
          .filter((c) => c.location_id === loc.id && c.type === 'colaborador')
          .reduce((a, b) => a + b.quantity, 0)
        return {
          Entidade: loc.name,
          'Média Presenças': mPres,
          'Média Faltas': mFaltas,
          Contratado: cont,
          'Taxa Presença': cont > 0 ? (mPres / cont) * 100 : 0,
          Absenteísmo: cont > 0 ? (mFaltas / cont) * 100 : 0,
        }
      })
    } else if (activeTab === 'planta') {
      const targets = plants.filter(
        (p) => selectedPlants.length === 0 || selectedPlants.includes(p.id),
      )
      result = targets.map((p) => {
        const eLogs = validLogs.filter((l) => l.type === 'staff' && l.plant_id === p.id)
        const pres = eLogs.filter((l) => l.status).length
        const faltas = eLogs.filter((l) => !l.status).length
        const mPres = pres / validDays
        const mFaltas = faltas / validDays
        const cont = contracted
          .filter((c) => c.plant_id === p.id && c.type === 'colaborador')
          .reduce((a, b) => a + b.quantity, 0)
        return {
          Entidade: p.name,
          'Média Presenças': mPres,
          'Média Faltas': mFaltas,
          Contratado: cont,
          'Taxa Presença': cont > 0 ? (mPres / cont) * 100 : 0,
          Absenteísmo: cont > 0 ? (mFaltas / cont) * 100 : 0,
        }
      })
    } else if (activeTab === 'equipamento') {
      const targets = equipment.filter(
        (e) => selectedPlants.length === 0 || selectedPlants.includes(e.plant_id),
      )
      result = targets.map((eq) => {
        const eLogs = validLogs.filter((l) => l.type === 'equipment' && l.reference_id === eq.id)
        const pres = eLogs.filter((l) => l.status).length
        const faltas = eLogs.filter((l) => !l.status).length
        const mPres = pres / validDays
        const mFaltas = faltas / validDays
        const cont =
          contracted
            .filter((c) => c.equipment_id === eq.id && c.type === 'equipamento')
            .reduce((a, b) => a + b.quantity, 0) || eq.quantity
        return {
          Entidade: eq.name,
          'Média Presenças': mPres,
          'Média Faltas': mFaltas,
          Contratado: cont,
          'Taxa Presença': cont > 0 ? (mPres / cont) * 100 : 0,
          Absenteísmo: cont > 0 ? (mFaltas / cont) * 100 : 0,
        }
      })
    }

    return result.filter(
      (r) => r['Média Presenças'] > 0 || r['Média Faltas'] > 0 || r.Contratado > 0,
    )
  }, [logs, selectedPlants, activeTab, employees, locations, plants, equipment, contracted])

  const handleExportCSV = () => {
    if (reportData.length > 0) {
      const exportData = reportData.map((row) => {
        const newRow: any = {}
        Object.keys(row).forEach((key) => {
          if (typeof row[key] === 'number' && key !== 'Contratado') {
            newRow[key] =
              row[key].toFixed(1) + (key.includes('Taxa') || key.includes('Absenteísmo') ? '%' : '')
          } else {
            newRow[key] = row[key]
          }
        })
        return newRow
      })
      exportToCSV(`Relatorio_${activeTab}_${dateFrom}_${dateTo}.csv`, exportData)
      toast({ title: 'Relatório exportado para Excel' })
    }
  }

  const handleExportPDF = () => {
    window.print()
  }

  const entityKey =
    activeTab === 'colaborador'
      ? 'Colaborador'
      : activeTab === 'local'
        ? 'Local'
        : activeTab === 'planta'
          ? 'Planta'
          : 'Equipamento'

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-fade-in print:max-w-none print:w-full">
      <div className="print:text-center print:mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Relatórios</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Presenças e faltas por colaborador, local e planta (
          {format(new Date(dateFrom), 'dd/MM/yyyy')} a {format(new Date(dateTo), 'dd/MM/yyyy')})
        </p>
      </div>

      <Card className="shadow-sm border-border overflow-hidden print:hidden">
        <CardContent className="p-6 space-y-6 bg-white">
          <div className="flex flex-wrap gap-6">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                De
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[160px] h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                Até
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[160px] h-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Filtrar por Planta (múltipla seleção)
            </Label>
            <div className="flex flex-wrap gap-5 p-4 bg-slate-50 rounded-xl border border-border">
              {plants.map((p) => (
                <div key={p.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`plant-${p.id}`}
                    checked={selectedPlants.includes(p.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedPlants([...selectedPlants, p.id])
                      else setSelectedPlants(selectedPlants.filter((id) => id !== p.id))
                    }}
                    className="w-5 h-5 rounded"
                  />
                  <Label htmlFor={`plant-${p.id}`} className="font-medium cursor-pointer text-sm">
                    {p.name}
                  </Label>
                </div>
              ))}
              {plants.length === 0 && (
                <span className="text-sm text-muted-foreground">Nenhuma planta cadastrada.</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="bg-white border border-border p-1 h-12 w-full sm:w-auto">
            <TabsTrigger value="colaborador" className="data-[state=active]:bg-slate-100">
              Por Colaborador
            </TabsTrigger>
            <TabsTrigger value="local" className="data-[state=active]:bg-slate-100">
              Por Local
            </TabsTrigger>
            <TabsTrigger value="planta" className="data-[state=active]:bg-slate-100">
              Por Planta
            </TabsTrigger>
            <TabsTrigger value="equipamento" className="data-[state=active]:bg-slate-100">
              Por Equipamento
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={reportData.length === 0}
            className="bg-white hover:bg-slate-50"
          >
            <Printer className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={reportData.length === 0}
            className="bg-white hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden print:border-none print:shadow-none">
        <Table className="print:border-collapse print:w-full">
          <TableHeader className="bg-slate-50/80 border-b border-border print:bg-transparent print:border-b-2 print:border-slate-800">
            <TableRow>
              <TableHead className="font-semibold text-slate-600 h-12 print:text-black print:p-2">
                {entityKey}
              </TableHead>
              <TableHead className="font-semibold text-slate-600 text-center print:text-black print:p-2">
                Média Presenças
              </TableHead>
              <TableHead className="font-semibold text-slate-600 text-center print:text-black print:p-2">
                Média Faltas
              </TableHead>
              <TableHead className="font-semibold text-slate-600 text-center print:text-black print:p-2">
                Contratado
              </TableHead>
              <TableHead className="font-semibold text-slate-600 text-center print:text-black print:p-2">
                Taxa Presença
              </TableHead>
              <TableHead className="font-semibold text-slate-600 text-center print:text-black print:p-2">
                Absenteísmo
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : reportData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Sem dados para exibir no período selecionado.
                </TableCell>
              </TableRow>
            ) : (
              reportData.map((row, i) => (
                <TableRow
                  key={i}
                  className="hover:bg-slate-50/50 print:border-b print:border-slate-200"
                >
                  <TableCell className="font-medium text-slate-700 print:text-black print:p-2 print:break-inside-avoid">
                    {row.Entidade}
                  </TableCell>
                  <TableCell className="text-center print:p-2 print:break-inside-avoid">
                    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-green-100 text-green-800 print:bg-transparent print:text-black">
                      {Number(row['Média Presenças']).toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center print:p-2 print:break-inside-avoid">
                    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-red-800 print:bg-transparent print:text-black">
                      {Number(row['Média Faltas']).toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-bold text-slate-700 print:text-black print:p-2 print:break-inside-avoid">
                    {row.Contratado}
                  </TableCell>
                  <TableCell className="text-center font-medium text-slate-700 print:text-black print:p-2 print:break-inside-avoid">
                    {Number(row['Taxa Presença']).toFixed(1)}%
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-center font-semibold print:text-black print:p-2 print:break-inside-avoid',
                      Number(row.Absenteísmo) > 0
                        ? 'text-red-600 print:text-black'
                        : 'text-slate-600 print:text-black',
                    )}
                  >
                    {Number(row.Absenteísmo).toFixed(1)}%
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
