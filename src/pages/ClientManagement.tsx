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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAppStore, Client } from '@/store/AppContext'
import { AddClientDialog } from '@/components/AddClientDialog'
import { EditClientDialog } from '@/components/EditClientDialog'
import { ManageModulesDialog } from '@/components/ManageModulesDialog'
import { useToast } from '@/hooks/use-toast'

export default function ClientManagement() {
  const { clients, deleteClient } = useAppStore()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [managingModulesClient, setManagingModulesClient] = useState<Client | null>(null)
  const [clientToDelete, setClientToDelete] = useState<string | null>(null)
  const { toast } = useToast()

  const handleDelete = () => {
    if (clientToDelete) {
      deleteClient(clientToDelete)
      toast({
        title: 'Empresa removida',
        description: 'Os dados do cliente foram apagados com sucesso.',
      })
      setClientToDelete(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-blue">Gestão de Clientes</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie as empresas locatárias e seus módulos.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="shadow-sm transition-transform">
          <Plus className="mr-2 h-4 w-4" /> Cadastrar Empresa
        </Button>
      </div>

      <div className="rounded-xl border border-brand-light bg-white shadow-sm overflow-hidden animate-slide-up">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[300px]">Empresa</TableHead>
              <TableHead>URL de Acesso</TableHead>
              <TableHead>Administrador</TableHead>
              <TableHead>Módulos Ativos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-brand-light">
                      <AvatarImage src={client.logo} alt={client.name} />
                      <AvatarFallback className="bg-brand-blue/10 text-brand-blue text-xs font-semibold">
                        {client.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {client.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground flex items-center gap-1 group cursor-pointer max-w-[200px] truncate h-12">
                  <span className="truncate">{client.url}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </TableCell>
                <TableCell>{client.adminName}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {client.modules.map((mod) => (
                      <Badge
                        key={mod}
                        variant="secondary"
                        className="bg-brand-blue/5 text-brand-blue hover:bg-brand-blue/10 text-[10px]"
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
                      <DropdownMenuItem onClick={() => setEditingClient(client)}>
                        Editar Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setManagingModulesClient(client)}>
                        Gerenciar Módulos
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive cursor-pointer"
                        onClick={() => setClientToDelete(client.id)}
                      >
                        Excluir Empresa
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

      <AddClientDialog open={isAddOpen} onOpenChange={setIsAddOpen} />

      <EditClientDialog
        client={editingClient}
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
      />

      <ManageModulesDialog
        client={managingModulesClient}
        open={!!managingModulesClient}
        onOpenChange={(open) => !open && setManagingModulesClient(null)}
      />

      <AlertDialog
        open={!!clientToDelete}
        onOpenChange={(open) => !open && setClientToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta empresa permanentemente? Todos os acessos e
              registros associados a ela serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
