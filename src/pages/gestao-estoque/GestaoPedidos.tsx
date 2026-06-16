import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/AppContext'
import { inventoryService } from '@/services/inventory'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Package } from 'lucide-react'

export default function GestaoPedidos() {
  const { activeClient } = useAppStore()
  const { user } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [processModalOpen, setProcessModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [sapNumber, setSapNumber] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (activeClient) {
      loadRequests()
    }
  }, [activeClient])

  const loadRequests = () => {
    inventoryService.getRequests(activeClient.id).then(setRequests)
  }

  const handleProcess = async (status: string) => {
    if (status === 'Entregue' && !sapNumber) {
      toast.error('Número de Reserva SAP é obrigatório para entrega')
      return
    }

    setIsProcessing(true)
    try {
      await inventoryService.updateRequestStatus(selectedRequest.id, status, sapNumber, user?.id)
      toast.success('Pedido atualizado com sucesso')
      setProcessModalOpen(false)
      loadRequests()
    } catch (err) {
      toast.error('Erro ao atualizar pedido')
    } finally {
      setIsProcessing(false)
    }
  }

  const openProcessModal = (req: any) => {
    setSelectedRequest(req)
    setSapNumber(req.sap_reservation_number || '')
    setProcessModalOpen(true)
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
        <h1 className="text-2xl font-bold text-slate-800">Gestão de Pedidos</h1>
        <p className="text-slate-500">Aprove solicitações e processe saídas de estoque (SAP)</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Planta / Área</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SAP</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{format(new Date(req.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell className="font-medium">{req.requester?.name}</TableCell>
                  <TableCell>
                    <div>{req.plant?.name}</div>
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
                    <Button variant="outline" size="sm" onClick={() => openProcessModal(req)}>
                      Analisar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Nenhum pedido encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={processModalOpen} onOpenChange={setProcessModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Processar Pedido</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="space-y-2 max-h-[200px] overflow-auto">
                <h4 className="text-sm font-semibold">Itens:</h4>
                {selectedRequest.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded">
                    <Package className="w-4 h-4 text-slate-400" />
                    <span className="flex-1">{item.product?.name}</span>
                    <span className="font-medium">
                      {item.quantity} {item.product?.unit_of_measure}
                    </span>
                  </div>
                ))}
              </div>

              {selectedRequest.status !== 'Entregue' && selectedRequest.status !== 'Rejeitado' && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Nº Reserva SAP (Obrigatório para Entrega)</Label>
                  <Input
                    placeholder="Digite o número SAP"
                    value={sapNumber}
                    onChange={(e) => setSapNumber(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            {selectedRequest?.status === 'Pendente' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleProcess('Rejeitado')}
                  disabled={isProcessing}
                >
                  Rejeitar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleProcess('Aprovado')}
                  disabled={isProcessing}
                >
                  Aprovar
                </Button>
              </>
            )}
            {(selectedRequest?.status === 'Pendente' || selectedRequest?.status === 'Aprovado') && (
              <Button
                onClick={() => handleProcess('Entregue')}
                disabled={isProcessing || !sapNumber}
              >
                Dar Baixa (Entregar)
              </Button>
            )}
            {selectedRequest?.status === 'Entregue' && (
              <div className="w-full text-center text-green-600 text-sm font-medium p-2 bg-green-50 rounded">
                Pedido Finalizado
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
