import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { SolicitacaoHe } from './HorasExtrasTable'

interface DecisaoHeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  solicitacao: SolicitacaoHe | null
  action: 'aprovar' | 'recusar' | null
  onConfirm: (solicitacaoId: string, observacao: string) => Promise<void>
}

export function DecisaoHeDialog({
  open,
  onOpenChange,
  solicitacao,
  action,
  onConfirm,
}: DecisaoHeDialogProps) {
  const [observacao, setObservacao] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isApproval = action === 'aprovar'

  const handleConfirm = async () => {
    if (!solicitacao) return
    setIsSubmitting(true)
    try {
      await onConfirm(solicitacao.id, observacao.trim())
      setObservacao('')
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!solicitacao) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle
            className={`flex items-center gap-2 ${isApproval ? 'text-emerald-700' : 'text-rose-600'}`}
          >
            {isApproval ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            {isApproval
              ? 'Aprovar Solicitação de Horas Extras'
              : 'Recusar Solicitação de Horas Extras'}
          </DialogTitle>
          <DialogDescription>
            {isApproval
              ? 'Confirme a aprovação das horas extras para o colaborador.'
              : 'Informe a recusa da solicitação. A empresa parceira e o solicitante serão notificados do status.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3 text-sm">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
            <div>
              <strong>Colaborador:</strong> {solicitacao.employee_name}
            </div>
            <div>
              <strong>Empresa:</strong> {solicitacao.company_name}
            </div>
            <div>
              <strong>Data / Horas:</strong> {solicitacao.date} (
              {Number(solicitacao.hours).toFixed(2)}h)
            </div>
            {solicitacao.budget_cost_centers?.name && (
              <div>
                <strong>Centro de Custo pagador:</strong> {solicitacao.budget_cost_centers.name}
              </div>
            )}
            {solicitacao.reason && (
              <div className="text-xs text-slate-500 pt-1 border-t mt-1">
                <strong>Motivo informado:</strong> {solicitacao.reason}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obsGestor">
              Observação do Gestor {isApproval ? '(Opcional)' : '(Motivo da recusa)'}
            </Label>
            <Textarea
              id="obsGestor"
              rows={3}
              placeholder={
                isApproval
                  ? 'Ex: Aprovado conforme alinhado em reunião operacional.'
                  : 'Ex: Excedeu o limite mensal de budget da unidade ou falta de autorização prévia.'
              }
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className={
              isApproval
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Processando...'
              : isApproval
                ? 'Confirmar Aprovação'
                : 'Confirmar Recusa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
