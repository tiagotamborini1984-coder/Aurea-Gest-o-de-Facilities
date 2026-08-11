import { useEffect } from 'react'
import { Sparkles, Loader2, Lock, CheckCircle2, AlertTriangle, CalendarDays } from 'lucide-react'
import { useForecastAgent } from '@/hooks/use-forecast-agent'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ForecastStudySection } from '@/components/gestao-budget/ForecastStudySection'
import { cn } from '@/lib/utils'
import {
  getAgriculturalYearStart,
  getAgriculturalYearEnd,
  formatMonthLabel,
} from '@/lib/agricultural-year'

interface ForecastAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string | undefined
  costCenterIds: string[]
  accounts: { id: string; name: string; code: string | null }[]
  costCenters: { id: string; name: string; code: string | null }[]
  selectedMonths: string[]
  isAdmin: boolean
  onApplied: () => void
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

export function ForecastAgentDialog({
  open,
  onOpenChange,
  clientId,
  costCenterIds,
  accounts,
  costCenters,
  selectedMonths,
  isAdmin,
  onApplied,
}: ForecastAgentDialogProps) {
  const {
    loading,
    applying,
    proposals,
    studies,
    reallocations,
    acceptedReallocations,
    upcomingMonths,
    analyze,
    apply,
    toggleReallocation,
  } = useForecastAgent()
  const { toast } = useToast()

  const latestMonth = [...selectedMonths].sort().pop() || new Date().toISOString().substring(0, 7)
  const safraStart = getAgriculturalYearStart(latestMonth)
  const safraEnd = getAgriculturalYearEnd(latestMonth)

  useEffect(() => {
    if (open && clientId && costCenterIds.length > 0 && accounts.length > 0) {
      analyze(clientId, costCenterIds, accounts, costCenters, selectedMonths)
    }
  }, [open, clientId, costCenterIds, accounts, costCenters, selectedMonths, analyze])

  const handleApply = async () => {
    if (!clientId || !isAdmin) return
    const { error } = await apply(clientId)
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao aplicar previsão',
        description: error.message,
      })
    } else {
      toast({
        title: 'Previsão aplicada com sucesso',
        className: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      })
      onApplied()
      onOpenChange(false)
    }
  }

  const totalRemaining = proposals.reduce((s, p) => s + p.remaining, 0)
  const totalBudgeted = proposals.reduce((s, p) => s + p.total_budgeted, 0)
  const totalRealized = proposals.reduce((s, p) => s + p.total_realized, 0)
  const numMonths = upcomingMonths.length || proposals[0]?.upcoming_months.length || 1
  const totalForecast = proposals.reduce((s, p) => s + p.monthly_forecast * numMonths, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-brand-vividBlue" />
            Agente de Previsão — Ano Safra
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Análise no horizonte do ano safra: <strong>{formatMonthLabel(safraStart)}</strong> a{' '}
            <strong>{formatMonthLabel(safraEnd)}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-brand-vividBlue" />
          </div>
        ) : !loading && upcomingMonths.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p>O ano safra termina em março. Não há meses futuros para gerar previsão.</p>
          </div>
        ) : proposals.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p>Nenhuma análise disponível. Selecione centro de custo e contas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <ForecastStudySection
              studies={studies}
              reallocations={reallocations}
              acceptedReallocations={acceptedReallocations}
              onToggleReallocation={toggleReallocation}
              isAdmin={isAdmin}
            />

            <div>
              <h3 className="text-base font-bold text-foreground mb-2">Previsão Detalhada</h3>
              <ScrollArea className="max-h-[300px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead className="font-bold">Centro de Custo / Conta</TableHead>
                      <TableHead className="text-right font-bold">Orçado</TableHead>
                      <TableHead className="text-right font-bold">Realizado</TableHead>
                      <TableHead className="text-right font-bold">Saldo</TableHead>
                      {upcomingMonths.map((m) => (
                        <TableHead key={m} className="text-right font-bold">
                          {formatMonthLabel(m)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposals.map((p) => (
                      <TableRow key={`${p.cost_center_id}-${p.account_id}`}>
                        <TableCell className="font-medium">
                          <div className="text-xs text-muted-foreground">{p.cost_center_name}</div>
                          <div>
                            {p.account_code ? `${p.account_code} - ` : ''}
                            {p.account_name}
                          </div>
                          {p.warning && (
                            <div
                              className={cn(
                                'text-xs mt-1',
                                p.has_surplus ? 'text-blue-600' : 'text-amber-600',
                              )}
                            >
                              {p.warning}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(p.total_budgeted)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(p.total_realized)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-mono text-sm font-bold',
                            p.remaining > 0 ? 'text-emerald-600' : 'text-muted-foreground',
                          )}
                        >
                          {formatCurrency(p.remaining)}
                        </TableCell>
                        {upcomingMonths.map((m) => (
                          <TableCell
                            key={m}
                            className="text-right font-mono text-sm text-brand-vividBlue"
                          >
                            {formatCurrency(p.monthly_forecast)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/40 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(totalBudgeted)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(totalRealized)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">
                        {formatCurrency(totalRemaining)}
                      </TableCell>
                      {upcomingMonths.map((m) => (
                        <TableCell key={m} className="text-right font-mono text-brand-vividBlue">
                          {formatCurrency(totalForecast / numMonths)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                A previsão distribui <strong>{formatCurrency(totalRemaining)}</strong> de saldo em{' '}
                {numMonths} meses dentro do ano safra. A soma de realizado + previsão não excede o
                orçado.
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          {!isAdmin && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Apenas administradores podem aplicar a previsão.</span>
            </div>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleApply}
              disabled={
                !isAdmin || applying || proposals.length === 0 || upcomingMonths.length === 0
              }
              className="bg-brand-vividBlue hover:bg-brand-vividBlue/90"
            >
              {applying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Aplicar Previsão
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
