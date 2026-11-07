import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Trash2,
  Wallet,
  Pencil,
  MailCheck,
  MailWarning,
} from 'lucide-react'
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
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getCostCenterLabel } from './DecisaoHeDialog'

export interface SolicitacaoHe {
  id: string
  client_id: string
  employee_id: string
  employee_name: string
  company_id: string | null
  company_name: string
  company_email?: string | null
  plant_id: string
  date: string
  hours: number
  cost_center_id?: string | null
  cost_center_text?: string | null
  budget_cost_centers?: {
    id: string
    name: string
    code: string | null
  } | null
  reason: string | null
  status: 'pendente' | 'aprovada' | 'recusada'
  created_by: string | null
  created_by_name: string | null
  approved_by: string | null
  approved_by_name: string | null
  approved_at: string | null
  manager_observation: string | null
  email_sent_at?: string | null
  email_error?: string | null
  created_at: string
  updated_at: string
  plants?: {
    id: string
    name: string
    code: string
  }
}

interface HorasExtrasTableProps {
  solicitacoes: SolicitacaoHe[]
  loading: boolean
  canManage: boolean
  canEdit: (solicitacao: SolicitacaoHe) => boolean
  onEdit: (solicitacao: SolicitacaoHe) => void
  onApprove: (solicitacao: SolicitacaoHe) => void
  onReject: (solicitacao: SolicitacaoHe) => void
  onDelete?: (solicitacao: SolicitacaoHe) => void
}

export function HorasExtrasTable({
  solicitacoes,
  loading,
  canManage,
  canEdit,
  onEdit,
  onApprove,
  onReject,
  onDelete,
}: HorasExtrasTableProps) {
  const [itemToDelete, setItemToDelete] = useState<SolicitacaoHe | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(itemToDelete)
      setItemToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovada':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3 w-3" />
            Aprovada
          </Badge>
        )
      case 'recusada':
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1 w-fit"
          >
            <XCircle className="h-3 w-3" />
            Recusada
          </Badge>
        )
      case 'pendente':
      default:
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 w-fit"
          >
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Solicitações Registradas ({solicitacoes.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador Terceiro</TableHead>
              <TableHead>Empresa Parceira</TableHead>
              <TableHead>Planta</TableHead>
              <TableHead>Data da HE</TableHead>
              <TableHead className="text-right">Qtd. Horas</TableHead>
              <TableHead>Centro de Custo pagador</TableHead>
              <TableHead>Motivo / Justificativa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Gestor / Histórico</TableHead>
              {(canManage || solicitacoes.some((s) => canEdit(s))) && (
                <TableHead className="text-right">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 10 : 9}
                  className="text-center py-10 text-slate-500"
                >
                  Carregando solicitações de horas extras...
                </TableCell>
              </TableRow>
            ) : solicitacoes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 10 : 9}
                  className="text-center py-10 text-slate-500"
                >
                  Nenhuma solicitação de horas extras encontrada com os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              solicitacoes.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/70">
                  <TableCell className="font-medium text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span>{item.employee_name}</span>
                      {canEdit(item) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:text-brand-vividBlue hover:bg-brand-vividBlue/10 h-7 w-7 p-0"
                          title="Editar solicitação de HE (apenas enquanto Pendente)"
                          aria-label={`Editar solicitação de HE de ${item.employee_name}`}
                          onClick={() => onEdit(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Editar Solicitação</span>
                        </Button>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Solicitado por: {item.created_by_name || 'Usuário'}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-700 text-sm">{item.company_name}</TableCell>
                  <TableCell className="text-slate-700 text-sm">
                    {item.plants?.name || '—'}
                  </TableCell>
                  <TableCell className="text-slate-700 text-sm">
                    {format(new Date(item.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-900">
                    {Number(item.hours).toFixed(2)}h
                  </TableCell>
                  <TableCell className="text-slate-700 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[160px]" title={getCostCenterLabel(item)}>
                        {getCostCenterLabel(item) || (
                          <span className="text-slate-400 italic">Não informado</span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    className="max-w-[240px] truncate text-slate-600 text-xs"
                    title={item.reason || ''}
                  >
                    {item.reason || <span className="text-slate-400 italic">Sem observação</span>}
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {item.status === 'pendente' && (
                      <span className="text-amber-600 italic">Aguardando aprovação</span>
                    )}
                    {item.status !== 'pendente' && (
                      <div>
                        <div className="font-medium text-slate-700">
                          {item.approved_by_name || 'Administrador'}
                        </div>
                        {item.approved_at && (
                          <div className="text-[11px] text-slate-400">
                            {format(new Date(item.approved_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                        )}
                        {item.manager_observation && (
                          <div
                            className="text-[11px] text-rose-600 italic mt-0.5 truncate max-w-[180px]"
                            title={item.manager_observation}
                          >
                            Obs: {item.manager_observation}
                          </div>
                        )}
                        {item.status === 'aprovada' && item.email_sent_at && (
                          <div
                            className="text-[11px] text-emerald-600 flex items-center gap-1 mt-0.5"
                            title={`E-mail enviado à empresa em ${format(
                              new Date(item.email_sent_at),
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR },
                            )}`}
                          >
                            <MailCheck className="h-3 w-3" /> E-mail enviado à empresa
                          </div>
                        )}
                        {item.status === 'aprovada' && !item.email_sent_at && item.email_error && (
                          <div
                            className="text-[11px] text-amber-600 italic flex items-center gap-1 mt-0.5"
                            title={item.email_error}
                          >
                            <MailWarning className="h-3 w-3" /> E-mail não enviado
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.status === 'pendente' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5 text-xs"
                              onClick={() => onApprove(item)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200 h-8 px-2.5 text-xs"
                              onClick={() => onReject(item)}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Recusar
                            </Button>
                          </>
                        )}
                        {onDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0"
                            title="Excluir solicitação de HE (Administrador)"
                            onClick={() => setItemToDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir Solicitação</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Confirmação de Exclusão (Apenas Administrador) */}
      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setItemToDelete(null)
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-600" />
              Excluir Solicitação de Horas Extras?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 space-y-2">
              <p>
                Tem certeza de que deseja excluir definitivamente a solicitação de horas extras de{' '}
                <strong className="text-slate-900">{itemToDelete?.employee_name}</strong> (
                {itemToDelete?.hours}h em{' '}
                {itemToDelete?.date ? itemToDelete.date.split('-').reverse().join('/') : ''})?
              </p>
              <p className="text-xs text-rose-600 font-medium">
                Esta ação é irreversível e remove o registro do banco de dados.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmDelete()
              }}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir Solicitação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
