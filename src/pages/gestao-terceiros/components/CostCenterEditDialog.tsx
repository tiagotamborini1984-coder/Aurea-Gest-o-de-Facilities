import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { maskCostCenterPagador, isValidCostCenterPagador } from './cost-center-mask'
import type { SolicitacaoHe } from './HorasExtrasTable'

interface CostCenterEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Solicitação alvo da correção (pode estar Pendente, Aprovada ou Recusada) */
  solicitacao: SolicitacaoHe | null
  onConfirm: (solicitacao: SolicitacaoHe, costCenterText: string) => Promise<void>
}

/**
 * Correção pontual do Centro de Custo pagador em solicitações de HE já existentes
 * (inclusive aprovadas). Atualiza SOMENTE o cost_center_text — nenhum outro campo
 * da solicitação é alterado e nenhum e-mail é disparado.
 */
export function CostCenterEditDialog({
  open,
  onOpenChange,
  solicitacao,
  onConfirm,
}: CostCenterEditDialogProps) {
  const [costCenterText, setCostCenterText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setCostCenterText((solicitacao?.cost_center_text || '').toUpperCase())
  }, [open, solicitacao])

  const isInvalid =
    costCenterText.trim().length > 0 && !isValidCostCenterPagador(costCenterText.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!solicitacao) return

    const normalized = costCenterText.trim().toUpperCase()
    if (!normalized) {
      toast.error('O Centro de Custo pagador é obrigatório. Digite o centro de custo.')
      return
    }
    if (!isValidCostCenterPagador(normalized)) {
      toast.error(
        'Centro de Custo pagador inválido. Use o formato 1111aaa: 4 números seguidos de 3 letras.',
      )
      return
    }

    setIsSaving(true)
    try {
      await onConfirm(solicitacao, normalized)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Wallet className="h-5 w-5 text-brand-vividBlue" />
              Corrigir Centro de Custo da HE
            </DialogTitle>
            <DialogDescription>
              Preencha ou corrija o Centro de Custo pagador desta solicitação. Somente este dado é
              alterado — status, valores e histórico permanecem intactos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-xs space-y-1 text-slate-700">
              <div>
                <strong>Colaborador:</strong> {solicitacao?.employee_name || '—'}
              </div>
              <div>
                <strong>Empresa:</strong> {solicitacao?.company_name || '—'}
              </div>
              <div>
                <strong>Data / Horas:</strong>{' '}
                {solicitacao?.date ? solicitacao.date.split('-').reverse().join('/') : '—'} (
                {Number(solicitacao?.hours ?? 0).toFixed(2)}h)
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="heCostCenterFix" className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-brand-vividBlue" />
                <span>
                  Centro de Custo pagador <span className="text-rose-600">*</span>
                </span>
              </Label>
              <Input
                id="heCostCenterFix"
                type="text"
                inputMode="text"
                maxLength={7}
                placeholder="1111aaa"
                value={costCenterText}
                onChange={(e) => setCostCenterText(maskCostCenterPagador(e.target.value))}
                autoComplete="off"
                required
                aria-invalid={isInvalid}
                className={isInvalid ? 'border-rose-400 focus-visible:ring-rose-300' : ''}
              />
              {isInvalid ? (
                <p className="text-[11px] text-rose-600">
                  Formato inválido: use 4 números seguidos de 3 letras (ex.: 1234abc).
                </p>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Formato: <strong>1111aaa</strong> (4 números + 3 letras). Letras minúsculas são
                  convertidas para maiúsculas automaticamente.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white"
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar Centro de Custo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
