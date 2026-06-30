import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/AppContext'
import { inventoryService } from '@/services/inventory'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Package, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'

export default function MeusPedidos() {
  const { activeClient } = useAppStore()
  const { user } = useAuth()
  const { toast } = useToast()
  const [requests, setRequests] = useState<any[]>([])
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [requestToDelete, setRequestToDelete] = useState<any>(null)

  useEffect(() => {
    if (activeClient && user) {
      loadRequests()
    }
  }, [activeClient, user])

  const loadRequests = async () => {
    const all = await inventoryService.getRequests(activeClient.id)
    setRequests(all.filter((r: any) => r.requester_id === user?.id))
  }

  const handleDelete = async () => {
    if (!requestToDelete) return

    try {
      await inventoryService.deleteRequest(requestToDelete.id)
      setRequests((prev) => prev.filter((r) => r.id !== requestToDelete.id))
      toast({
        title: 'Sucesso',
        description: 'Pedido excluído com sucesso.',
      })
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o pedido. Verifique se o status já foi alterado.',
        variant: 'destructive',
      })
    } finally {
      setRequestToDelete(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800'
      case 'Aprovado':
        return 'bg-blue-100 text-blue-800'
      case 'Entregue':
        return 'bg-green-100 text-green-800'
      case 'Rejeitado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Meus Pedidos</h1>
        <p className="text-slate-500">Acompanhe o status das suas solicitações</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Planta / Área</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reserva SAP</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{format(new Date(req.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>
                    <div className="font-medium">{req.plant?.name}</div>
                    <div className="text-xs text-slate-500">{req.area?.name}</div>
                  </TableCell>
                  <TableCell>{req.total_items}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(req.status)} variant="outline">
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {req.sap_reservation_number || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="text-brand-vividBlue hover:underline text-sm"
                      >
                        Ver detalhes
                      </button>
                      {req.status === 'Pendente' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setRequestToDelete(req)}
                          title="Excluir pedido"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Você ainda não fez nenhum pedido.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedRequest} onOpenChange={(o) => !o && setSelectedRequest(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Detalhes do Pedido</SheetTitle>
          </SheetHeader>
          {selectedRequest && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Data da Solicitação</p>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.created_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Status</p>
                  <Badge className={getStatusColor(selectedRequest.status)} variant="outline">
                    {selectedRequest.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-slate-500">Reserva SAP</p>
                  <p className="font-medium">{selectedRequest.sap_reservation_number || '-'}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 border-b pb-2">Itens Solicitados</h3>
                <div className="space-y-3">
                  {selectedRequest.items?.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-slate-50 p-3 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="font-medium text-sm">{item.product?.name}</p>
                          <p className="text-xs text-slate-500">
                            Qtd: {item.quantity} {item.product?.unit_of_measure}
                            {item.product?.item_value != null && (
                              <> · {formatCurrency(item.product.item_value)}</>
                            )}
                          </p>
                        </div>
                      </div>
                      {item.product?.item_value != null && (
                        <span className="text-sm font-semibold text-slate-700">
                          {formatCurrency(item.product.item_value * item.quantity)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {selectedRequest.items?.some((item: any) => item.product?.item_value != null) && (
                  <div className="flex justify-between items-center mt-4 pt-3 border-t">
                    <span className="font-semibold text-slate-700">Total do Pedido</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(
                        selectedRequest.items.reduce(
                          (acc: number, item: any) =>
                            acc + (item.product?.item_value ?? 0) * item.quantity,
                          0,
                        ),
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!requestToDelete}
        onOpenChange={(open) => !open && setRequestToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pedido</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
