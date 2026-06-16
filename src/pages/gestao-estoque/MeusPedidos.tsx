import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/AppContext'
import { inventoryService } from '@/services/inventory'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Package } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export default function MeusPedidos() {
  const { activeClient } = useAppStore()
  const { user } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [selectedRequest, setSelectedRequest] = useState<any>(null)

  useEffect(() => {
    if (activeClient && user) {
      loadRequests()
    }
  }, [activeClient, user])

  const loadRequests = async () => {
    const all = await inventoryService.getRequests(activeClient.id)
    setRequests(all.filter((r: any) => r.requester_id === user?.id))
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
                <TableHead className="text-right">Ação</TableHead>
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
                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="text-brand-vividBlue hover:underline text-sm"
                    >
                      Ver detalhes
                    </button>
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
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
