import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '@/store/AppContext'
import { inventoryService } from '@/services/inventory'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Undo2, Download, Loader2, PackagePlus, PackageCheck } from 'lucide-react'
import { toast } from 'sonner'
import { exportToXlsx } from '@/lib/export-xlsx'

export default function HistoricoImportacoes() {
  const { activeClient, profile } = useAppStore()
  const clientId = activeClient?.id || profile?.client_id

  const [logs, setLogs] = useState<any[]>([])
  const [productNames, setProductNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [undoTarget, setUndoTarget] = useState<any | null>(null)
  const [undoing, setUndoing] = useState(false)

  const loadData = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const data = await inventoryService.getImportLogs(clientId)
      setLogs(data)

      const allIds = data.flatMap((log: any) => [
        ...(log.inserted_products || []),
        ...(log.updated_products || []).map((u: any) => u.product_id),
      ])
      if (allIds.length > 0) {
        const names = await inventoryService.getProductNamesByIds(allIds)
        setProductNames(names)
      } else {
        setProductNames({})
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar histórico')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleUndo = async () => {
    if (!undoTarget) return
    setUndoing(true)
    try {
      const result = await inventoryService.undoImport(undoTarget.id)
      toast.success(
        `Importação desfeita: ${result.deletedCount} produto(s) removido(s) e ${result.restoredCount} produto(s) restaurado(s).`,
      )
      setUndoTarget(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao desfazer importação')
    } finally {
      setUndoing(false)
    }
  }

  const downloadTemplate = () => {
    const headers = [
      'name',
      'description',
      'category',
      'unit_of_measure',
      'item_value',
      'fs_code',
      'supply_code',
      'sds_url',
      'image_url',
    ]
    const exampleRow = [
      'Detergente Multiuso',
      'Detergente neutro para limpeza geral',
      'Limpeza',
      'UN',
      '15.50',
      'FS-001',
      'SUP-001',
      '',
      '',
    ]
    exportToXlsx('template_produtos.xlsx', 'Produtos', headers, [exampleRow])
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getProductNamesForLog = (log: any): string[] => {
    const insertedIds: string[] = log.inserted_products || []
    const updatedIds: string[] = (log.updated_products || []).map((u: any) => u.product_id)
    return [...insertedIds, ...updatedIds].map((id) => productNames[id]).filter(Boolean)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/gestao-estoque/produtos">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Histórico de Importações</h1>
            <p className="text-slate-500">Revise e desfaça importações de produtos</p>
          </div>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-2" />
          Baixar Template Excel
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="text-lg font-medium">Nenhuma importação registrada</p>
              <p className="text-sm mt-1">
                As importações realizadas aparecerão aqui com opção de desfazer.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Inseridos</TableHead>
                  <TableHead>Atualizados</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Produtos Afetados</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const insertedCount = (log.inserted_products || []).length
                  const updatedCount = (log.updated_products || []).length
                  const names = getProductNamesForLog(log)
                  const displayName = log.creator?.name || '—'
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.total_products}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm text-green-700">
                          <PackagePlus className="w-3.5 h-3.5" />
                          {insertedCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm text-blue-700">
                          <PackageCheck className="w-3.5 h-3.5" />
                          {updatedCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{displayName}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {names.slice(0, 3).map((name, i) => (
                            <Badge key={i} variant="outline" className="text-xs font-normal">
                              {name}
                            </Badge>
                          ))}
                          {names.length > 3 && (
                            <Badge variant="outline" className="text-xs font-normal text-slate-500">
                              +{names.length - 3}
                            </Badge>
                          )}
                          {names.length === 0 && (
                            <span className="text-xs text-slate-400">Produtos não encontrados</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUndoTarget(log)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <Undo2 className="w-3.5 h-3.5 mr-1" />
                          Desfazer
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!undoTarget} onOpenChange={(open) => !open && setUndoTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer Importação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Tem certeza de que deseja desfazer esta importação?</p>
                <p className="font-medium text-slate-700">
                  Isso removerá{' '}
                  <span className="text-red-600 font-bold">
                    {(undoTarget?.inserted_products || []).length}
                  </span>{' '}
                  produto(s) e restaurará{' '}
                  <span className="text-blue-600 font-bold">
                    {(undoTarget?.updated_products || []).length}
                  </span>{' '}
                  produto(s) ao estado anterior.
                </p>
                <p className="text-xs text-slate-500">
                  Esta ação não pode ser desfeita. A importação será removida do histórico.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={undoing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUndo}
              disabled={undoing}
              className="bg-red-600 hover:bg-red-700"
            >
              {undoing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Desfazendo...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
