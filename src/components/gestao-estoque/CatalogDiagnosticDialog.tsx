import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Loader2, Stethoscope, Wrench, Eye, EyeOff } from 'lucide-react'
import {
  diagnoseCatalog,
  type DiagnoseCatalogResponse,
  type CatalogDiagnostic,
} from '@/services/catalog-diagnostic'
import { inventoryService } from '@/services/inventory'
import { useAppStore } from '@/store/AppContext'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DiagnosticTable({ diagnostics }: { diagnostics: CatalogDiagnostic[] }) {
  if (diagnostics.length === 0)
    return <p className="text-center text-slate-400 py-8 text-sm">Nenhum diagnóstico encontrado</p>
  return (
    <div className="max-h-80 overflow-auto border rounded-lg">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-50 z-10">
          <tr className="border-b">
            <th className="text-left p-2 font-medium">Nome</th>
            <th className="text-left p-2 font-medium">Categoria</th>
            <th className="text-left p-2 font-medium">Ativo</th>
            <th className="text-left p-2 font-medium">Visibilidade</th>
            <th className="text-left p-2 font-medium">Mensagem</th>
          </tr>
        </thead>
        <tbody>
          {diagnostics.map((p) => (
            <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="p-2 font-medium max-w-48 truncate">{p.name}</td>
              <td className="p-2 text-slate-600">{p.product_category || '—'}</td>
              <td className="p-2">
                <span
                  className={
                    p.is_active ? 'text-green-600 font-medium' : 'text-red-500 font-medium'
                  }
                >
                  {String(p.is_active)}
                </span>
              </td>
              <td className="p-2">
                {p.visibility_status === 'visible' || (p.is_active && !p.diagnostic_message) ? (
                  <Badge variant="outline" className="text-green-600 border-green-300 gap-1">
                    <Eye className="w-3 h-3" /> Visível
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
                    <EyeOff className="w-3 h-3" /> Oculto
                  </Badge>
                )}
              </td>
              <td className="p-2 text-slate-500 max-w-48 text-[11px]">
                {p.diagnostic_message || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CatalogDiagnosticDialog({ open, onOpenChange }: Props) {
  const { activeClient } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [fixed, setFixed] = useState(false)
  const [result, setResult] = useState<DiagnoseCatalogResponse | null>(null)

  const runDiagnostic = async () => {
    if (!activeClient?.id) {
      toast.error('Nenhum cliente ativo selecionado')
      return
    }
    setLoading(true)
    setResult(null)
    setFixed(false)
    try {
      const res = await diagnoseCatalog(activeClient.id)
      setResult(res)
      if (res.success && res.inactiveProducts === 0) {
        toast.success('Todos os produtos estão ativos e visíveis no catálogo!')
      } else if (res.success && res.inactiveProducts > 0) {
        toast.warning(`${res.inactiveProducts} produto(s) inativo(s) no catálogo`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao executar diagnóstico')
    } finally {
      setLoading(false)
    }
  }

  const handleFix = async () => {
    if (!activeClient?.id) return
    setFixing(true)
    try {
      await inventoryService.normalizeClientInventory(activeClient.id)
      toast.success('Correção aplicada com sucesso! Re-executando diagnóstico...')
      setFixed(true)
      const res = await diagnoseCatalog(activeClient.id)
      setResult(res)
      if (res.success && res.inactiveProducts === 0) {
        toast.success('Todos os produtos agora estão visíveis no catálogo!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aplicar correção')
    } finally {
      setFixing(false)
    }
  }

  const hasIssues = result
    ? result.inactiveProducts > 0 || result.diagnostics.some((d) => d.diagnostic_message)
    : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Diagnóstico de Visibilidade do Catálogo
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500 mb-4">
              Analisa todos os produtos do catálogo, identificando produtos inativos, problemas de
              visibilidade e sugestões de correção.
            </p>
            <Button onClick={runDiagnostic} disabled={loading || !activeClient?.id}>
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
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Total no Banco</p>
                <p className="text-2xl font-bold text-slate-800">{result.totalProducts}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-xs text-green-600 mb-1">Ativos</p>
                <p className="text-2xl font-bold text-green-700">{result.activeProducts}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-xs text-amber-600 mb-1">Inativos</p>
                <p className="text-2xl font-bold text-amber-700">{result.inactiveProducts}</p>
              </div>
            </div>

            {!hasIssues ? (
              <div className="flex items-center justify-between gap-2 text-green-600 bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    Todos os {result.totalProducts} produtos estão ativos e visíveis no catálogo!
                  </span>
                </div>
                {fixed && (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Corrigido
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 text-amber-600 bg-amber-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium">
                    {result.inactiveProducts} produto(s) inativo(s) ou com problemas de
                    visibilidade.
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFix}
                  disabled={fixing || !activeClient?.id}
                  className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  {fixing ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Wrench className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {fixing ? 'Corrigindo...' : 'Corrigir Agora'}
                </Button>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-500 mb-2">
                Diagnóstico Detalhado ({result.diagnostics.length} produto(s))
              </p>
              <DiagnosticTable diagnostics={result.diagnostics} />
            </div>
          </div>
        )}

        <DialogFooter>
          {result && (
            <Button
              variant="outline"
              onClick={() => {
                setResult(null)
                setFixed(false)
              }}
            >
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
