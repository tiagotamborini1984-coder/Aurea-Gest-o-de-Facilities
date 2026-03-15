import { useState } from 'react'
import { Plus, MoreVertical, CheckCircle2, AlertCircle, XCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store/AppContext'
import { AddThirdPartyDialog } from '@/components/AddThirdPartyDialog'
import { useToast } from '@/hooks/use-toast'

export default function ThirdPartyManagement() {
  const { thirdParties } = useAppStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  const filteredData = thirdParties.filter(
    (tp) =>
      tp.name.toLowerCase().includes(searchTerm.toLowerCase()) || tp.cnpj.includes(searchTerm),
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Regularizado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {status}
          </Badge>
        )
      case 'Pendente':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Pendência de Doc
          </Badge>
        )
      case 'Inativo':
        return (
          <Badge
            variant="outline"
            className="text-red-600 border-red-200 bg-red-50 flex items-center gap-1"
          >
            <XCircle className="w-3 h-3" /> {status}
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleAction = (action: string) => {
    toast({ title: 'Ação solicitada', description: action })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F4C81]">Gestão de Terceiros</h2>
          <p className="text-muted-foreground mt-1">
            Diretório de empresas prestadoras de serviço e contratos.
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-[#2B95D6] hover:bg-[#2B95D6]/90 text-white shadow-sm hover:scale-[1.02] transition-transform"
        >
          <Plus className="mr-2 h-4 w-4" /> Adicionar Terceiro
        </Button>
      </div>

      <div className="flex items-center bg-white p-2 rounded-xl shadow-sm border">
        <Search className="w-5 h-5 text-muted-foreground ml-2" />
        <Input
          placeholder="Buscar por Razão Social ou CNPJ..."
          className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div
        className="rounded-xl border bg-white shadow-sm overflow-hidden animate-slide-up"
        style={{ animationDelay: '0.1s' }}
      >
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Razão Social</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Serviços</TableHead>
              <TableHead>Fim do Contrato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((tp) => (
              <TableRow key={tp.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium text-foreground">{tp.name}</TableCell>
                <TableCell className="text-muted-foreground">{tp.cnpj}</TableCell>
                <TableCell>{tp.services}</TableCell>
                <TableCell>{new Date(tp.contractEnd).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>{getStatusBadge(tp.status)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleAction('Visualizar Documentos')}>
                        Visualizar Documentos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction('Editar Contrato')}>
                        Editar Contrato
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction('Alterar Status')}>
                        Alterar Status
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredData.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Nenhum terceiro encontrado para a busca.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AddThirdPartyDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  )
}
