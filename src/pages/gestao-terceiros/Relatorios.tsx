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
import { Download, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Relatorios() {
  const { toast } = useToast()

  const exportDoc = (type: string) => {
    toast({ title: `Exportando ${type}...`, description: 'O download iniciará em breve.' })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Relatórios</h2>
          <p className="text-muted-foreground mt-1">Extraia dados analíticos e consolidados.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportDoc('Excel')}>
            <Download className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button onClick={() => exportDoc('PDF')}>
            <FileText className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <Input type="date" className="max-w-[200px]" />
        <Input type="date" className="max-w-[200px]" />
        <Button variant="secondary">Filtrar</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Planta</TableHead>
              <TableHead>Presenças</TableHead>
              <TableHead>Faltas</TableHead>
              <TableHead>Taxa de Presença</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">Funcionário Exemplo {i}</TableCell>
                <TableCell>Planta Central</TableCell>
                <TableCell>20</TableCell>
                <TableCell>2</TableCell>
                <TableCell className="text-green-600 font-medium">90.9%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
