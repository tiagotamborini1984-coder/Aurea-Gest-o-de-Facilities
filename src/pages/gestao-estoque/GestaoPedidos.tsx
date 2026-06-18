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
import { Package, Filter, Trash } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function GestaoPedidos() {
  const { activeClient } = useAppStore()
  const { user } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [processModalOpen, setProcessModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [sapNumber, setSapNumber] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [reservedQuantities, setReservedQuantities] = useState<Record<string, number>>({})
  const [statusFilter, setStatusFilter] = useState('Pendente')
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setUserRole(data.role?.toLowerCase() || null)
        })
    }
  }, [user])

  const isAdmin = userRole === 'admin'

  useEffect(() => {
    if (activeClient) {
      loadRequests()
    }
  }, [activeClient])

  const loadRequests = () => {
    inventoryService.getRequests(activeClient.id).then(setRequests)
  }

  const handleDelete = async () => {
    if (!deleteRequestId) return
    setIsDeleting(true)
    try {
      await inventoryService.deleteRequest(deleteRequestId)
      toast.success('Pedido excluído com sucesso!')
      loadRequests()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir pedido')
    } finally {
      setIsDeleting(false)
      setDeleteRequestId(null)
    }
  }

  const handleProcess = async (status: string) => {
    setIsProcessing(true)
    try {
      const itemsToUpdate = selectedRequest.items?.map((item: any) => ({
        id: item.id,
        reserved_quantity: reservedQuantities[item.id] || 0,
      }))

      await inventoryService.updateRequestStatus(
        selectedRequest.id,
        status,
        sapNumber,
        user?.id,
        status === 'Aprovado' ? itemsToUpdate : undefined,
      )
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

    const initialReserved: Record<string, number> = {}
    req.items?.forEach((item: any) => {
      initialReserved[item.id] = item.reserved_quantity ?? item.quantity
    })
    setReservedQuantities(initialReserved)

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Pedidos</h1>
          <p className="text-slate-500">Aprove solicitações e processe saídas de estoque (SAP)</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-white">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os Status</SelectItem>
            <SelectItem value="Pendente">Pendentes</SelectItem>
            <SelectItem value="Aprovado">Aprovados</SelectItem>
            <SelectItem value="Entregue">Entregues</SelectItem>
            <SelectItem value="Rejeitado">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Planta / Área</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SAP</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests
                .filter((req) => statusFilter === 'Todos' || req.status === statusFilter)
                .map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{format(new Date(req.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell className="font-medium">
                      {req.requester?.name || 'Não informado'}
                    </TableCell>
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
                      <div className="flex justify-end items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openProcessModal(req)}>
                          Analisar
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteRequestId(req.id)}
                            title="Excluir"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              {requests.filter((req) => statusFilter === 'Todos' || req.status === statusFilter)
                .length === 0 && (
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

      <AlertDialog
        open={!!deleteRequestId}
        onOpenChange={(open) => !open && setDeleteRequestId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pedido</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={processModalOpen} onOpenChange={setProcessModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Processar Pedido</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-3 rounded-md border grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Responsável</p>
                  <p className="text-sm font-medium text-slate-800">
                    {selectedRequest.requester?.name || 'Não informado'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Processado por</p>
                  <p className="text-sm font-medium text-slate-800">
                    {selectedRequest.processed_by_profile?.name || 'Não atribuído'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Planta / Área</p>
                  <p className="text-sm font-medium text-slate-800">
                    {selectedRequest.plant?.name}{' '}
                    {selectedRequest.area ? `- ${selectedRequest.area.name}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Data do Pedido</p>
                  <p className="text-sm font-medium text-slate-800">
                    {format(new Date(selectedRequest.created_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="w-32 text-center">Qtd Solicitada</TableHead>
                      <TableHead className="w-32 text-center">Qtd Reservada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRequest.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-slate-400" />
                            <span>{item.product?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm text-center">
                          {item.quantity} {item.product?.unit_of_measure}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            className="h-8 text-center"
                            value={reservedQuantities[item.id] ?? ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value)
                              if (!isNaN(val) && val >= 0) {
                                setReservedQuantities((prev) => ({ ...prev, [item.id]: val }))
                              } else if (e.target.value === '') {
                                setReservedQuantities((prev) => ({ ...prev, [item.id]: 0 }))
                              }
                            }}
                            disabled={selectedRequest.status !== 'Pendente'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedRequest.status === 'Pendente' && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Nº Reserva SAP (Opcional)</Label>
                  <Input
                    placeholder="Digite o número SAP"
                    value={sapNumber}
                    onChange={(e) => setSapNumber(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Opcional: Informe se desejar atrelar esta saída a uma reserva no SAP.
                  </p>
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
                  variant="default"
                  className="text-[#FFFFFF]"
                  onClick={() => handleProcess('Aprovado')}
                  disabled={isProcessing}
                >
                  Aprovar
                </Button>
              </>
            )}
            {selectedRequest?.status === 'Aprovado' && (
              <div className="w-full text-center text-green-600 text-sm font-medium p-2 bg-green-50 rounded border border-green-200">
                Pedido Aprovado
              </div>
            )}
            {selectedRequest?.status === 'Rejeitado' && (
              <div className="w-full text-center text-red-600 text-sm font-medium p-2 bg-red-50 rounded border border-red-200">
                Pedido Rejeitado
              </div>
            )}
            {selectedRequest?.status === 'Entregue' && (
              <div className="w-full text-center text-slate-600 text-sm font-medium p-2 bg-slate-50 rounded border">
                Pedido Entregue
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
