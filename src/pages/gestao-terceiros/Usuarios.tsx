import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'

export default function Usuarios() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestão de Usuários</h2>
          <p className="text-muted-foreground mt-1">
            Controle de acessos e permissões por planta e menu.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Nível de Acesso</TableHead>
              <TableHead>Plantas Autorizadas</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Master Admin</TableCell>
              <TableCell>admin@aurea.com</TableCell>
              <TableCell>
                <Badge className="bg-brand-blue">Master</Badge>
              </TableCell>
              <TableCell>Todas</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
