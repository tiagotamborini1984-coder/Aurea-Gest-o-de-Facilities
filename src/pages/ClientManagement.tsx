import { useState } from 'react'
import { Plus, MoreVertical, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/store/AppContext'
import { AddClientDialog } from '@/components/AddClientDialog'
import { useToast } from '@/hooks/use-toast'

export default function ClientManagement() {
  const { clients } = useAppStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  const handleAction = (action: string, clientName: string) => {
    toast({
      title: `Ação: ${action}`,
      description: `Aplicado em: ${clientName}`,
    })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F4C81]">Gestão de Clientes</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie as empresas locatárias e seus módulos.
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-[#2B95D6] hover:bg-[#2B95D6]/90 text-white shadow-sm hover:scale-[1.02] transition-transform"
        >
          <Plus className="mr-2 h-4 w-4" /> Cadastrar Empresa
        </Button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden animate-slide-up">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[250px]">Empresa</TableHead>
              <TableHead>URL Customizada</TableHead>
              <TableHead>Administrador</TableHead>
              <TableHead>Módulos Ativos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium text-foreground">{client.name}</TableCell>
                <TableCell className="text-muted-foreground flex items-center gap-1 group cursor-pointer">
                  {client.url}{' '}
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </TableCell>
                <TableCell>{client.adminName}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {client.modules.map((mod) => (
                      <Badge
                        key={mod}
                        variant="secondary"
                        className="bg-blue-50 text-[#0F4C81] hover:bg-blue-100 text-[10px]"
                      >
                        {mod}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={client.status === 'Ativo' ? 'default' : 'outline'}
                    className={
                      client.status === 'Ativo'
                        ? 'bg-green-100 text-green-800 hover:bg-green-200 border-none'
                        : 'text-muted-foreground'
                    }
                  >
                    {client.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleAction('Editar Perfil', client.name)}>
                        Editar Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAction('Gerenciar Módulos', client.name)}
                      >
                        Gerenciar Módulos
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleAction('Desativar Conta', client.name)}
                      >
                        Desativar Conta
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhuma empresa cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AddClientDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  )
}
