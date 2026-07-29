import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Loader2, Stethoscope } from 'lucide-react'
import { runCatalogDiagnostic, type DiagnosticResult } from '@/services/catalog-diagnostic'
import { toast } from 'sonner'

interface CatalogDiagnosticDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CatalogDiagnosticDialog({ open, onOpenChange }: CatalogDiagnosticDialogProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnosticResult | null>(null)

  const runDiagnostic = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await runCatalogDiagnostic()
      setResult(res)
      if (res.success && res.summary.missing_from_catalog === 0) {
        toast.success('Todos os produtos estão visíveis no catálogo!')
      } else if (res.success && res.summary.missing_from_catalog > 0) {
        toast.warning(`${res.summary.missing_from_catalog} produto(s) não visível(is) no catálogo`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao executar diagnóstico')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Diagnóstico de Visibilidade do Catálogo
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500 mb-4">
              Compara todos os produtos no banco de dados com os exibidos no catálogo, identificando
              produtos ocultos e o motivo.
            </p>
            <Button onClick={runDiagnostic} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Stethoscope className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Executando...' : 'Executar Diagnóstico'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">Total no Banco</p>
                <p className="text-2xl font-bold text-slate-800">
                  {result.summary.total_in_database}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">Visíveis (RLS)</p>
                <p className="text-2xl font-bold text-slate-800">
                  {result.summary.visible_with_rls}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-500">No Catálogo</p>
                <p className="text-2xl font-bold text-slate-800">
                  {result.summary.visible_in_catalog}
                </p>
              </div>
            </div>

            {result.summary.missing_from_catalog === 0 ? (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Todos os {result.summary.total_in_database} produtos estão visíveis no catálogo!
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {result.summary.missing_from_catalog} produto(s) oculto(s) no catálogo
                  </span>
                </div>
                <div className="max-h-48 overflow-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Produto</th>
                        <th className="text-left p-2 font-medium">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.missing_from_catalog.map((p) => (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="p-2 font-medium">{p.name}</td>
                          <td className="p-2 text-amber-600">{p.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {result && (
            <Button variant="outline" onClick={() => setResult(null)}>
              Executar Novamente
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
