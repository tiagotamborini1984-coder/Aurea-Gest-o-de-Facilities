import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export default function Auditoria() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Log de Auditoria</h2>
        <p className="text-muted-foreground mt-1">
          Rastreabilidade completa de ações no sistema (retenção de 2 meses).
        </p>
      </div>

      <Card className="overflow-hidden shadow-sm border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Data / Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4].map((i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground">
                  {new Date().toLocaleString('pt-BR')}
                </TableCell>
                <TableCell className="font-medium">admin@aurea.com</TableCell>
                <TableCell>
                  <Badge variant="outline">Edição de Lançamento</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[300px]">
                  Alterou presença do funcionário João Silva para TRUE
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
