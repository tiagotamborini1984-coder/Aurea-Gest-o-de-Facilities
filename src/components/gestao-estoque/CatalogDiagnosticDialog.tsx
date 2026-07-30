import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AlertCircle, CheckCircle2, Loader2, Stethoscope, ShieldAlert, Wrench } from 'lucide-react'
import {
  runCatalogDiagnostic,
  type DiagnosticResult,
  type SimpleProduct,
  type DiagnosticProduct,
} from '@/services/catalog-diagnostic'
import { inventoryService } from '@/services/inventory'
import { useAppStore } from '@/store/AppContext'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ProductTable({
  products,
  missing,
}: {
  products: SimpleProduct[] | DiagnosticProduct[]
  missing?: boolean
}) {
  if (products.length === 0)
    return <p className="text-center text-slate-400 py-8 text-sm">Nenhum produto</p>
  return (
    <div className="max-h-80 overflow-auto border rounded-lg">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-50 z-10">
          <tr className="border-b">
            <th className="text-left p-2 font-medium">Nome</th>
            <th className="text-left p-2 font-medium">Categoria</th>
            <th className="text-left p-2 font-medium">is_active</th>
            <th className="text-left p-2 font-medium">client_id</th>
            {missing && <th className="text-left p-2 font-medium">Campo Suspeito</th>}
            {missing && <th className="text-left p-2 font-medium">Sugestão</th>}
          </tr>
        </thead>
        <tbody>
          {products.map((p: any) => (
            <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="p-2 font-medium max-w-48 truncate">{p.name}</td>
              <td className="p-2 text-slate-600">{p.category || '—'}</td>
              <td className="p-2">
                <span
                  className={
                    p.is_active === false || p.is_active === null
                      ? 'text-red-500 font-medium'
                      : 'text-green-600'
                  }
                >
                  {String(p.is_active)}
                </span>
              </td>
              <td className="p-2 text-slate-500 font-mono text-[10px] max-w-32 truncate">
                {p.client_id ? p.client_id.slice(0, 8) + '...' : 'NULL'}
              </td>
              {missing && <td className="p-2 text-amber-600 font-medium">{p.suspected_field}</td>}
              {missing && (
                <td className="p-2 text-slate-500 max-w-48">{p.correction_suggestion}</td>
              )}
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
  const [result, setResult] = useState<DiagnosticResult | null>(null)

  const runDiagnostic = async () => {
    setLoading(true)
    setResult(null)
    setFixed(false)
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

  const handleFix = async () => {
    if (!activeClient?.id) return
    setFixing(true)
    try {
      await inventoryService.normalizeClientInventory(activeClient.id)
      toast.success('Correção aplicada com sucesso! Re-executando diagnóstico...')
      setFixed(true)
      const res = await runCatalogDiagnostic()
      setResult(res)
      if (res.success && res.summary.missing_from_catalog === 0) {
        toast.success('Todos os produtos agora estão visíveis no catálogo!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aplicar correção')
    } finally {
      setFixing(false)
    }
  }

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
              Compara todos os produtos no banco de dados com os exibidos no catálogo, identificando
              produtos ocultos, o campo suspeito e a sugestão de correção.
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
            <div className="grid grid-cols-5 gap-2">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-slate-500">Total no Banco</p>
                <p className="text-xl font-bold text-slate-800">
                  {result.summary.total_in_database}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-slate-500">Visíveis (RLS)</p>
                <p className="text-xl font-bold text-slate-800">
                  {result.summary.visible_with_rls}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-slate-500">No Catálogo</p>
                <p className="text-xl font-bold text-slate-800">
                  {result.summary.visible_in_catalog}
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-red-500">Bloqueados RLS</p>
                <p className="text-xl font-bold text-red-700">{result.summary.missing_from_rls}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-amber-500">Ausentes Catálogo</p>
                <p className="text-xl font-bold text-amber-700">
                  {result.summary.missing_from_catalog}
                </p>
              </div>
            </div>

            {result.rls_analysis.blocking_count > 0 && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg p-3 border border-red-200">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{result.rls_analysis.suggestion}</span>
              </div>
            )}

            {result.summary.missing_from_catalog === 0 ? (
              <div className="flex items-center justify-between gap-2 text-green-600 bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    Todos os {result.summary.total_in_database} produtos estão visíveis no catálogo!
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
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {result.summary.missing_from_catalog} produto(s) oculto(s) no catálogo.
                    Verifique a aba "Produtos Ausentes".
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

            <Tabs defaultValue="missing">
              <TabsList className="w-full">
                <TabsTrigger value="bank" className="flex-1">
                  Banco ({result.all_products.length})
                </TabsTrigger>
                <TabsTrigger value="visible" className="flex-1">
                  Visíveis ({result.visible_products.length})
                </TabsTrigger>
                <TabsTrigger value="missing" className="flex-1">
                  Ausentes ({result.missing_from_catalog.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="bank" className="mt-3">
                <p className="text-xs text-slate-500 mb-2">
                  Produtos no Banco (Total: {result.all_products.length})
                </p>
                <ProductTable products={result.all_products} />
              </TabsContent>
              <TabsContent value="visible" className="mt-3">
                <p className="text-xs text-slate-500 mb-2">
                  Produtos Visíveis no Catálogo (Total: {result.visible_products.length})
                </p>
                <ProductTable products={result.visible_products} />
              </TabsContent>
              <TabsContent value="missing" className="mt-3">
                <p className="text-xs text-slate-500 mb-2">
                  Produtos Ausentes (Total: {result.missing_from_catalog.length})
                </p>
                <ProductTable products={result.missing_from_catalog} missing />
              </TabsContent>
            </Tabs>
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
